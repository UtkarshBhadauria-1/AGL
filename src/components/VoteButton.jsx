import { Loader2, CheckCircle2, AlertCircle, Ban } from 'lucide-react';

export default function VoteButton({
  status,
  hasVoted,
  isLoading,
  onVote,
  disabled = false,
}) {
  if (hasVoted) {
    return (
      <div className="w-full p-5 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 mb-2">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-emerald-400 tracking-wide uppercase">
          You have already voted for this participant.
        </h3>
        <p className="text-xs text-zinc-400 mt-1">
          Your vote has already been recorded on this browser.
        </p>
      </div>
    );
  }

  if (status === 'CLOSED') {
    return (
      <div className="w-full p-5 rounded-2xl border border-zinc-800 bg-zinc-900/50 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-zinc-800 text-zinc-400 mb-2">
          <Ban className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-zinc-300 tracking-wide uppercase">
          Voting is currently closed.
        </h3>
        <p className="text-xs text-zinc-500 mt-1">
          Voting has ended. Thank you for participating.
        </p>
      </div>
    );
  }

  if (status === 'WAITING') {
    return (
      <div className="w-full p-5 rounded-2xl border border-amber-500/20 bg-amber-950/10 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-500/10 text-amber-400 mb-2">
          <AlertCircle className="w-6 h-6 animate-pulse" />
        </div>
        <h3 className="text-sm font-semibold text-amber-300">
          Voting has not started yet.
        </h3>
        <p className="text-xs text-zinc-400 mt-1">
          Keep this screen open. Voting will activate when announced.
        </p>
      </div>
    );
  }

  // Voting is LIVE
  return (
    <button
      onClick={onVote}
      disabled={isLoading || disabled}
      className="w-full rounded-2xl p-5 text-lg font-extrabold font-heading tracking-wider uppercase text-zinc-950 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 hover:from-amber-300 hover:to-amber-400 active:scale-[0.98] transition-all duration-200 shadow-xl shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer focus:outline-none focus:ring-4 focus:ring-amber-500/30"
    >
      <div className="flex items-center justify-center gap-3">
        {isLoading ? (
          <>
            <Loader2 className="w-6 h-6 animate-spin text-zinc-950" />
            <span>Submitting vote...</span>
          </>
        ) : (
          <span>CAST YOUR VOTE</span>
        )}
      </div>
    </button>
  );
}
