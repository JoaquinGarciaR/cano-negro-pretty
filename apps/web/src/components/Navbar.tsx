import Link from 'next/link';
import { BookOpen, Calendar, Lock, Download } from 'lucide-react';

interface NavbarProps {
  onOpenBooking: () => void;
  onOpenInstall?: () => void;
}

export function Navbar({ onOpenBooking, onOpenInstall }: NavbarProps) {
  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-white/50 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-20 flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="group flex items-center space-x-2.5 flex-shrink-0 mr-2 sm:mr-0">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-tr from-pretty-wine-900 to-pretty-pink-500 text-white flex items-center justify-center font-serif font-bold text-xs sm:text-sm shadow-sm flex-shrink-0 group-hover:scale-105 transition-transform">
            CN
          </div>
          <div className="flex flex-col">
            <span className="font-serif text-sm sm:text-xl lg:text-2xl font-bold tracking-tight text-pretty-wine-900 group-hover:text-pretty-pink-600 transition-colors">
              Caño Negro Pretty
            </span>
            <span className="hidden sm:block text-[9px] sm:text-[10px] uppercase tracking-widest text-pretty-wine-700/70 font-medium -mt-0.5">
              Salón de Belleza & Cuidado Cozy
            </span>
          </div>
        </Link>

        {/* Actions */}
        <div className="flex items-center space-x-1.5 sm:space-x-2 flex-shrink-0">
          <a
            href="#catalogo"
            onClick={(e) => {
              const el = document.getElementById('catalogo');
              if (el) {
                e.preventDefault();
                el.scrollIntoView({ behavior: 'smooth' });
                window.history.pushState(null, '', '#catalogo');
              }
            }}
            className="inline-flex items-center space-x-1.5 p-2 sm:px-3 sm:py-1.5 rounded-full text-xs font-semibold text-pretty-wine-800 bg-white/70 hover:bg-white border border-white/80 transition-all shadow-sm"
            title="Ver catálogo de servicios"
            aria-label="Catálogo"
          >
            <BookOpen className="w-3.5 h-3.5 text-pretty-pink-500 flex-shrink-0" />
            <span className="hidden md:inline">Catálogo</span>
          </a>

          {onOpenInstall && (
            <button
              onClick={onOpenInstall}
              className="inline-flex items-center space-x-1.5 p-2 sm:px-3 sm:py-1.5 rounded-full text-xs font-semibold text-pretty-wine-800 bg-white/70 hover:bg-white border border-white/80 transition-all shadow-sm"
              title="Instalar en tu teléfono"
              aria-label="Instalar"
            >
              <Download className="w-3.5 h-3.5 text-pretty-pink-500 flex-shrink-0" />
              <span className="hidden md:inline">Instalar</span>
            </button>
          )}

          <Link
            href="/admin"
            className="inline-flex items-center space-x-1.5 p-2 sm:px-3 sm:py-1.5 rounded-full text-xs font-medium text-pretty-wine-800 bg-white/70 hover:bg-white border border-white/80 transition-all shadow-sm"
            title="Acceso administrativo personal"
            aria-label="Acceso Personal"
          >
            <Lock className="w-3.5 h-3.5 text-pretty-wine-700 flex-shrink-0" />
            <span className="hidden md:inline">Personal</span>
          </Link>

          <button
            onClick={onOpenBooking}
            className="inline-flex items-center space-x-1 sm:space-x-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-pretty-wine-900 to-pretty-wine-700 hover:from-pretty-pink-600 hover:to-pretty-wine-800 transition-all shadow-glass hover:shadow-glass-hover active:scale-95 flex-shrink-0"
            title="Reservar mi cita"
          >
            <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
            <span>Reservar</span>
            <span className="hidden sm:inline"> mi Cita</span>
          </button>
        </div>
      </div>
    </header>
  );
}
