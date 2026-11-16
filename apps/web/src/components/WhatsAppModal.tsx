'use client';

import { useState, useEffect } from 'react';
import { X, MessageSquare, Copy, ExternalLink, Check, AlertCircle, Sparkles } from 'lucide-react';
import { buildWhatsAppMessage, buildWhatsAppLink, WhatsAppVoice } from '@cano/shared';

interface WhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: any | null;
}

export function WhatsAppModal({ isOpen, onClose, booking }: WhatsAppModalProps) {
  const [voice, setVoice] = useState<WhatsAppVoice>('AS_PROFESSIONAL');
  const [editableMessage, setEditableMessage] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (booking) {
      const dateObj = new Date(booking.startTime);
      const formattedDate = dateObj.toLocaleDateString('es-CR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      const formattedTime = dateObj.toLocaleTimeString('es-CR', {
        hour: '2-digit',
        minute: '2-digit'
      });

      const generated = buildWhatsAppMessage({
        voice,
        clientName: booking.clientName,
        clientPhone: booking.clientPhone,
        professionalName: booking.professional?.name || 'Esteticista',
        serviceName: booking.serviceName || booking.snapshotServiceName,
        formattedDate,
        formattedTime,
        durationMinutes: booking.durationMinutes || booking.snapshotDurationMinutes,
        modality: booking.modality,
        locationName: booking.locationName,
        customAddress: booking.customAddress,
        totalCRC: booking.totalCRC || booking.snapshotTotalCRC,
        referenceCode: booking.referenceCode
      });

      setEditableMessage(generated);
      setCopied(false);
    }
  }, [booking, voice]);

  if (!isOpen || !booking) return null;

  const waLink = buildWhatsAppLink(booking.clientPhone, editableMessage);

  function handleCopy() {
    navigator.clipboard.writeText(editableMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-pretty-wine-950/40 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg glass-panel rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/80 my-auto text-pretty-wine-900">
        
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-white/70 hover:bg-white text-pretty-wine-800 transition-colors shadow-sm"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="mb-4">
          <div className="flex items-center space-x-2 text-xs font-semibold text-pretty-pink-600 uppercase tracking-wider mb-1">
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Módulo de WhatsApp · Caño Negro Pretty</span>
          </div>
          <h3 className="font-serif text-2xl font-bold text-pretty-wine-900">
            Preparar Mensaje de Confirmación
          </h3>
          <p className="text-xs text-pretty-wine-800/80 mt-1">
            Para la clienta: <strong>{booking.clientName}</strong> ({booking.clientPhone})
          </p>
        </div>

        {/* Selector de Voz */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-pretty-wine-900 mb-1.5">
            Voz del remitente:
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setVoice('AS_PROFESSIONAL')}
              className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                voice === 'AS_PROFESSIONAL'
                  ? 'bg-pretty-wine-900 text-white border-pretty-wine-900 shadow-sm'
                  : 'bg-white/80 text-pretty-wine-900 border-white hover:bg-white'
              }`}
            >
              Como Esteticista («Hola, soy...»)
            </button>
            <button
              onClick={() => setVoice('AS_BUSINESS')}
              className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                voice === 'AS_BUSINESS'
                  ? 'bg-pretty-wine-900 text-white border-pretty-wine-900 shadow-sm'
                  : 'bg-white/80 text-pretty-wine-900 border-white hover:bg-white'
              }`}
            >
              Como Negocio («Te escribimos de...»)
            </button>
          </div>
        </div>

        {/* Editor de Mensaje */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-pretty-wine-900 mb-1.5 flex items-center justify-between">
            <span>Vista previa del mensaje editable:</span>
            <span className="text-[11px] text-pretty-wine-700/70 font-normal">Puedes personalizar el texto aquí</span>
          </label>
          <textarea
            rows={8}
            value={editableMessage}
            onChange={(e) => setEditableMessage(e.target.value)}
            className="w-full p-3.5 rounded-2xl border border-pretty-pink-200/80 bg-white/90 text-xs text-pretty-wine-950 font-sans leading-relaxed focus:outline-none focus:ring-2 focus:ring-pretty-pink-400"
          />
          <div className="flex justify-end pt-1.5">
            <button
              type="button"
              onClick={() => {
                const link = typeof window !== 'undefined' ? `${window.location.origin}/#catalogo` : 'https://canonegropretty.com/#catalogo';
                if (!editableMessage.includes('#catalogo')) {
                  setEditableMessage(prev => `${prev}\n\nPuedes consultar todos nuestros servicios y paquetes aquí:\n${link}`);
                }
              }}
              className="inline-flex items-center space-x-1 text-[11px] font-semibold text-pretty-wine-800 hover:text-pretty-pink-600 bg-white/70 hover:bg-white px-2.5 py-1 rounded-full border border-pretty-pink-200 transition-all shadow-sm"
            >
              <Sparkles className="w-3 h-3 text-pretty-pink-500" />
              <span>+ Añadir enlace al catálogo en mensaje</span>
            </button>
          </div>
        </div>

        {/* Aviso de envío manual */}
        <div className="mb-5 p-3 rounded-xl bg-pretty-pink-50/80 border border-pretty-pink-200/60 text-[11px] text-pretty-wine-900/90 flex items-start space-x-2">
          <AlertCircle className="w-4 h-4 text-pretty-pink-500 flex-shrink-0 mt-0.5" />
          <span>
            <strong>Recordatorio:</strong> Abrir WhatsApp abrirá la aplicación en tu dispositivo con el texto listo. El mensaje debe enviarse manualmente desde la cuenta que tengas activa.
          </span>
        </div>

        {/* Botones de acción */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2 border-t border-pretty-pink-200/40">
          <button
            onClick={handleCopy}
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-full text-xs font-semibold text-pretty-wine-900 bg-white hover:bg-pretty-pink-50 border border-pretty-pink-200 transition-all shadow-sm"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? '¡Copiado al portapapeles!' : 'Copiar Mensaje'}</span>
          </button>

          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-6 py-2.5 rounded-full text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 transition-all shadow-sm"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Abrir WhatsApp</span>
          </a>
        </div>

      </div>
    </div>
  );
}
