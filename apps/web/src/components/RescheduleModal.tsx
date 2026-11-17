'use client';

import { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  Clock,
  User,
  AlertCircle,
  CheckCircle2,
  CalendarClock,
  Sparkles,
  Info
} from 'lucide-react';
import { fetchAvailability, fetchOpenDays, rescheduleBookingApi } from '../lib/api';

interface RescheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: any | null;
  professionals: any[];
  token?: string;
  onSuccess: (updatedBooking: any, previousSchedule: { date: string; time: string }) => void;
}

export function RescheduleModal({
  isOpen,
  onClose,
  booking,
  professionals,
  token,
  onSuccess
}: RescheduleModalProps) {
  const [selectedProfId, setSelectedProfId] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [openDays, setOpenDays] = useState<any[]>([]);
  const [loadingDays, setLoadingDays] = useState<boolean>(false);

  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [loadingSlots, setLoadingSlots] = useState<boolean>(false);
  const [selectedSlot, setSelectedSlot] = useState<any | null>(null);

  const [unavailableFeedback, setUnavailableFeedback] = useState<{
    time: string;
    reason: string;
  } | null>(null);

  const [staffNotes, setStaffNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Inicializar estado cuando se abre el modal con una cita
  useEffect(() => {
    if (booking && isOpen) {
      const initialProf = booking.professionalId || booking.professional?.id || 'all';
      setSelectedProfId(initialProf);

      // Fecha inicial en formato YYYY-MM-DD
      const datePart = booking.startTime ? booking.startTime.split('T')[0] : '';
      setSelectedDate(datePart);

      setSelectedSlot(null);
      setUnavailableFeedback(null);
      setErrorMsg(null);
      setStaffNotes('');

      loadUnlockedDays(initialProf);
    }
  }, [booking, isOpen]);

  // Cargar días abiertos según la profesional elegida
  async function loadUnlockedDays(profId: string) {
    try {
      setLoadingDays(true);
      const res = await fetchOpenDays(profId !== 'all' ? profId : undefined);
      setOpenDays(res.openDays || []);
    } catch (e: any) {
      console.warn('Error cargando días desbloqueados:', e);
    } finally {
      setLoadingDays(false);
    }
  }

  // Al cambiar de fecha o profesional, consultar disponibilidad de turnos
  useEffect(() => {
    if (!isOpen || !booking || !selectedDate) {
      setAvailableSlots([]);
      return;
    }

    let isMounted = true;
    async function loadSlots() {
      try {
        setLoadingSlots(true);
        setSelectedSlot(null);
        setUnavailableFeedback(null);
        setErrorMsg(null);

        const res = await fetchAvailability({
          professionalId: selectedProfId !== 'all' ? selectedProfId : undefined,
          serviceId: booking.serviceId || undefined,
          packageId: booking.packageId || undefined,
          modality: booking.modality || 'AT_STATION',
          date: selectedDate
        });

        if (isMounted) {
          setAvailableSlots(res.slots || []);
        }
      } catch (err: any) {
        if (isMounted) {
          setErrorMsg(err.message || 'Error al obtener franjas de disponibilidad');
        }
      } finally {
        if (isMounted) setLoadingSlots(false);
      }
    }

    loadSlots();
    return () => {
      isMounted = false;
    };
  }, [isOpen, booking, selectedDate, selectedProfId]);

  if (!isOpen || !booking) return null;

  const currentStartDateObj = new Date(booking.startTime);
  const currentFormattedDate = currentStartDateObj.toLocaleDateString('es-CR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  const currentFormattedTime = currentStartDateObj.toLocaleTimeString('es-CR', {
    hour: '2-digit',
    minute: '2-digit'
  });

  async function handleConfirmReschedule() {
    if (!selectedSlot) {
      setErrorMsg('Debes seleccionar un horario disponible para reprogramar la cita.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg(null);

      const targetProf = selectedProfId !== 'all'
        ? selectedProfId
        : (booking.professionalId || booking.professional?.id || undefined);

      const res = await rescheduleBookingApi(
        booking.id,
        {
          startTime: selectedSlot.startTime,
          professionalId: targetProf,
          staffNotes: staffNotes.trim() || undefined
        },
        token
      );

      // Notificar éxito al componente padre
      onSuccess(res.booking, {
        date: currentFormattedDate,
        time: currentFormattedTime
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al guardar la reprogramación');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-pretty-wine-950/45 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-xl glass-panel rounded-3xl p-5 sm:p-7 shadow-2xl border border-white/80 my-auto text-pretty-wine-900 max-h-[95vh] overflow-y-auto">
        
        {/* Botón Cerrar */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-white/70 hover:bg-white text-pretty-wine-800 transition-colors shadow-sm"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Encabezado */}
        <div className="mb-4">
          <div className="flex items-center space-x-2 text-xs font-semibold text-pretty-pink-600 uppercase tracking-wider mb-1">
            <CalendarClock className="w-3.5 h-3.5" />
            <span>Reprogramación de Cita · Caño Negro Pretty</span>
          </div>
          <h3 className="font-serif text-xl sm:text-2xl font-bold text-pretty-wine-900">
            Cambio de Horario
          </h3>
          <p className="text-xs text-pretty-wine-800/80 mt-0.5">
            Cita <strong>#{booking.referenceCode}</strong> · Clienta: <strong>{booking.clientName}</strong> ({booking.clientPhone})
          </p>
        </div>

        {/* Resumen del Horario Actual */}
        <div className="mb-4 p-3 rounded-2xl bg-pretty-pink-100/60 border border-pretty-pink-200/70 text-xs text-pretty-wine-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="text-[11px] font-bold uppercase text-pretty-wine-700/80 block">
              Horario Agendado Actualmente:
            </span>
            <div className="flex items-center space-x-1.5 font-semibold text-pretty-wine-950 mt-0.5">
              <Calendar className="w-3.5 h-3.5 text-pretty-pink-600" />
              <span className="capitalize">{currentFormattedDate}</span>
              <span>·</span>
              <Clock className="w-3.5 h-3.5 text-pretty-pink-600" />
              <span>{currentFormattedTime}</span>
            </div>
            <span className="text-[11px] text-pretty-wine-800/80 block mt-0.5">
              Servicio: <strong>{booking.serviceName || booking.snapshotServiceName}</strong> ({booking.durationMinutes || booking.snapshotDurationMinutes} min)
            </span>
          </div>

          <div className="sm:text-right">
            <span className="text-[11px] text-pretty-wine-700/80 block">Esteticista asignada:</span>
            <span className="font-bold text-pretty-wine-900">
              {booking.professional?.name || 'Sin asignar (Bandeja compartida)'}
            </span>
          </div>
        </div>

        {/* Selector de Esteticista */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-pretty-wine-900 mb-1 flex items-center space-x-1">
            <User className="w-3.5 h-3.5 text-pretty-pink-500" />
            <span>Esteticista para el nuevo horario:</span>
          </label>
          <select
            value={selectedProfId}
            onChange={(e) => {
              const val = e.target.value;
              setSelectedProfId(val);
              loadUnlockedDays(val);
            }}
            className="w-full px-3 py-2 rounded-xl border border-pretty-pink-200 bg-white text-xs font-semibold text-pretty-wine-900 focus:outline-none focus:ring-2 focus:ring-pretty-pink-400"
          >
            <option value="all">Cualquier esteticista disponible del equipo</option>
            {professionals.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} {p.id === booking.professionalId ? '(Actual)' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Selector de Fecha */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-pretty-wine-900 mb-1 flex items-center justify-between">
            <span className="flex items-center space-x-1">
              <Calendar className="w-3.5 h-3.5 text-pretty-pink-500" />
              <span>Nueva Fecha:</span>
            </span>
            {openDays.length > 0 && (
              <span className="text-[11px] text-emerald-700 font-normal">
                {openDays.length} días con jornada abierta
              </span>
            )}
          </label>

          <input
            type="date"
            value={selectedDate}
            min={new Date().toISOString().split('T')[0]}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-pretty-pink-200 bg-white text-xs font-semibold text-pretty-wine-900 focus:outline-none focus:ring-2 focus:ring-pretty-pink-400"
          />

          {/* Días recomendados rápidos */}
          {openDays.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              <span className="text-[10px] text-pretty-wine-700/80 self-center mr-1">Días abiertos:</span>
              {openDays.slice(0, 6).map((od) => (
                <button
                  key={od.date}
                  type="button"
                  onClick={() => setSelectedDate(od.date)}
                  className={`text-[11px] px-2.5 py-1 rounded-full font-semibold border transition-all ${
                    selectedDate === od.date
                      ? 'bg-pretty-wine-900 text-white border-pretty-wine-900 shadow-sm'
                      : 'bg-white text-pretty-wine-900 border-pretty-pink-200 hover:bg-pretty-pink-50'
                  }`}
                >
                  {od.date}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Selector de Horario / Slots con Feedback de No Disponibilidad */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-pretty-wine-900 mb-1.5 flex items-center justify-between">
            <span className="flex items-center space-x-1">
              <Clock className="w-3.5 h-3.5 text-pretty-pink-500" />
              <span>Selecciona la Nueva Hora:</span>
            </span>
            <span className="text-[11px] text-pretty-wine-700/70 font-normal">
              Bloques de {booking.durationMinutes || booking.snapshotDurationMinutes || 60} min
            </span>
          </label>

          {loadingSlots ? (
            <div className="py-6 text-center text-xs text-pretty-wine-800/80 bg-white/40 rounded-2xl border border-white">
              Consultando turnos libres con el equipo...
            </div>
          ) : !selectedDate ? (
            <div className="py-6 text-center text-xs text-pretty-wine-800/70 bg-white/40 rounded-2xl border border-white">
              Selecciona una fecha arriba para ver los turnos disponibles.
            </div>
          ) : availableSlots.length === 0 ? (
            <div className="py-6 text-center text-xs text-pretty-wine-800/80 bg-white/60 rounded-2xl border border-white/80 p-4">
              <AlertCircle className="w-4 h-4 text-pretty-pink-500 mx-auto mb-1" />
              <span>No hay turnos disponibles para esta fecha o no se ha desbloqueado la jornada.</span>
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1.5 bg-white/40 rounded-2xl border border-pretty-pink-200/50">
                {availableSlots.map((slot) => {
                  const isChosen = selectedSlot?.startTime === slot.startTime;
                  const isAvailable = slot.available;

                  return (
                    <button
                      key={slot.startTime}
                      type="button"
                      onClick={() => {
                        if (!isAvailable) {
                          // Feedback explicativo al usuario
                          const reasonText = slot.conflictDetail
                            ? slot.conflictDetail
                            : selectedProfId === 'all'
                            ? 'Este horario no está disponible para ningún estilista del salón (ocupado o fuera de horario).'
                            : 'La esteticista seleccionada no tiene disponibilidad en este horario.';

                          setUnavailableFeedback({
                            time: slot.localStartTime,
                            reason: reasonText
                          });
                        } else {
                          setSelectedSlot(slot);
                          setUnavailableFeedback(null);
                          setErrorMsg(null);
                        }
                      }}
                      className={`relative py-2 px-2 text-center rounded-xl text-xs font-semibold transition-all ${
                        isChosen
                          ? 'bg-pretty-wine-900 text-white shadow-md scale-105 z-10'
                          : isAvailable
                          ? 'bg-white hover:bg-pretty-pink-50 text-pretty-wine-900 border border-pretty-pink-200/80 shadow-xs'
                          : 'bg-gray-100/80 text-gray-400 border border-gray-200/70 cursor-pointer hover:border-rose-300 hover:bg-rose-50/50'
                      }`}
                      title={
                        isAvailable
                          ? `Turno libre: ${slot.localStartTime} a ${slot.localEndTime}`
                          : `No disponible: ${slot.conflictDetail || 'Ocupado'}`
                      }
                    >
                      <span className={!isAvailable ? 'line-through text-gray-400' : ''}>
                        {slot.localStartTime}
                      </span>
                      {!isAvailable && (
                        <span className="block text-[9px] font-normal text-rose-500 mt-0.5">
                          Ocupado
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* AVISO IMPORTANTE: Feedback explícito cuando se pulsa un horario no disponible */}
              {unavailableFeedback && (
                <div className="mt-2.5 p-3 rounded-2xl bg-rose-50/90 border border-rose-200/80 text-xs text-rose-900 flex items-start space-x-2.5 animate-fadeIn">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="font-bold text-rose-950 flex items-center space-x-1.5">
                      <span>Horario de las {unavailableFeedback.time} NO disponible</span>
                    </div>
                    <p className="mt-0.5 text-xs text-rose-800 leading-relaxed">
                      {unavailableFeedback.reason}
                    </p>
                    <p className="mt-1 text-[11px] text-rose-700 font-medium">
                      Por favor selecciona cualquiera de los turnos en blanco (habilitados) para continuar.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Notas del Personal (Opcional) */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-pretty-wine-900 mb-1">
            Motivo o nota interna del cambio (opcional):
          </label>
          <input
            type="text"
            placeholder="Ej: Reprogramado a solicitud de la clienta por WhatsApp"
            value={staffNotes}
            onChange={(e) => setStaffNotes(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-pretty-pink-200 bg-white text-xs text-pretty-wine-900 focus:outline-none focus:ring-2 focus:ring-pretty-pink-400"
          />
        </div>

        {/* Mensaje de Error */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Botones de Acción */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-2 border-t border-pretty-pink-200/40">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="w-full sm:w-auto px-4 py-2 rounded-full text-xs font-semibold text-pretty-wine-800 bg-white hover:bg-pretty-pink-50 border border-pretty-pink-200 transition-all shadow-sm"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleConfirmReschedule}
            disabled={submitting || !selectedSlot}
            className={`w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-6 py-2 rounded-full text-xs font-bold text-white transition-all shadow-sm ${
              !selectedSlot || submitting
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-75'
                : 'bg-pretty-wine-900 hover:bg-pretty-pink-600 active:scale-95'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{submitting ? 'Reprogramando...' : 'Confirmar Cambio de Horario'}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
