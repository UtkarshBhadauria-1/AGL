import { Component } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home.jsx';
import VotePage from './pages/VotePage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import QRPage from './pages/QRPage.jsx';
import DisplayPage from './pages/DisplayPage.jsx';

class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[App] Unhandled React render error:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <main className="min-h-screen bg-black text-zinc-100 flex items-center justify-center p-6">
          <section className="max-w-lg w-full rounded-2xl border border-rose-500/40 bg-zinc-950 p-8 text-center">
            <h1 className="text-2xl font-bold text-rose-300">This page could not be displayed</h1>
            <p className="mt-3 text-sm text-zinc-400">The app hit an unexpected error. Your vote data remains on the server.</p>
            <button className="mt-6 rounded-xl bg-amber-500 px-5 py-3 font-bold text-black" onClick={() => window.location.reload()}>
              Reload application
            </button>
          </section>
        </main>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <AppErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/vote/:participantId" element={<VotePage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/admin/qr" element={<QRPage />} />
          <Route path="/display" element={<DisplayPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AppErrorBoundary>
  );
}
