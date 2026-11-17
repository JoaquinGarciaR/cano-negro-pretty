'use client';

import { useState } from 'react';
import { Sparkles, Clock, ArrowRight, Tag, HeartHandshake, Share2, Check } from 'lucide-react';
import { formatCRC, formatDuration } from '@cano/shared';

interface CatalogProps {
  services: any[];
  packages: any[];
  onSelectService: (service: any) => void;
  onSelectPackage: (pkg: any) => void;
}

export function CatalogSection({
  services,
  packages,
  onSelectService,
  onSelectPackage,
}: CatalogProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'unas' | 'pestanas' | 'peinados' | 'paquetes'>('all');
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  function handleCopyCatalogLink() {
    const url = typeof window !== 'undefined'
      ? `${window.location.origin}/#catalogo`
      : 'https://canonegropretty.com/#catalogo';
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  }

  const filteredServices = services.filter((s) => {
    if (activeTab === 'all') return true;
    return s.category === activeTab;
  });

  const showPackages = activeTab === 'all' || activeTab === 'paquetes';

  return (
    <section id="catalogo" className="py-12 sm:py-16 scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Cabecera de la sección */}
        <div className="text-center max-w-2xl mx-auto mb-8 space-y-3">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-pretty-pink-100/70 border border-pretty-pink-200 text-xs font-semibold text-pretty-wine-800">
            <Sparkles className="w-3.5 h-3.5 text-pretty-pink-500" />
            <span>Nuestros Cuidados</span>
          </div>
          <h2 className="font-serif text-2xl sm:text-4xl font-bold text-pretty-wine-900 tracking-tight">
            Catálogo de Servicios & Paquetes
          </h2>
          <p className="text-xs sm:text-sm text-pretty-wine-800/80">
            Selecciona el tratamiento que deseas y reserva en pocos pasos.
          </p>

          {/* Botón para compartir enlace directo al catálogo */}
          <div className="pt-1 flex items-center justify-center">
            <button
              onClick={handleCopyCatalogLink}
              className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold text-pretty-wine-900 bg-white/80 hover:bg-white border border-pretty-pink-200 shadow-sm transition-all active:scale-95"
              title="Copiar enlace directo al catálogo para compartir por WhatsApp"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  <span className="text-emerald-700 font-bold">¡Enlace copiado (#catalogo)!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 text-pretty-pink-500 flex-shrink-0" />
                  <span>Copiar enlace al catálogo</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Pestañas de filtrado */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
          {[
            { id: 'all', label: 'Todos' },
            { id: 'unas', label: 'Uñas' },
            { id: 'pestanas', label: 'Pestañas & Cejas' },
            { id: 'peinados', label: 'Peinados' },
            { id: 'paquetes', label: 'Paquetes Combinados' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-pretty-wine-900 text-white shadow-glass scale-105'
                  : 'bg-white/70 text-pretty-wine-800 hover:bg-white border border-white/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Sección de Paquetes Especiales */}
        {showPackages && packages.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center space-x-2 mb-6">
              <Sparkles className="w-5 h-5 text-pretty-pink-500" />
              <h3 className="font-serif text-2xl font-bold text-pretty-wine-900">
                Paquetes Combinados Pretty
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {packages.map((pkg) => (
                <div
                  key={pkg.id}
                  className="glass-panel glass-card-interactive rounded-3xl p-5 sm:p-6 flex flex-col justify-between border-pretty-pink-300/40 relative overflow-hidden"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-2.5">
                      <h4 className="font-serif text-lg sm:text-xl font-bold text-pretty-wine-900 leading-snug">
                        {pkg.name}
                      </h4>
                      <span className="flex-shrink-0 inline-flex items-center space-x-1 bg-gradient-to-r from-pretty-wine-900 to-pretty-pink-600 text-white text-[10px] sm:text-[11px] font-bold px-2.5 sm:px-3 py-1 rounded-full shadow-xs whitespace-nowrap">
                        <Sparkles className="w-3 h-3 text-pretty-pink-300 flex-shrink-0" />
                        <span>Combo Especial</span>
                      </span>
                    </div>

                    <p className="text-xs sm:text-sm text-pretty-wine-800/80 leading-relaxed mb-4">
                      {pkg.description}
                    </p>

                    <div className="flex items-center space-x-4 text-xs text-pretty-wine-800/80 mb-6">
                      <div className="flex items-center space-x-1.5">
                        <Clock className="w-4 h-4 text-pretty-pink-500" />
                        <span>{pkg.totalDurationMinutes} min</span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <Tag className="w-4 h-4 text-pretty-pink-500" />
                        <span>Ahorro incluido</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-pretty-pink-200/50 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] uppercase tracking-wider text-pretty-wine-700/70 font-semibold block">
                        Precio Combo
                      </span>
                      <span className="font-serif text-2xl font-bold text-pretty-wine-900">
                        {formatCRC(pkg.totalPriceCRC)}
                      </span>
                    </div>

                    <button
                      onClick={() => onSelectPackage(pkg)}
                      className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-full text-xs font-bold text-white bg-pretty-wine-900 hover:bg-pretty-pink-600 transition-all shadow-sm active:scale-95"
                    >
                      <span>Reservar combo</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cuadrícula de Servicios Individuales */}
        {activeTab !== 'paquetes' && (
          <div>
            {showPackages && (
              <div className="flex items-center space-x-2 mb-6">
                <HeartHandshake className="w-5 h-5 text-pretty-pink-500" />
                <h3 className="font-serif text-2xl font-bold text-pretty-wine-900">
                  Servicios Individuales
                </h3>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredServices.map((service) => (
                <div
                  key={service.id}
                  className="glass-panel glass-card-interactive rounded-3xl overflow-hidden flex flex-col justify-between border-white/60"
                >
                  <div className="relative h-48 w-full overflow-hidden bg-pretty-pink-100">
                    <img
                      src={service.imageUrl}
                      alt={service.name}
                      className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                    />
                    <div className="absolute top-3 left-3 bg-white/80 backdrop-blur-md px-2.5 py-1 rounded-full text-[11px] font-semibold text-pretty-wine-900 shadow-sm">
                      {service.category === 'unas' ? 'Uñas' : service.category === 'pestanas' ? 'Pestañas' : 'Peinados'}
                    </div>
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="font-serif text-lg font-bold text-pretty-wine-900 mb-1.5 line-clamp-1">
                        {service.name}
                      </h4>
                      <p className="text-xs text-pretty-wine-800/80 leading-relaxed mb-4 line-clamp-2">
                        {service.description}
                      </p>

                      <div className="flex items-center space-x-1.5 text-xs text-pretty-wine-700/80 mb-4">
                        <Clock className="w-3.5 h-3.5 text-pretty-pink-500" />
                        <span>{formatDuration(service.durationBlocks)}</span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-pretty-pink-100 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-pretty-wine-700/70 font-semibold block">
                          Tarifa
                        </span>
                        <span className="font-serif text-xl font-bold text-pretty-wine-900">
                          {formatCRC(service.priceCRC)}
                        </span>
                      </div>

                      <button
                        onClick={() => onSelectService(service)}
                        className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-full text-xs font-semibold text-white bg-pretty-wine-900 hover:bg-pretty-pink-600 transition-all shadow-sm active:scale-95"
                      >
                        <span>Reservar</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </section>
  );
}
