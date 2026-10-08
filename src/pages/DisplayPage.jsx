import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Maximize2, Minimize2, Trophy, Users, Clock } from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../services/api.js';

export default function DisplayPage() {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [origin, setOrigin] = useState('');
  const [confettiFired, setConfettiFired] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const configuredAppUrl = (import.meta.env.VITE_APP_URL || '').trim().replace(/\/+$/, '');
      setOrigin(configuredAppUrl || window.location.origin);
    }
  }, []);

  const fetchDisplayResults = async () => {
    try {
      const data = await api.getResults();
      setResults(data);
      setErrorMessage('');
      setLoading(false);

      if (data.status === 'CLOSED' && data.leader && data.leader.votes > 0 && !confettiFired) {
        setConfettiFired(true);
        try {
          confetti({
            particleCount: 120,
            spread: 90,
            origin: { y: 0.5 },
            colors: ['#f59e0b', '#fbbf24', '#ffffff', '#10b981', '#3b82f6'],
          });
        } catch {
          // ignore
        }
      } else if (data.status === 'LIVE' || data.status === 'WAITING') {
        setConfettiFired(false);
      }
    } catch (err) {
      console.error('Failed to poll display results:', err);
      setErrorMessage(err.message || 'Unable to connect to voting server.');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDisplayResults();
    const interval = setInterval(fetchDisplayResults, 1500);
    return () => clearInterval(interval);
  }, [confettiFired]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key && e.key.toLowerCase() === 'f') {
        toggleFullscreen();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const status = results?.status || 'WAITING';
  const participants = results?.participants || [];
  const totalVotes = results?.totalVotes || 0;
  const leader = results?.leader;

  // Compute adaptive QR size based on count
  const qrSize = participants.length <= 2 ? 280 : participants.length === 3 ? 240 : 210;

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col justify-between overflow-x-hidden selection:bg-amber-500 selection:text-black">
      {/* Discreet Projector Bar / Fullscreen Toggle */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-zinc-900 bg-zinc-950/60">
        <div className="flex items-center gap-3">
          <span className="text-sm font-extrabold font-heading tracking-wider text-zinc-300 uppercase">ABES GOES LATENT</span>
          <span className="text-zinc-600">·</span>
          <span className="text-xs font-mono text-zinc-400 uppercase tracking-widest">
            Auditorium Projector
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg bg-zinc-900 text-zinc-400 hover:text-amber-400 hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Toggle Fullscreen (F)"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Presentation Stage */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 flex flex-col items-center justify-center text-center">
        {loading ? (
          <div className="py-20">
            <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="font-mono text-zinc-400">Loading auditorium display...</p>
          </div>
        ) : errorMessage && !results ? (
          <div className="max-w-xl rounded-2xl border border-rose-500/40 bg-rose-950/30 p-8">
            <h1 className="text-2xl font-bold text-rose-200">Display unavailable</h1>
            <p className="mt-3 text-zinc-300">{errorMessage}</p>
            <button onClick={fetchDisplayResults} className="mt-5 rounded-lg bg-zinc-800 px-4 py-2 font-bold">Retry</button>
          </div>
        ) : status === 'LIVE' ? (
          /* ============================================================ */
          /* LIVE VOTING STATE                                           */
          /* ============================================================ */
          <div className="w-full flex flex-col items-center animate-fade-in">
            {/* Live Badge */}
            <div className="inline-flex items-center gap-2 px-5 py-1.5 rounded-full bg-rose-950/70 border border-rose-500/60 text-rose-400 text-sm font-mono font-bold tracking-wider mb-4 shadow-lg shadow-rose-950/50">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping inline-block" />
              🔴 LIVE VOTING
            </div>

            {/* Event Title */}
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-black font-heading tracking-tight uppercase text-zinc-100">
              ABES GOES <span className="text-amber-400">LATENT</span>
            </h1>

            <h2 className="text-xl sm:text-3xl font-extrabold font-heading text-amber-500 mt-2 uppercase tracking-wide">
              LIVE AUDIENCE VOTING
            </h2>

            <p className="text-base sm:text-2xl text-zinc-300 font-medium max-w-3xl mx-auto mt-3">
              Scan the QR code of the participant you want to support.
            </p>

            {/* Grid of Large QR Codes for Selected Tied Participants */}
            {participants.length === 0 ? (
              <div className="mt-12 p-8 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-400 max-w-md">
                <p className="font-bold text-zinc-200">NO TIE-BREAKER PARTICIPANTS SELECTED</p>
                <p className="text-xs text-zinc-500 mt-2">
                  Select the tied participants in the Admin Panel to display their QR codes here.
                </p>
              </div>
            ) : (
              <div className={`mt-8 sm:mt-10 grid gap-6 sm:gap-8 w-full max-w-6xl justify-center ${
                participants.length === 1
                  ? 'grid-cols-1 max-w-sm'
                  : participants.length === 2
                  ? 'grid-cols-1 sm:grid-cols-2 max-w-3xl'
                  : participants.length === 3
                  ? 'grid-cols-1 sm:grid-cols-3 max-w-5xl'
                  : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 max-w-6xl'
              }`}>
                {participants.map((p) => {
                  const voteUrl = `${origin}/vote/${p.id}`;
                  return (
                    <div
                      key={p.id}
                      className="flex flex-col items-center justify-between p-6 sm:p-8 rounded-3xl bg-zinc-900/95 border-2 border-zinc-800 hover:border-amber-500/50 shadow-2xl transition-all"
                    >
                      {/* Large Crisp QR Code with white margin */}
                      <div className="p-4 sm:p-5 bg-white rounded-2xl shadow-2xl transition-transform hover:scale-105">
                        <QRCodeSVG
                          value={voteUrl}
                          size={qrSize}
                          level="H"
                          includeMargin={true}
                        />
                      </div>

                      {/* Participant Name & ID */}
                      <div className="mt-5 text-center">
                        <h3 className="text-2xl sm:text-3xl font-black font-heading text-zinc-100 uppercase tracking-tight">
                          {p.name}
                        </h3>
                        <div className="mt-1 inline-block px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 font-mono text-sm font-bold tracking-wider">
                          {p.id}
                        </div>
                      </div>

                      <div className="mt-4 flex w-full items-center justify-between border-t border-zinc-800 pt-3 text-sm">
                        <span className="font-mono text-zinc-200"><strong className="text-amber-400">{p.votes}</strong> votes</span>
                        <span className="font-mono text-zinc-300">{p.percentage}%</span>
                      </div>

                      <div className="mt-3 text-xs font-mono text-zinc-500">
                        /vote/{p.id}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Live Vote Counter Bar */}
            <div className="mt-10 px-6 py-2.5 rounded-full bg-zinc-900/70 border border-zinc-800 text-xs sm:text-sm font-mono text-zinc-400 flex items-center gap-4">
              <span className="flex items-center gap-1.5 text-zinc-200">
                <Users className="w-4 h-4 text-amber-400" />
                <span className="font-bold tabular-nums text-zinc-100">{totalVotes}</span> Total Votes Cast
              </span>
              <span>·</span>
              <span>Updates live from auditorium</span>
            </div>
            <div className="mt-5 text-2xl sm:text-3xl font-black tracking-wider">
              {results?.isTie ? <span className="text-rose-400">TIE</span> : leader?.votes > 0 ? <span className="text-amber-400">CURRENT LEADER: {leader.name}</span> : <span className="text-zinc-400">AWAITING FIRST VOTE</span>}
            </div>
          </div>
        ) : status === 'CLOSED' ? (
          /* ============================================================ */
          /* CLOSED / FINAL RESULTS STATE                                */
          /* ============================================================ */
          <div className="w-full flex flex-col items-center animate-fade-in max-w-4xl">
            <div className="inline-flex items-center gap-2 px-5 py-1.5 rounded-full bg-zinc-900 border border-zinc-700 text-zinc-300 text-xs sm:text-sm font-mono font-bold tracking-wider mb-4">
              VOTING CLOSED
            </div>

            <h1 className="text-4xl sm:text-6xl font-black font-heading tracking-tight uppercase text-zinc-100">
              ABES GOES <span className="text-amber-400">LATENT</span>
            </h1>

            <h2 className="text-xl sm:text-2xl font-bold font-heading text-zinc-300 mt-2 uppercase tracking-wide">
              FINAL RESULTS
            </h2>

            {/* Winner Spotlight Card */}
            {leader && leader.votes > 0 ? (
              <div className="mt-8 w-full p-8 rounded-3xl bg-gradient-to-b from-amber-950/40 via-zinc-900/90 to-zinc-950 border-2 border-amber-500/60 shadow-2xl text-center relative overflow-hidden">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-3">
                  <Trophy className="w-9 h-9" />
                </div>

                <span className="text-xs font-mono font-bold uppercase tracking-widest text-amber-400 block mb-1">
                  {results?.isTie ? 'TIE' : 'Tie-Breaker Winner'}
                </span>

                <h3 className="text-4xl sm:text-5xl font-black font-heading text-zinc-100 uppercase">
                  {leader.name}
                </h3>

                <div className="mt-3 inline-flex items-center gap-2 text-xl font-mono text-zinc-300">
                  <span className="text-3xl sm:text-4xl font-extrabold text-amber-400 tabular-nums">
                    {leader.votes}
                  </span>
                  <span className="text-sm text-zinc-400">Audience Votes</span>
                </div>
              </div>
            ) : (
              <div className="mt-8 p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800 text-zinc-400">
                NO VOTES YET
              </div>
            )}

            {/* Final Leaderboard Breakdown */}
            <div className="mt-8 w-full grid grid-cols-1 sm:grid-cols-3 gap-4">
              {participants.map((p, idx) => (
                <div
                  key={p.id}
                  className={`p-5 rounded-2xl border text-left ${
                    idx === 0 && p.votes > 0
                      ? 'bg-zinc-900/90 border-amber-500/50'
                      : 'bg-zinc-950/60 border-zinc-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-zinc-500">
                      Rank #{idx + 1}
                    </span>
                    <span className="text-xs font-mono text-amber-400 font-bold">
                      {p.id}
                    </span>
                  </div>

                  <h4 className="text-lg font-bold text-zinc-100 mt-1 truncate">
                    {p.name}
                  </h4>

                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-2xl font-extrabold font-mono text-zinc-100 tabular-nums">
                      {p.votes}
                    </span>
                    <span className="text-xs font-mono text-zinc-400">
                      {p.percentage}%
                    </span>
                  </div>

                  <div className="mt-2 w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        idx === 0 && p.votes > 0 ? 'bg-amber-400' : 'bg-zinc-500'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(0, p.percentage))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 text-xs font-mono text-zinc-500">
              Total Audience Votes: <span className="text-zinc-200 font-bold">{totalVotes}</span>
            </div>
          </div>
        ) : (
          /* ============================================================ */
          /* WAITING STATE                                               */
          /* ============================================================ */
          <div className="w-full flex flex-col items-center animate-fade-in max-w-2xl">
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-black font-heading tracking-tight uppercase text-zinc-100">
              ABES GOES <span className="text-amber-400">LATENT</span>
            </h1>

            <div className="mt-8 p-8 sm:p-12 rounded-3xl bg-zinc-900/60 border border-zinc-800 shadow-2xl w-full">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-4">
                <Clock className="w-7 h-7 animate-pulse" />
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold font-heading text-zinc-100">
                WAITING FOR VOTING TO START
              </h3>
              <p className="text-sm text-zinc-400 mt-3">
                Keep your phone cameras ready to scan the QR codes when announced on this screen.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Auditorium Projector Footer */}
      <footer className="px-6 py-4 border-t border-zinc-900 text-center text-xs font-mono text-zinc-500 flex items-center justify-between">
        <span>ABES GOES LATENT · AUDIENCE VOTING</span>
        <span className="hidden sm:inline">Press [F] for Fullscreen</span>
        <span>ABES EC</span>
      </footer>
    </div>
  );
}
