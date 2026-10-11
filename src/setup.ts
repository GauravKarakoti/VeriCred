// Orchestrator for `npm run setup`. Replaces the prior package.json chain
// `docker compose up -d --wait && npm run compile && npm run deploy` so
// we can branch on --network and forward it to deploy.
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { resolveNetwork, setActiveNetwork, parseNetworkFlag } from './network';

function run(cmd: string, args: string[]): void {
  const r = spawnSync(cmd, args, { stdio: 'inherit', shell: false });
  if (r.status !== 0) {
    process.stderr.write(`\nCommand failed: ${cmd} ${args.join(' ')}\n`);
    process.exit(r.status ?? 1);
  }
}

async function main(): Promise<void> {
  const argv = process.argv;
  const flag = parseNetworkFlag(argv);
  if (flag) setActiveNetwork(flag);
  const { network, config } = resolveNetwork({ argv });

  process.stdout.write(`\n→ Setting up vericred on network: ${network}\n\n`);

  // 1. Bring up only the services this network needs.
  run('docker', ['compose', 'up', '-d', '--wait', ...config.composeServices]);

  // 2. Compile the contract (network-agnostic).
  run('npm', ['run', 'compile']);

  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const zkConfigPath = path.resolve(__dirname, '..', 'contracts', 'managed', 'vericred');
  const frontendPublicDir = path.resolve(__dirname, '..', 'frontend', 'public');
  const frontendPublicKeysDir = path.join(frontendPublicDir, 'keys');
  const frontendPublicZkirDir = path.join(frontendPublicDir, 'zkir');

  // Ensure target directories exist before writing
  if (!fs.existsSync(frontendPublicKeysDir)) {
    fs.mkdirSync(frontendPublicKeysDir, { recursive: true });
  }
  if (!fs.existsSync(frontendPublicZkirDir)) {
    fs.mkdirSync(frontendPublicZkirDir, { recursive: true });
  }

  process.stdout.write('→ Copying ZK artifacts to frontend public directory...\n');
  
  // Copy zkir files
  const zkirSourceDir = path.join(zkConfigPath, 'zkir');
  if (fs.existsSync(zkirSourceDir)) {
    const files = fs.readdirSync(zkirSourceDir);
    for (const file of files) {
      const srcFile = path.join(zkirSourceDir, file);
      if (fs.lstatSync(srcFile).isFile()) {
        const destFile = path.join(frontendPublicZkirDir, file);
        fs.copyFileSync(srcFile, destFile);
        process.stdout.write(`  Copied: ${file} -> frontend/public/zkir/\n`);
      }
    }
  }

  // Copy keys (.prover, .verifier, .pk, .vk)
  const keysSourceDir = path.join(zkConfigPath, 'keys');
  if (fs.existsSync(keysSourceDir)) {
    const files = fs.readdirSync(keysSourceDir);
    for (const file of files) {
      const srcFile = path.join(keysSourceDir, file);
      if (fs.lstatSync(srcFile).isFile()) {
        // Copy standard file
        const destFile = path.join(frontendPublicKeysDir, file);
        fs.copyFileSync(srcFile, destFile);
        process.stdout.write(`  Copied: ${file} -> frontend/public/keys/\n`);

        // Map modern extensions to legacy SDK extensions (.pk / .vk)
        if (file.endsWith('.prover')) {
          const pkDest = path.join(frontendPublicKeysDir, file.replace(/\.prover$/, '.pk'));
          fs.copyFileSync(srcFile, pkDest);
        } else if (file.endsWith('.verifier')) {
          const vkDest = path.join(frontendPublicKeysDir, file.replace(/\.verifier$/, '.vk'));
          fs.copyFileSync(srcFile, vkDest);
        }
      }
    }
  }
  process.stdout.write('\n');

  // 4. Deploy. Forward --network so deploy.ts sees the same network.
  const deployArgs = network === 'undeployed' ? [] : ['--', '--network', network];
  run('npm', ['run', 'deploy', ...deployArgs]);
}

main().catch((e) => {
  process.stderr.write(`\nSetup failed: ${(e as Error).message}\n`);
  process.exit(1);
});