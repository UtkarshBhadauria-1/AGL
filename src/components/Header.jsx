import { Link, useLocation } from 'react-router-dom';
import { Tv, QrCode, Shield, Home } from 'lucide-react';

export default function Header({ minimal = false }) {
  const location = useLocation();

  if (minimal) {
    return (
      <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md px-4 py-3 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link to="/" className="text-base font-bold font-heading tracking-wide text-amber-400 hover:text-amber-300 transition-colors">
            ABES GOES LATENT
          </Link>
          <span className="text-xs font-mono text-zinc-400">
            AUDIENCE VOTING
          </span>
        </div>
      </header>
    );
  }

  const navItems = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/admin', label: 'Admin', icon: Shield },
    { path: '/admin/qr', label: 'QR Codes', icon: QrCode },
    { path: '/display', label: 'Display', icon: Tv },
  ];

  return (
    <header className="border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand wordmark */}
        <Link to="/" className="text-lg sm:text-xl font-extrabold font-heading tracking-wider text-zinc-100 hover:text-amber-400 transition-colors">
          ABES GOES LATENT
        </Link>

        {/* Clean simple nav links: Home, Admin, QR Codes, Display */}
        <nav className="flex items-center gap-1 sm:gap-3 text-xs sm:text-sm font-medium">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-amber-500/10 text-amber-400 font-semibold border border-amber-500/20'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
