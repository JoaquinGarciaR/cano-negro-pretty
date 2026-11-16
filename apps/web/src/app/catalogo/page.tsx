'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';

export default function CatalogoRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirigir directamente al ancla #catalogo en la página principal
    router.replace('/#catalogo');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-pretty-cream-50">
      <div className="glass-panel p-6 sm:p-8 rounded-3xl text-center space-y-3 max-w-sm border border-white/80 shadow-glass">
        <div className="w-12 h-12 mx-auto rounded-full bg-pretty-pink-100 flex items-center justify-center text-pretty-wine-900">
          <Sparkles className="w-6 h-6 text-pretty-pink-500 animate-pulse" />
        </div>
        <h3 className="font-serif text-lg font-bold text-pretty-wine-900">
          Catálogo Caño Negro Pretty
        </h3>
        <p className="text-xs text-pretty-wine-800/80">
          Cargando los tratamientos y paquetes de belleza...
        </p>
      </div>
    </div>
  );
}
