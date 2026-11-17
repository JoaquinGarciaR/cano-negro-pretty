'use client';

import { useState, useEffect, useMemo } from 'react';
import { X, MessageSquare, Copy, ExternalLink, Check, AlertCircle, Sparkles, CalendarClock, Bell, CheckCircle2, Ban } from 'lucide-react';
import {
  buildWhatsAppMessage,
  buildWhatsAppRescheduleMessage,
  buildWhatsAppReminderMessage,
  buildWhatsAppCancellationMessage,
  buildWhatsAppCompletedMessage,
  buildWhatsAppLink,
  WhatsAppVoice
} from '@cano/shared';

export type WhatsAppTemplateType = 'confirmation' | 'reschedule' | 'reminder' | 'cancellation' | 'completed';

interface WhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: any | null;
  initialTemplate?: WhatsAppTemplateType;
  previousSchedule?: { date: string; time: string };
}

export function WhatsAppModal({
  isOpen,
  onClose,
  booking,
  initialTemplate = 'confirmation',
  previousSchedule
}: WhatsAppModalProps) {
  const [templateType, setTemplateType] = useState<WhatsAppTemplateType>(initialTemplate);
  const [voice, setVoice] = useState<WhatsAppVoice>('AS_PROFESSIONAL');
  const [cancellationReason, setCancellationReason] = useState<string>('');
  const [editableMessage, setEditableMessage] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  // Sincronizar initialTemplate cuando se abre el modal
  useEffect(() => {
    if (isOpen && initialTemplate) {
      setTemplateType(initialTemplate);
    }
  }, [isOpen, initialTemplate]);

  // Filtrar plantillas según el estado de la cita para ocultar las que no correspondan
  const availableTemplates = useMemo(() => {
    if (booking?.status === 'COMPLETED') {
      return [
        { id: 'completed' as const, label: 'Agradecimiento', icon: Sparkles, color: 'text-pretty-pink-400' },
        { id: 'reminder' as const, label: 'Seguimiento / Cuidados', icon: Bell, color: 'text-amber-500' }
      ];
    }
    if (booking?.status === 'CANCELLED' || booking?.status === 'REJECTED') {
      return [
        { id: 'cancellation' as const, label: 'Cancelación', icon: Ban, color: 'text-rose-500' }
      ];
    }
    return [
      { id: 'confirmation' as const, label: 'Confirmación', icon: CheckCircle2, color: 'text-emerald-500' },
      { id: 'reschedule' as const, label: 'Fecha/Hora', icon: CalendarClock, color: 'text-pretty-pink-400' },
      { id: 'reminder' as const, label: 'Recordatorio', icon: Bell, color: 'text-amber-500' },
      { id: 'cancellation' as const, label: 'Cancelación', icon: Ban, color: 'text-rose-500' }
    ];
  }, [booking?.status]);

  // Si la plantilla seleccionada no está en las plantillas disponibles para este estado, resetear
  useEffect(() => {
    if (isOpen && availableTemplates.length > 0) {
      const isValid = availableTemplates.some((t) => t.id === templateType);
      if (!isValid) {
        setTemplateType(availableTemplates[0].id);
      }
    }
  }, [isOpen, availableTemplates, templateType]);

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

      let generated = '';

      if (templateType === 'reschedule') {
        generated = buildWhatsAppRescheduleMessage({
          voice,
          clientName: booking.clientName,
          clientPhone: booking.clientPhone,
          professionalName: booking.professional?.name || 'Esteticista',
          serviceName: booking.serviceName || booking.snapshotServiceName,
          previousDate: previousSchedule?.date,
          previousTime: previousSchedule?.time,
          newFormattedDate: formattedDate,
          newFormattedTime: formattedTime,
          durationMinutes: booking.durationMinutes || booking.snapshotDurationMinutes,
          modality: booking.modality,
          locationName: booking.locationName,
          customAddress: booking.customAddress,
          totalCRC: booking.totalCRC || booking.snapshotTotalCRC,
          referenceCode: booking.referenceCode
        });
      } else if (templateType === 'reminder') {
        generated = buildWhatsAppReminderMessage({
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
      } else if (templateType === 'cancellation') {
        generated = buildWhatsAppCancellationMessage({
          voice,
          clientName: booking.clientName,
          clientPhone: booking.clientPhone,
          professionalName: booking.professional?.name || 'Esteticista',
          serviceName: booking.serviceName || booking.snapshotServiceName,
          formattedDate,
          formattedTime,
          referenceCode: booking.referenceCode,
          reason: cancellationReason
        });
      } else if (templateType === 'completed') {
        generated = buildWhatsAppCompletedMessage({
          voice,
          clientName: booking.clientName,
          clientPhone: booking.clientPhone,
          professionalName: booking.professional?.name || 'Esteticista',
          serviceName: booking.serviceName || booking.snapshotServiceName,
          referenceCode: booking.referenceCode,
          formattedDate
        });
      } else {
        generated = buildWhatsAppMessage({
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
      }

      setEditableMessage(generated);
      setCopied(false);
    }
  }, [booking, voice, templateType, previousSchedule, cancellationReason]);

  if (!isOpen || !booking) return null;

  const waLink = buildWhatsAppLink(booking.clientPhone, editableMessage);

  function handleCopy() {
    navigator.clipboard.writeText(editableMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-pretty-wine-950/40 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg glass-panel rounded-3xl p-5 sm:p-7 shadow-2xl border border-white/80 my-auto text-pretty-wine-900 max-h-[95vh] overflow-y-auto">
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 sm:top-5 sm:right-5 p-2 rounded-full bg-white/80 hover:bg-white text-pretty-wine-800 transition-colors shadow-sm z-10"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="mb-4 pr-10 sm:pr-12">
          <div className="flex items-center space-x-2 text-xs font-semibold text-pretty-pink-600 uppercase tracking-wider mb-1 truncate">
            <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">Módulo de WhatsApp · Caño Negro Pretty</span>
          </div>
          <h3 className="font-serif text-xl sm:text-2xl font-bold text-pretty-wine-900 leading-snug">
            {templateType === 'reschedule'
              ? 'Mensaje de Cambio de Fecha y Hora'
              : templateType === 'reminder'
              ? 'Mensaje de Recordatorio'
              : templateType === 'cancellation'
              ? 'Mensaje de Cancelación de Cita'
              : templateType === 'completed'
              ? 'Mensaje de Agradecimiento (Cita Completada)'
              : 'Mensaje de Confirmación'}
          </h3>
          <p className="text-xs text-pretty-wine-800/80 mt-0.5 leading-relaxed">
            Clienta: <strong>{booking.clientName}</strong> ({booking.clientPhone}) · Cita #{booking.referenceCode}
          </p>
        </div>

        {/* Selector de Plantilla */}
        <div className="mb-3.5">
          <label className="block text-xs font-semibold text-pretty-wine-900 mb-1.5">
            Plantilla de mensaje:
          </label>
          <div
            className={`grid gap-1.5 p-1 rounded-2xl bg-pretty-pink-100/70 border border-pretty-pink-200/60 ${
              availableTemplates.length === 1
                ? 'grid-cols-1'
                : availableTemplates.length === 2
                ? 'grid-cols-2'
                : 'grid-cols-2 sm:grid-cols-4'
            }`}
          >
            {availableTemplates.map((tpl) => {
              const IconComp = tpl.icon;
              const isSelected = templateType === tpl.id;
              const isCancel = tpl.id === 'cancellation';
              return (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => setTemplateType(tpl.id)}
                  className={`flex items-center justify-center space-x-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all ${
                    isSelected
                      ? isCancel
                        ? 'bg-rose-700 text-white shadow-sm'
                        : 'bg-pretty-wine-900 text-white shadow-sm'
                      : 'text-pretty-wine-900 hover:bg-white/60'
                  }`}
                >
                  <IconComp className={`w-3 h-3 ${isSelected ? 'text-white' : tpl.color}`} />
                  <span>{tpl.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Motivo de Cancelación (Si la plantilla es Cancelación) */}
        {templateType === 'cancellation' && (
          <div className="mb-3.5">
            <label className="block text-xs font-semibold text-pretty-wine-900 mb-1">
              Motivo o justificación de cancelación (opcional):
            </label>
            <input
              type="text"
              placeholder="Ej: Imprevisto de fuerza mayor en el salón / Emergencia familiar"
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl border border-rose-200 bg-white text-xs text-pretty-wine-900 focus:outline-none focus:ring-2 focus:ring-rose-400"
            />
          </div>
        )}

        {/* Selector de Voz */}
        <div className="mb-3.5">
          <label className="block text-xs font-semibold text-pretty-wine-900 mb-1.5">
            Voz del remitente:
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setVoice('AS_PROFESSIONAL')}
              className={`py-1.5 px-3 rounded-xl text-xs font-semibold border transition-all ${
                voice === 'AS_PROFESSIONAL'
                  ? 'bg-pretty-wine-900 text-white border-pretty-wine-900 shadow-sm'
                  : 'bg-white/80 text-pretty-wine-900 border-white hover:bg-white'
              }`}
            >
              Como Esteticista («Hola, soy...»)
            </button>
            <button
              onClick={() => setVoice('AS_BUSINESS')}
              className={`py-1.5 px-3 rounded-xl text-xs font-semibold border transition-all ${
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
        <div className="mb-3.5">
          <label className="block text-xs font-semibold text-pretty-wine-900 mb-1 flex items-center justify-between">
            <span>Mensaje listo para enviar (editable):</span>
            <span className="text-[11px] text-pretty-wine-700/70 font-normal">Puedes personalizar antes de enviar</span>
          </label>
          <textarea
            rows={7}
            value={editableMessage}
            onChange={(e) => setEditableMessage(e.target.value)}
            className="w-full p-3 rounded-2xl border border-pretty-pink-200/80 bg-white/90 text-xs text-pretty-wine-950 font-sans leading-relaxed focus:outline-none focus:ring-2 focus:ring-pretty-pink-400"
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
        <div className="mb-4 p-2.5 rounded-xl bg-pretty-pink-50/80 border border-pretty-pink-200/60 text-[11px] text-pretty-wine-900/90 flex items-start space-x-2">
          <AlertCircle className="w-4 h-4 text-pretty-pink-500 flex-shrink-0 mt-0.5" />
          <span>
            <strong>Recordatorio:</strong> Al presionar <em>Abrir WhatsApp</em> se iniciará el chat con el mensaje prellenado en tu app de WhatsApp.
          </span>
        </div>

        {/* Botones de acción */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-2 border-t border-pretty-pink-200/40">
          <button
            onClick={handleCopy}
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-4 py-2 rounded-full text-xs font-semibold text-pretty-wine-900 bg-white hover:bg-pretty-pink-50 border border-pretty-pink-200 transition-all shadow-sm"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? '¡Copiado!' : 'Copiar Texto'}</span>
          </button>

          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-5 py-2 rounded-full text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 transition-all shadow-sm"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Abrir WhatsApp</span>
          </a>
        </div>

      </div>
    </div>
  );
}
