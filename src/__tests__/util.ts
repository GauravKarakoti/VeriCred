/** Create a Bytes<32> value filled with a single repeated byte (for tests). */
export function bytes32(seed: number): Uint8Array {
  const out = new Uint8Array(32);
  const b = seed & 0xff;
  for (let i = 0; i < 32; i++) out[i] = b;
  return out;
}