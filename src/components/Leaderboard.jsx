import { Trophy, Users, Award } from 'lucide-react';

export default function Leaderboard({
  participants = [],
  totalVotes = 0,
  leader = null,
  isTie = false,
  status = 'WAITING',
}) {
  return (
    <div className="space-y-6">
      {/* Sorted Leaderboard List */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold font-heading uppercase tracking-wider text-zinc-200">
              LIVE RESULTS
            </h3>
          </div>
          <span className="text-xs font-mono text-zinc-400">
            {participants.length} Active Participants
          </span>
        </div>

        {participants.length === 0 ? (
          <div className="p-8 text-center text-zinc-500 text-xs font-mono">
            NO TIE-BREAKER PARTICIPANTS SELECTED
          </div>
        ) : totalVotes === 0 ? (
          <div className="divide-y divide-zinc-800/60">
            {participants.map((p, idx) => (
              <div key={p.id} className="p-4 px-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-lg bg-zinc-800 text-zinc-400 font-mono text-xs font-bold flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <span className="text-sm font-bold text-zinc-200">{p.name}</span>
                  <span className="text-xs font-mono text-zinc-500">({p.id})</span>
                </div>
                <span className="text-xs font-mono text-zinc-500">0 votes</span>
              </div>
            ))}
            <div className="p-4 text-center text-xs font-mono font-bold text-zinc-500 bg-zinc-950/40 tracking-wider">
              NO VOTES YET
            </div>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/60">
            {participants.map((p, idx) => {
              const isFirst = idx === 0 && p.votes > 0;
              return (
                <div
                  key={p.id}
                  className={`p-4 sm:p-5 px-6 transition-colors ${
                    isFirst ? 'bg-amber-500/[0.04]' : 'hover:bg-zinc-900/40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                      <span
                        className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-mono font-bold shrink-0 ${
                          idx === 0 && p.votes > 0
                            ? 'bg-amber-500 text-zinc-950'
                            : 'bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        {idx + 1}
                      </span>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-bold text-zinc-100 truncate">
                            {p.name}
                          </h4>
                          <span className="text-xs font-mono text-zinc-500 uppercase">
                            ({p.id})
                          </span>
                        </div>
                        <span className="text-xs text-zinc-400 block mt-0.5 font-mono">
                          {p.percentage}% of total
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xl font-bold font-mono text-zinc-100 tabular-nums">
                        {p.votes}
                      </span>
                      <span className="text-xs text-zinc-500 block">votes</span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-3 w-full bg-zinc-800/80 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 rounded-full ${
                        idx === 0 && p.votes > 0
                          ? 'bg-gradient-to-r from-amber-500 to-amber-400'
                          : 'bg-zinc-500'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(0, p.percentage))}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
