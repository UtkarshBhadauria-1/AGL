import { Link } from 'react-router-dom';
import { ArrowRight, QrCode } from 'lucide-react';

export default function ParticipantCard({
  id,
  name,
  votes,
  percentage,
  rank,
  isLeader = false,
  showActions = false,
}) {
  return (
    <div
      className={`relative rounded-2xl p-6 transition-all border ${
        isLeader
          ? 'bg-gradient-to-b from-amber-950/30 to-zinc-900/80 border-amber-500/50 shadow-lg shadow-amber-500/10'
          : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold font-mono text-sm ${
              isLeader
                ? 'bg-amber-500 text-zinc-950 shadow-md'
                : 'bg-zinc-800 text-zinc-300'
            }`}
          >
            {id}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider">
                Participant
              </span>
              {rank !== undefined && (
                <span className="text-xs font-mono text-amber-400">
                  #{rank}
                </span>
              )}
            </div>
            <h3 className="text-xl font-bold font-heading text-zinc-100 tracking-tight mt-0.5">
              {name}
            </h3>
          </div>
        </div>

        {votes !== undefined && (
          <div className="text-right">
            <span className="text-2xl font-extrabold font-mono text-zinc-100 tabular-nums">
              {votes}
            </span>
            <span className="text-xs font-mono text-zinc-400 block">
              {percentage !== undefined ? `${percentage}%` : 'votes'}
            </span>
          </div>
        )}
      </div>

      {percentage !== undefined && (
        <div className="mt-4">
          <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                isLeader ? 'bg-amber-400' : 'bg-zinc-400'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
            />
          </div>
        </div>
      )}

      {showActions && (
        <div className="mt-5 pt-4 border-t border-zinc-800/80 flex items-center justify-between gap-2">
          <Link
            to={`/vote/${id}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors"
          >
            Vote Page
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>

          <Link
            to="/admin/qr"
            className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <QrCode className="w-3 h-3" />
            View QR
          </Link>
        </div>
      )}
    </div>
  );
}
