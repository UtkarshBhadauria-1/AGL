import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { ExternalLink, Copy, Check, Printer } from 'lucide-react';

export default function QRCodeCard({
  id,
  name,
  fullVoteUrl,
  size = 220,
  onPrintSingle,
}) {
  const [copied, setCopied] = useState(false);

  const configuredAppUrl = (import.meta.env.VITE_APP_URL || '').trim().replace(/\/+$/, '');
  const appUrl = configuredAppUrl || (typeof window !== 'undefined' ? window.location.origin : '');
  const url = fullVoteUrl || `${appUrl}/vote/${encodeURIComponent(id)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-2xl p-6 bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700 transition-all flex flex-col items-center text-center shadow-lg print:border-none print:shadow-none print:bg-white print:p-8">
      {/* Participant ID Badge */}
      <div className="flex items-center justify-between w-full mb-3 pb-3 border-b border-zinc-800 print:border-black">
        <span className="px-3 py-1 rounded-md bg-amber-500/10 text-amber-400 font-mono font-bold text-xs print:bg-transparent print:text-black print:text-sm">
          ID: {id}
        </span>
        <span className="text-xs font-mono text-zinc-400 uppercase tracking-wide print:text-black">
          Tie-Breaker QR
        </span>
      </div>

      {/* Participant Name */}
      <h3 className="text-2xl font-black font-heading text-zinc-100 uppercase mb-4 print:text-black print:text-3xl">
        {name}
      </h3>

      {/* High-contrast white backing for camera scanning */}
      <div className="p-4 bg-white rounded-2xl shadow-xl inline-block transition-transform hover:scale-102 print:shadow-none print:p-0">
        <QRCodeSVG
          value={url}
          size={size}
          level="H"
          includeMargin={true}
        />
      </div>

      {/* Voting URL */}
      <div className="mt-5 w-full">
        <span className="text-xs font-mono text-zinc-400 block mb-1 print:text-black">
          Voting URL
        </span>
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-300 print:bg-white print:text-black print:border-black">
          <span className="truncate pr-2">{url}</span>
          <button
            onClick={handleCopy}
            title="Copy URL"
            className="no-print p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-amber-400 transition-colors shrink-0 cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="no-print mt-5 pt-4 border-t border-zinc-800/80 w-full flex items-center justify-between gap-3">
        {onPrintSingle && (
          <button
            onClick={() => onPrintSingle(id)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-300 hover:text-amber-400 bg-zinc-800/80 hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>PRINT THIS QR</span>
          </button>
        )}

        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors ml-auto"
        >
          <span>Open Link</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
}
