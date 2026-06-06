import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar.jsx';
import Header from './components/Header.jsx';

const Dashboard     = lazy(() => import('./pages/Dashboard.jsx'));
const AgentChat     = lazy(() => import('./pages/AgentChat.jsx'));
const MLLab         = lazy(() => import('./pages/MLLab.jsx'));
const Operator      = lazy(() => import('./pages/Operator.jsx'));
const Systems       = lazy(() => import('./pages/Systems.jsx'));
const RuleFactory   = lazy(() => import('./pages/RuleFactory.jsx'));
const Network       = lazy(() => import('./pages/Network.jsx'));
const SARWriter     = lazy(() => import('./pages/SARWriter.jsx'));
const FraudSensePage  = lazy(() => import('./pages/FraudSense.jsx'));
const RuleBreakerPage = lazy(() => import('./pages/RuleBreaker.jsx'));
const XAILab          = lazy(() => import('./pages/XAILab.jsx'));

function PageLoader() {
  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <div style={{ width: 20, height: 20, border: '2px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
    </div>
  );
}

export default function App() {
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg-base)' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        <Header />
        <main style={{ flex: 1, overflow: 'hidden' }}>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/"            element={<Dashboard />} />
              <Route path="/org"         element={<AgentChat />} />
              <Route path="/ml"          element={<MLLab />} />
              <Route path="/operator"    element={<Operator />} />
              <Route path="/systems"     element={<Systems />} />
              <Route path="/rules"       element={<RuleFactory />} />
              <Route path="/network"     element={<Network />} />
              <Route path="/sar"         element={<SARWriter />} />
              <Route path="/fraudsense"  element={<FraudSensePage />} />
              <Route path="/rulebreaker" element={<RuleBreakerPage />} />
              <Route path="/xai"        element={<XAILab />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </div>
  );
}
