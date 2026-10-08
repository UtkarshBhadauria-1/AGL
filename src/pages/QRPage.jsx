import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Printer, ArrowLeft, RefreshCw, Loader2 } from 'lucide-react';
import Header from '../components/Header.jsx';
import QRCodeCard from '../components/QRCodeCard.jsx';
import { api } from '../services/api.js';

export default function QRPage() {
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [origin, setOrigin] = useState('');
  const [activePrintId, setActivePrintId] = useState(null);

  const fetchParticipants = async () => {
    try {
      setLoading(true);
      const data = await api.getParticipants();
      setParticipants(data);
      setLoadError('');
    } catch (err) {
      console.error('Failed to load participants for QR page:', err);
      setLoadError(err.message || 'Unable to connect to voting server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const configuredAppUrl = (import.meta.env.VITE_APP_URL || '').trim().replace(/\/+$/, '');
      setOrigin(configuredAppUrl || window.location.origin);
    }
    fetchParticipants();
  }, []);

  // Print all QR codes
  const handlePrintAll = () => {
    setActivePrintId(null);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  // Print single QR code
  const handlePrintSingle = (id) => {
    setActivePrintId(id);
    setTimeout(() => {
      window.print();
      setActivePrintId(null);
    }, 100);
  };

  return (
    <div className={`min-h-screen bg-black text-zinc-100 flex flex-col font-sans ${activePrintId ? 'print-single-mode' : ''}`}>
      <div className="no-print">
        <Header />
      </div>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">
        {/* Top Header & Actions (hidden in print) */}
        <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link
                to="/admin"
                className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-amber-400 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Admin Panel</span>
              </Link>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-zinc-100 uppercase tracking-tight">
              PARTICIPANT QR CODES
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
              Dynamic scan-to-vote QR codes for registered participants
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchParticipants}
              className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
              title="Refresh Participants"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <button
              onClick={handlePrintAll}
              disabled={participants.length === 0}
              className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold font-heading uppercase tracking-wider bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-950 flex items-center gap-2 shadow-lg shadow-amber-500/10 active:scale-95 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>PRINT ALL QR CODES</span>
            </button>
          </div>
        </div>

        {/* Print Header (Visible only when printing) */}
        <div className="hidden print:block text-center mb-8 pb-4 border-b-2 border-black">
          <h1 className="text-3xl font-black uppercase tracking-tight text-black font-heading">
            ABES GOES LATENT · LIVE TIE-BREAKER
          </h1>
          <p className="text-sm text-gray-700 mt-1 font-bold">
            Scan the QR code below using your mobile phone camera to cast your vote
          </p>
        </div>

        {/* QR Code Cards Grid */}
        {loading ? (
          <div className="py-24 text-center">
            <Loader2 className="w-8 h-8 text-amber-500 animate-spin mx-auto mb-3" />
            <p className="text-xs font-mono text-zinc-400">Loading QR codes...</p>
          </div>
        ) : loadError ? (
          <div role="alert" className="mt-16 max-w-lg mx-auto rounded-2xl border border-rose-500/40 bg-rose-950/30 p-8 text-center">
            <p className="text-rose-200">{loadError}</p>
            <button type="button" onClick={fetchParticipants} className="mt-5 rounded-lg bg-zinc-800 px-4 py-2 text-sm font-bold">Retry</button>
          </div>
        ) : participants.length === 0 ? (
          <div className="mt-16 text-center py-12 p-8 rounded-2xl bg-zinc-900/40 border border-zinc-800 max-w-md mx-auto">
            <p className="text-sm font-bold font-heading text-zinc-200 uppercase">
              NO PARTICIPANTS YET
            </p>
            <p className="text-xs text-zinc-500 mt-2 font-mono">
              Add participants from the Admin Panel to generate their QR codes.
            </p>
            <Link
              to="/admin"
              className="mt-5 inline-block px-5 py-2 rounded-xl bg-amber-500 text-zinc-950 text-xs font-bold uppercase tracking-wider hover:bg-amber-400 transition-colors"
            >
              Go to Admin Panel
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 print:grid-cols-2 print:gap-8">
            {participants.map((p) => {
              const fullUrl = `${origin}/vote/${p.id}`;
              const isTargetCard = activePrintId === p.id;

              return (
                <div
                  key={p.id}
                  className={`print-card ${isTargetCard ? 'print-active-card' : ''} ${!activePrintId ? 'print-page' : ''}`}
                >
                  <QRCodeCard
                    id={p.id}
                    name={p.name}
                    fullVoteUrl={fullUrl}
                    size={220}
                    onPrintSingle={handlePrintSingle}
                  />
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
