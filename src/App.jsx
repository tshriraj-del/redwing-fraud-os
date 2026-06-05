import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar.jsx';
import Header from './components/Header.jsx';
import Dashboard from './pages/Dashboard.jsx';
import AgentChat from './pages/AgentChat.jsx';
import MLLab from './pages/MLLab.jsx';
import Operator from './pages/Operator.jsx';
import Systems from './pages/Systems.jsx';
import RuleFactory from './pages/RuleFactory.jsx';
import Network from './pages/Network.jsx';

export default function App() {
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg-base)' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        <Header />
        <main style={{ flex: 1, overflow: 'hidden' }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/org" element={<AgentChat />} />
            <Route path="/ml" element={<MLLab />} />
            <Route path="/operator" element={<Operator />} />
            <Route path="/systems" element={<Systems />} />
            <Route path="/rules" element={<RuleFactory />} />
            <Route path="/network" element={<Network />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
