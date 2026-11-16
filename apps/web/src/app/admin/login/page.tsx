'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Sparkles, Lock, Mail, KeyRound, AlertCircle, ArrowLeft } from 'lucide-react';
import { adminLogin } from '../../../lib/api';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await adminLogin(email, password);
      // Guardar token en localStorage para fallback
      if (res.token) {
        localStorage.setItem('cnp_auth_token', res.token);
        localStorage.setItem('cnp_auth_user', JSON.stringify(res.user));
      }
      router.push('/admin');
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  }

  function fillDemo(e: string, p: string) {
    setEmail(e);
    setPassword(p);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md glass-panel rounded-3xl p-6 sm:p-8 shadow-glass border border-white/80 space-y-6 text-pretty-wine-900">
        
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center space-x-1 text-xs font-semibold text-pretty-wine-700 hover:text-pretty-pink-600 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Volver a la web</span>
          </Link>
          <div className="flex items-center space-x-1 text-xs text-pretty-pink-600 font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Backoffice PWA</span>
          </div>
        </div>

        <div className="text-center space-y-1.5">
          <h2 className="font-serif text-3xl font-bold text-pretty-wine-900">
            Caño Negro Pretty
          </h2>
          <p className="text-xs text-pretty-wine-800/80">
            Acceso exclusivo para esteticistas y administración
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-pretty-wine-900 mb-1 flex items-center space-x-1.5">
              <Mail className="w-3.5 h-3.5 text-pretty-pink-500" />
              <span>Correo electrónico:</span>
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@canonegropretty.com"
              className="w-full px-3.5 py-2.5 rounded-xl border border-pretty-pink-200 bg-white/90 text-sm focus:outline-none focus:ring-2 focus:ring-pretty-pink-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-pretty-wine-900 mb-1 flex items-center space-x-1.5">
              <KeyRound className="w-3.5 h-3.5 text-pretty-pink-500" />
              <span>Contraseña:</span>
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 rounded-xl border border-pretty-pink-200 bg-white/90 text-sm focus:outline-none focus:ring-2 focus:ring-pretty-pink-400"
            />
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center space-x-2 py-3 rounded-full text-xs font-bold text-white bg-pretty-wine-900 hover:bg-pretty-pink-600 transition-all shadow-sm active:scale-95"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>{loading ? 'Entrando...' : 'Iniciar Sesión'}</span>
          </button>
        </form>

        {/* Acceso rápido de demostración */}
        <div className="pt-4 border-t border-pretty-pink-200/50">
          <span className="text-[11px] font-semibold text-pretty-wine-700/70 block mb-2 text-center uppercase tracking-wider">
            Credenciales de Demostración:
          </span>
          <div className="flex flex-col gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => fillDemo('admin@canonegropretty.com', 'admin123')}
              className="px-3 py-1.5 rounded-xl bg-white/60 hover:bg-white text-pretty-wine-800 text-left border border-white flex justify-between"
            >
              <span>Propietaria (Carmen)</span>
              <span className="text-pretty-wine-600 font-mono">admin123</span>
            </button>
            <button
              type="button"
              onClick={() => fillDemo('elena@canonegropretty.com', 'pretty123')}
              className="px-3 py-1.5 rounded-xl bg-white/60 hover:bg-white text-pretty-wine-800 text-left border border-white flex justify-between"
            >
              <span>Esteticista Elena (Uñas)</span>
              <span className="text-pretty-wine-600 font-mono">pretty123</span>
            </button>
            <button
              type="button"
              onClick={() => fillDemo('sofia@canonegropretty.com', 'pretty123')}
              className="px-3 py-1.5 rounded-xl bg-white/60 hover:bg-white text-pretty-wine-800 text-left border border-white flex justify-between"
            >
              <span>Esteticista Sofía (Pestañas)</span>
              <span className="text-pretty-wine-600 font-mono">pretty123</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
