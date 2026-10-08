import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import Header from '../components/Header.jsx';
import VoteButton from '../components/VoteButton.jsx';
import { api } from '../services/api.js';

export default function VotePage() {
  const { participantId = '' } = useParams();
  const normalizedId = participantId.trim().toUpperCase();

  const [participant, setParticipant] = useState(null);
  const [status, setStatus] = useState('WAITING');
  const [sessionId, setSessionId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [voteSuccess, setVoteSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  // This is accidental-repeat prevention only, not audience authentication.
  useEffect(() => {
    if (!normalizedId || !sessionId) {
      setHasVoted(false);
      return;
    }
    setHasVoted(localStorage.getItem(`voted_${sessionId}_${normalizedId}`) === 'true');
  }, [normalizedId, sessionId]);

  // Fetch participant info and status from backend
  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        setErrorMessage(null);
        const [part, stat] = await Promise.all([
          api.getParticipant(normalizedId),
          api.getStatus(),
        ]);
        if (active) {
          setParticipant(part);
          setStatus(stat.status);
          setSessionId(stat.sessionId || null);
          setLoading(false);
        }
      } catch (err) {
        if (active) {
          setErrorMessage(err.message || 'Participant not found.');
          setLoading(false);
        }
      }
    }

    loadData();

    // Auto-poll status every 1.5 seconds so vote button activates immediately when organizer starts voting
    const pollInterval = setInterval(async () => {
      try {
        const stat = await api.getStatus();
        if (active) {
          setStatus(stat.status);
          setSessionId(stat.sessionId || null);
        }
      } catch {
        // quiet polling error
      }
    }, 1500);

    return () => {
      active = false;
      clearInterval(pollInterval);
    };
  }, [normalizedId]);

  const handleCastVote = async () => {
    if (hasVoted || submitting || status !== 'LIVE') return;

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await api.castVote(normalizedId);
      if (res.success) {
        if (sessionId) localStorage.setItem(`voted_${sessionId}_${normalizedId}`, 'true');
        setHasVoted(true);
        setVoteSuccess(true);

        try {
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.6 },
            colors: ['#f59e0b', '#fbbf24', '#ffffff', '#10b981'],
          });
        } catch {
          // ignore
        }
      } else {
        setErrorMessage(res.message || 'Unable to record vote.');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to submit vote.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-zinc-100 flex flex-col justify-between font-sans">
        <Header minimal />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin mb-3" />
          <p className="text-xs font-mono text-zinc-400">Loading participant data...</p>
        </div>
      </div>
    );
  }

  if (errorMessage && !participant) {
    return (
      <div className="min-h-screen bg-black text-zinc-100 flex flex-col justify-between font-sans">
        <Header minimal />
        <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-md mx-auto text-center">
          <div className="w-14 h-14 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-rose-400 flex items-center justify-center mb-4">
            <AlertTriangle className="w-7 h-7" />
          </div>
            <h2 className="text-xl font-bold font-heading text-zinc-100">
            {errorMessage?.toLowerCase().includes('connect') ? 'Unable to connect to voting server.' : 'Participant not found.'}
          </h2>
          <p className="text-xs text-zinc-400 mt-2 font-mono">
            {errorMessage?.toLowerCase().includes('connect') ? 'Check your connection, then retry.' : `${normalizedId} is not registered in this tie-breaker event.`}
          </p>
          <Link
            to="/"
            className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-medium text-amber-400 hover:text-amber-300"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
          <button type="button" onClick={() => window.location.reload()} className="mt-4 text-xs text-amber-400 hover:text-amber-300">Retry</button>
        </div>
        <footer className="py-4 text-center text-xs font-mono text-zinc-600">
          ABES GOES LATENT · AUDIENCE VOTING
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col justify-between font-sans">
      <Header minimal />

      <main className="flex-1 max-w-md w-full mx-auto px-5 py-8 flex flex-col justify-between">
        <div>
          {/* Top Event Header */}
          <div className="text-center space-y-1 mb-6">
            <span className="text-xs font-mono font-bold tracking-widest text-amber-500 uppercase">
              ABES GOES LATENT
            </span>
            <h1 className="text-2xl font-black font-heading tracking-tight uppercase text-zinc-100">
              AUDIENCE VOTING
            </h1>
            <div className="pt-2">
              {status === 'LIVE' ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-500/40 px-3 py-1 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  🔴 Voting is LIVE
                </span>
              ) : status === 'CLOSED' ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-mono text-zinc-400 bg-zinc-900 border border-zinc-800 px-3 py-1 rounded-full">
                  Voting is currently closed.
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs font-mono text-amber-400 bg-amber-950/40 border border-amber-500/40 px-3 py-1 rounded-full">
                  Voting has not started yet.
                </span>
              )}
            </div>
          </div>

          {/* Participant Info Card */}
          <div className="rounded-2xl p-6 bg-zinc-900/90 border border-zinc-800 text-center relative overflow-hidden shadow-2xl mb-6">
            <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider block mb-2 font-medium">
              You are voting for:
            </span>

            <h2 className="text-3xl font-black font-heading text-zinc-100 tracking-tight my-1 uppercase">
              {participant?.name}
            </h2>

            <div className="inline-block mt-3 px-3 py-1 rounded-lg bg-zinc-950 border border-zinc-800 font-mono text-xs font-bold text-amber-400">
              {participant?.id}
            </div>
          </div>

          {/* Success state banner if vote just recorded */}
          {voteSuccess && (
            <div className="mb-6 p-6 rounded-2xl bg-emerald-950/50 border border-emerald-500/50 text-center animate-fade-in shadow-xl">
              <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="text-3xl font-extrabold text-emerald-400 mb-1">
                ✓
              </div>
              <h3 className="text-lg font-extrabold font-heading text-emerald-400 uppercase tracking-wider">
                VOTE RECORDED
              </h3>
              <p className="text-sm text-zinc-300 mt-2">
                Thank you for supporting the participant.
              </p>
            </div>
          )}

          {/* Error Message if any */}
          {errorMessage && (
            <div className="mb-6 p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs text-center">
              {errorMessage}
            </div>
          )}

          {/* Main Action Area */}
          <div className="mt-4">
            <VoteButton
              status={status}
              hasVoted={hasVoted}
              isLoading={submitting}
              onVote={handleCastVote}
            />
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-8 pt-6 border-t border-zinc-900 text-center space-y-2">
          <p className="text-xs text-zinc-500">
            One vote per browser device · ABES Engineering College Live Tie-Breaker
          </p>
          <div className="flex items-center justify-center gap-4 text-xs font-mono text-zinc-500">
            <Link to="/" className="hover:text-amber-400 transition-colors">
              Home
            </Link>
            <span>·</span>
            <Link to="/display" className="hover:text-amber-400 transition-colors">
              Projector Display
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
