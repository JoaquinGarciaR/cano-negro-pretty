'use client';

import { useState } from 'react';
import {
  X,
  User,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  CalendarClock,
  Sparkles,
  ShieldAlert
} from 'lucide-react';

interface AssignBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: any | null;
  professionals: any[];
  allBookings: any[];
  currentUserId?: string;
  currentUserProfId?: string;
  onAssign: (bookingId: string, professionalId: string) => Promise<void>;
  onOpenReschedule?: (booking: any) => void;
}

export function AssignBookingModal({
  isOpen,
  onClose,
  booking,
  professionals = [],
  allBookings = [],
  currentUserProfId,
  onAssign,
  onOpenReschedule
}: AssignBookingModalProps) {
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !booking) return null;

  const currentStartDateObj = new Date(booking.startTime);
  const formattedDate = currentStartDateObj.toLocaleDateString('es-CR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  const formattedTime = currentStartDateObj.toLocaleTimeString('es-CR', {
    hour: '2-digit',
    minute: '2-digit'
  });

  const durationMin = booking.durationMinutes || booking.snapshotDurationMinutes || 60;
  const currentAssignedProfId = booking.professionalId || booking.professional?.id;

  async function handleSelect(profId: string) {
    try {
      setSubmittingId(profId);
      setErrorMsg(null);
      await onAssign(booking.id, profId);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al asignar la cita');
    } finally {
      setSubmittingId(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-pretty-wine-950/45 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg glass-panel rounded-3xl p-5 sm:p-6 shadow-2xl border border-white/80 my-auto text-pretty-wine-900 max-h-[95vh] overflow-y-auto">
        
        {/* Botón Cerrar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 sm:top-5 sm:right-5 p-2 rounded-full bg-white/80 hover:bg-white text-pretty-wine-800 transition-colors shadow-sm z-10"
          title="Cerrar ventana"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Encabezado con padding derecho para que la X no tape el texto */}
        <div className="mb-4 pr-10 sm:pr-12">
          <div className="flex items-center space-x-1.5 text-xs font-semibold text-pretty-pink-600 uppercase tracking-wider mb-1 truncate">
            <User className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">Asignación de Cita · Caño Negro Pretty</span>
          </div>
          <h3 className="font-serif text-xl sm:text-2xl font-bold text-pretty-wine-900 leading-snug">
            {currentAssignedProfId ? 'Reasignar Esteticista' : 'Asignar Esteticista'}
          </h3>
          <p className="text-xs text-pretty-wine-800/80 mt-0.5 leading-relaxed">
            Cita <strong>#{booking.referenceCode}</strong> · Clienta: <strong>{booking.clientName}</strong>
          </p>
        </div>

        {/* Resumen del Horario */}
        <div className="mb-4 p-3 rounded-2xl bg-pretty-pink-100/60 border border-pretty-pink-200/70 text-xs">
          <div className="flex items-center space-x-2 font-bold text-pretty-wine-950">
            <Calendar className="w-3.5 h-3.5 text-pretty-pink-600" />
            <span className="capitalize">{formattedDate}</span>
            <span>·</span>
            <Clock className="w-3.5 h-3.5 text-pretty-pink-600" />
            <span>{formattedTime}</span>
            <span className="text-[11px] font-normal text-pretty-wine-700">({durationMin} min)</span>
          </div>
          <div className="text-[11px] text-pretty-wine-800/80 mt-1">
            Servicio: <strong>{booking.serviceName || booking.snapshotServiceName}</strong>
          </div>
        </div>

        {/* Mensaje de Error si ocurre */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Lista interactiva de esteticistas */}
        <div className="space-y-2.5 mb-5">
          <label className="block text-xs font-bold text-pretty-wine-900 mb-1">
            Selecciona la esteticista responsable:
          </label>

          {professionals.map((p) => {
            const isCurrentlyAssigned = currentAssignedProfId === p.id;
            const isSubmittingThis = submittingId === p.id;

            // Comprobar conflicto de solapamiento con citas confirmadas de esta esteticista
            const conflictingBooking = allBookings.find((other) => {
              if (other.id === booking.id || other.status !== 'CONFIRMED') return false;
              const otherProfId = other.professionalId || other.professional?.id;
              if (otherProfId !== p.id) return false;
              return (
                new Date(booking.startTime) < new Date(other.endTime) &&
                new Date(booking.endTime) > new Date(other.startTime)
              );
            });

            const hasConflict = Boolean(conflictingBooking);

            return (
              <div
                key={p.id}
                className={`p-3.5 rounded-2xl border transition-all ${
                  isCurrentlyAssigned
                    ? 'border-pretty-pink-400 bg-pretty-pink-50/70 shadow-xs'
                    : hasConflict
                    ? 'border-gray-200 bg-gray-50/70 opacity-80'
                    : 'border-white/90 bg-white hover:border-pretty-pink-300 shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  
                  {/* Avatar y Datos de la Esteticista */}
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-pretty-wine-900 to-pretty-pink-500 text-white flex items-center justify-center font-serif font-bold text-xs shadow-xs flex-shrink-0">
                      {p.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center space-x-1.5 flex-wrap">
                        <h4 className="font-serif text-sm font-bold text-pretty-wine-900 truncate">
                          {p.name}
                        </h4>
                        {currentUserProfId === p.id && (
                          <span className="text-[10px] font-bold text-pretty-pink-600 bg-pretty-pink-100 px-1.5 py-0.2 rounded-md">
                            (Tú)
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-pretty-wine-700/80 truncate">
                        {p.title || 'Esteticista'}
                      </p>
                    </div>
                  </div>

                  {/* Estado y Botón de Acción */}
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    {isCurrentlyAssigned ? (
                      <span className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-full text-xs font-bold bg-pretty-pink-200/80 text-pretty-wine-900 border border-pretty-pink-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-pretty-wine-800" />
                        <span>Asignada</span>
                      </span>
                    ) : hasConflict ? (
                      <div className="text-right">
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800 border border-rose-200">
                          <ShieldAlert className="w-3 h-3 text-rose-600" />
                          <span>Ocupada</span>
                        </span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={Boolean(submittingId)}
                        onClick={() => handleSelect(p.id)}
                        className="inline-flex items-center space-x-1 px-3.5 py-1.5 rounded-full text-xs font-bold text-white bg-pretty-wine-900 hover:bg-pretty-pink-600 active:scale-95 transition-all shadow-xs disabled:opacity-50"
                      >
                        <User className="w-3.5 h-3.5" />
                        <span>{isSubmittingThis ? 'Asignando...' : 'Asignar'}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Detalle si hay conflicto de horario */}
                {hasConflict && conflictingBooking && (
                  <div className="mt-2.5 pt-2 border-t border-rose-100 text-[11px] text-rose-700 flex items-start space-x-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <span>Ya tiene la cita confirmada <strong>#{conflictingBooking.referenceCode}</strong> en este intervalo.</span>
                      {onOpenReschedule && (
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onOpenReschedule(booking);
                          }}
                          className="ml-1 font-bold underline hover:text-rose-900"
                        >
                          Cambiar fecha y hora de la cita
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Pie de diálogo con opción de cambio de fecha y hora */}
        <div className="pt-3 border-t border-pretty-pink-200/50 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
          {onOpenReschedule ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenReschedule(booking);
              }}
              className="inline-flex items-center space-x-1.5 text-pretty-wine-800 hover:text-pretty-pink-600 font-semibold transition-colors"
            >
              <CalendarClock className="w-3.5 h-3.5 text-pretty-pink-500" />
              <span>¿Ninguna disponible? Cambiar fecha y hora</span>
            </button>
          ) : <div />}

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-full font-semibold text-pretty-wine-800 bg-white hover:bg-pretty-pink-50 border border-pretty-pink-200 shadow-xs transition-all w-full sm:w-auto"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
}
