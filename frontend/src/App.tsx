import { Navigate, Route, Routes } from 'react-router-dom';
import { WalletProvider } from './hooks/useWallet';
import { ContractProvider } from './hooks/useContract';
import Layout from './components/Layout/Layout';
import IssuerDashboard from './components/Issuer/IssuerDashboard';
import WalletView from './components/Holder/WalletView';
import VerifierPortal from './components/Verifier/VerifierPortal';

function App() {
  return <WalletProvider><ContractProvider><Routes>
    <Route element={<Layout />}>
      <Route path="/" element={<Navigate to="/holder" replace />} />
      <Route path="/issuer" element={<IssuerDashboard />} />
      <Route path="/holder" element={<WalletView />} />
      <Route path="/verifier" element={<VerifierPortal />} />
      <Route path="*" element={<Navigate to="/holder" replace />} />
    </Route>
  </Routes></ContractProvider></WalletProvider>;
}

export default App;
