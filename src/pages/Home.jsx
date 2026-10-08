import { Link } from 'react-router-dom';
import { Shield, Tv, QrCode } from 'lucide-react';
import Header from '../components/Header.jsx';

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-between">
      <Header />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-16 sm:py-24 flex flex-col items-center justify-center text-center">
        {/* Event Header */}
        <div className="space-y-3">
          <span className="text-xs sm:text-sm font-mono tracking-widest text-amber-500 uppercase font-semibold">
            ABES Engineering College
          </span>
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold font-heading tracking-tight text-zinc-100 uppercase">
            ABES GOES <span className="text-amber-400">LATENT</span>
          </h1>
          <h2 className="text-xl sm:text-2xl font-bold font-heading text-zinc-300">
            LIVE AUDIENCE VOTING
          </h2>
          <p className="text-sm sm:text-base text-zinc-400 max-w-md mx-auto pt-2">
            Live audience tie-breaker voting system.
          </p>
        </div>

        {/* Navigation Buttons */}
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-xl">
          <Link
            to="/admin"
            className="flex flex-col items-center justify-center p-6 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-amber-500/50 hover:bg-zinc-850 active:scale-95 transition-all text-center group"
          >
            <div className="w-12 h-12 rounded-xl bg-zinc-800 text-amber-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <Shield className="w-6 h-6" />
            </div>
            <span className="font-bold text-zinc-100 text-sm font-heading tracking-wider uppercase">
              ADMIN PANEL
            </span>
          </Link>

          <Link
            to="/display"
            className="flex flex-col items-center justify-center p-6 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-amber-500/50 hover:bg-zinc-850 active:scale-95 transition-all text-center group"
          >
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <Tv className="w-6 h-6" />
            </div>
            <span className="font-bold text-zinc-100 text-sm font-heading tracking-wider uppercase">
              AUDITORIUM DISPLAY
            </span>
          </Link>

          <Link
            to="/admin/qr"
            className="flex flex-col items-center justify-center p-6 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-amber-500/50 hover:bg-zinc-850 active:scale-95 transition-all text-center group"
          >
            <div className="w-12 h-12 rounded-xl bg-zinc-800 text-zinc-300 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <QrCode className="w-6 h-6" />
            </div>
            <span className="font-bold text-zinc-100 text-sm font-heading tracking-wider uppercase">
              QR CODES
            </span>
          </Link>
        </div>
      </main>

      <footer className="border-t border-zinc-900 py-6 text-center text-xs text-zinc-500 font-mono">
        ABES Engineering College · ABES GOES LATENT
      </footer>
    </div>
  );
}
