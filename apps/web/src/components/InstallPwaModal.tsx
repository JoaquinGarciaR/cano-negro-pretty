'use client';

import { useState } from 'react';
import { X, Share2, PlusSquare, MoreVertical, Smartphone, CheckCircle2, Download, ArrowRight } from 'lucide-react';

interface InstallPwaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InstallPwaModal({ isOpen, onClose }: InstallPwaModalProps) {
  const [platform, setPlatform] = useState<'chrome_ios' | 'safari_ios' | 'android'>('chrome_ios');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-pretty-wine-950/40 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-md glass-panel rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/80 my-auto text-pretty-wine-900">
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/70 hover:bg-white text-pretty-wine-800 transition-colors shadow-sm"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="mb-4 pr-8">
          <div className="flex items-center space-x-1.5 text-xs font-semibold text-pretty-pink-600 uppercase tracking-wider mb-1">
            <Smartphone className="w-3.5 h-3.5" />
            <span>Instalación en tu Teléfono</span>
          </div>
          <h3 className="font-serif text-2xl font-bold text-pretty-wine-900">
            Instalar Caño Negro Pretty
          </h3>
          <p className="text-xs text-pretty-wine-800/80 mt-1">
            Ten el backoffice a mano en la pantalla de inicio de tu celular como una app nativa.
          </p>
        </div>

        {/* Selector de Navegador / Dispositivo */}
        <div className="grid grid-cols-3 gap-1.5 mb-5 p-1 rounded-2xl bg-pretty-pink-100/60 border border-pretty-pink-200/60">
          <button
            type="button"
            onClick={() => setPlatform('chrome_ios')}
            className={`py-1.5 px-2 rounded-xl text-[11px] font-bold transition-all text-center ${
              platform === 'chrome_ios'
                ? 'bg-pretty-wine-900 text-white shadow-sm'
                : 'text-pretty-wine-900 hover:bg-white/60'
            }`}
          >
            Chrome (iOS)
          </button>
          <button
            type="button"
            onClick={() => setPlatform('safari_ios')}
            className={`py-1.5 px-2 rounded-xl text-[11px] font-bold transition-all text-center ${
              platform === 'safari_ios'
                ? 'bg-pretty-wine-900 text-white shadow-sm'
                : 'text-pretty-wine-900 hover:bg-white/60'
            }`}
          >
            Safari (iOS)
          </button>
          <button
            type="button"
            onClick={() => setPlatform('android')}
            className={`py-1.5 px-2 rounded-xl text-[11px] font-bold transition-all text-center ${
              platform === 'android'
                ? 'bg-pretty-wine-900 text-white shadow-sm'
                : 'text-pretty-wine-900 hover:bg-white/60'
            }`}
          >
            Android
          </button>
        </div>

        {/* Instrucciones para Chrome en iPhone (iOS) */}
        {platform === 'chrome_ios' && (
          <div className="space-y-3 p-4 rounded-2xl bg-white/70 border border-white text-xs text-pretty-wine-900 leading-relaxed">
            <div className="flex items-start space-x-3">
              <span className="w-5 h-5 rounded-full bg-pretty-wine-900 text-white flex items-center justify-center font-bold text-[11px] flex-shrink-0 mt-0.5">
                1
              </span>
              <div>
                Toca el botón de <strong>Compartir</strong> (icono de cuadrado con flecha hacia arriba) en la barra de direcciones de Chrome, o toca el menú de <strong>tres puntos (...)</strong> abajo a la derecha.
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <span className="w-5 h-5 rounded-full bg-pretty-wine-900 text-white flex items-center justify-center font-bold text-[11px] flex-shrink-0 mt-0.5">
                2
              </span>
              <div>
                Si usaste los tres puntos, toca <strong>«Compartir...»</strong>.
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <span className="w-5 h-5 rounded-full bg-pretty-wine-900 text-white flex items-center justify-center font-bold text-[11px] flex-shrink-0 mt-0.5">
                3
              </span>
              <div>
                Desplázate hacia abajo en la lista de opciones y selecciona <strong>«Agregar a la pantalla principal»</strong> (o <em>Añadir a pantalla de inicio</em>).
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <span className="w-5 h-5 rounded-full bg-pretty-wine-900 text-white flex items-center justify-center font-bold text-[11px] flex-shrink-0 mt-0.5">
                4
              </span>
              <div>
                Toca <strong>«Agregar»</strong> en la esquina superior derecha. ¡Listo! Ya tendrás el ícono de Caño Negro Pretty en tu inicio.
              </div>
            </div>
          </div>
        )}

        {/* Instrucciones para Safari en iPhone */}
        {platform === 'safari_ios' && (
          <div className="space-y-3 p-4 rounded-2xl bg-white/70 border border-white text-xs text-pretty-wine-900 leading-relaxed">
            <div className="flex items-start space-x-3">
              <span className="w-5 h-5 rounded-full bg-pretty-wine-900 text-white flex items-center justify-center font-bold text-[11px] flex-shrink-0 mt-0.5">
                1
              </span>
              <div>
                En Safari, toca el botón <strong>Compartir</strong> <Share2 className="w-3.5 h-3.5 inline text-pretty-pink-600" /> en la barra inferior.
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <span className="w-5 h-5 rounded-full bg-pretty-wine-900 text-white flex items-center justify-center font-bold text-[11px] flex-shrink-0 mt-0.5">
                2
              </span>
              <div>
                Desliza hacia abajo en el menú y selecciona <strong>«Agregar al inicio»</strong> <PlusSquare className="w-3.5 h-3.5 inline text-pretty-pink-600" />.
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <span className="w-5 h-5 rounded-full bg-pretty-wine-900 text-white flex items-center justify-center font-bold text-[11px] flex-shrink-0 mt-0.5">
                3
              </span>
              <div>
                Presiona <strong>«Agregar»</strong> en la parte superior derecha.
              </div>
            </div>
          </div>
        )}

        {/* Instrucciones para Android */}
        {platform === 'android' && (
          <div className="space-y-3 p-4 rounded-2xl bg-white/70 border border-white text-xs text-pretty-wine-900 leading-relaxed">
            <div className="flex items-start space-x-3">
              <span className="w-5 h-5 rounded-full bg-pretty-wine-900 text-white flex items-center justify-center font-bold text-[11px] flex-shrink-0 mt-0.5">
                1
              </span>
              <div>
                Toca los <strong>tres puntos verticales</strong> <MoreVertical className="w-3.5 h-3.5 inline text-pretty-pink-600" /> en la esquina superior derecha de Chrome.
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <span className="w-5 h-5 rounded-full bg-pretty-wine-900 text-white flex items-center justify-center font-bold text-[11px] flex-shrink-0 mt-0.5">
                2
              </span>
              <div>
                Selecciona <strong>«Instalar aplicación»</strong> o <strong>«Agregar a la pantalla principal»</strong>.
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <span className="w-5 h-5 rounded-full bg-pretty-wine-900 text-white flex items-center justify-center font-bold text-[11px] flex-shrink-0 mt-0.5">
                3
              </span>
              <div>
                Confirma tocando <strong>«Instalar»</strong>.
              </div>
            </div>
          </div>
        )}

        {/* Botón de cierre */}
        <div className="mt-5 pt-3 border-t border-pretty-pink-200/50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-full text-xs font-bold text-white bg-pretty-wine-900 hover:bg-pretty-pink-600 transition-all shadow-sm"
          >
            Entendido
          </button>
        </div>

      </div>
    </div>
  );
}
