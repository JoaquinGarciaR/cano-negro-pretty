'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  X,
  Calendar,
  Clock,
  User,
  Users,
  AlertCircle,
  CheckCircle2,
  CalendarClock,
  Sparkles,
  ChevronRight,
  Sun,
  Moon
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

  // Generar lista interactiva de días rápidos a partir de openDays o próximos 14 días
  const quickDays = useMemo(() => {
    if (openDays.length > 0) {
      return openDays.slice(0, 10).map((od) => {
        const [year, month, day] = od.date.split('-').map(Number);
        const dObj = new Date(year, month - 1, day, 12, 0, 0);
        return {
          dateStr: od.date,
          dayName: dObj.toLocaleDateString('es-CR', { weekday: 'short' }),
          dayNum: day,
          monthName: dObj.toLocaleDateString('es-CR', { month: 'short' })
        };
      });
    }

    // Fallback: próximos 7 días a partir de hoy
    const list = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(today.getTime() + i * 86400000);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dayNum = String(d.getDate()).padStart(2, '0');
      list.push({
        dateStr: `${y}-${m}-${dayNum}`,
        dayName: d.toLocaleDateString('es-CR', { weekday: 'short' }),
        dayNum: d.getDate(),
        monthName: d.toLocaleDateString('es-CR', { month: 'short' })
      });
    }
    return list;
  }, [openDays]);

  // Agrupar turnos en Mañana y Tarde para facilidad visual
  const { morningSlots, afternoonSlots } = useMemo(() => {
    const morning: any[] = [];
    const afternoon: any[] = [];

    availableSlots.forEach((slot) => {
      const hourPart = parseInt(slot.localStartTime.split(':')[0], 10);
      const isPm = slot.localStartTime.toLowerCase().includes('p. m.') || slot.localStartTime.toLowerCase().includes('pm');
      const hour24 = isPm && hourPart !== 12 ? hourPart + 12 : (!isPm && hourPart === 12 ? 0 : hourPart);

      if (hour24 < 12) {
        morning.push(slot);
      } else {
        afternoon.push(slot);
      }
    });

    return { morningSlots: morning, afternoonSlots: afternoon };
  }, [availableSlots]);

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

  function renderSlotButton(slot: any) {
    const isChosen = selectedSlot?.startTime === slot.startTime;
    const isAvailable = slot.available;

    return (
      <button
        key={slot.startTime}
        type="button"
        onClick={() => {
          if (!isAvailable) {
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
        className={`relative py-2.5 px-2 text-center rounded-xl text-xs font-semibold transition-all ${
          isChosen
            ? 'bg-pretty-wine-900 text-white shadow-md scale-102 z-10'
            : isAvailable
            ? 'bg-white hover:bg-pretty-pink-50 text-pretty-wine-900 border border-pretty-pink-200/80 shadow-2xs'
            : 'bg-gray-100/90 text-gray-400 border border-gray-200/70 cursor-pointer hover:border-rose-300 hover:bg-rose-50/50'
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
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-pretty-wine-950/45 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-xl glass-panel rounded-3xl p-5 sm:p-7 shadow-2xl border border-white/80 my-auto text-pretty-wine-900 max-h-[95vh] overflow-y-auto">
        
        {/* Botón Cerrar */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-white/70 hover:bg-white text-pretty-wine-800 transition-colors shadow-sm"
          title="Cerrar modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Encabezado */}
        <div className="mb-4">
          <div className="flex items-center space-x-2 text-xs font-semibold text-pretty-pink-600 uppercase tracking-wider mb-1">
            <CalendarClock className="w-3.5 h-3.5" />
            <span>Reprogramación · Caño Negro Pretty</span>
          </div>
          <h3 className="font-serif text-xl sm:text-2xl font-bold text-pretty-wine-900">
            Cambio de Fecha y Hora
          </h3>
          <p className="text-xs text-pretty-wine-800/80 mt-0.5">
            Cita <strong>#{booking.referenceCode}</strong> · Clienta: <strong>{booking.clientName}</strong> ({booking.clientPhone})
          </p>
        </div>

        {/* Resumen del Horario Actual */}
        <div className="mb-4 p-3 rounded-2xl bg-pretty-pink-100/60 border border-pretty-pink-200/70 text-xs text-pretty-wine-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="text-[11px] font-bold uppercase text-pretty-wine-700/80 block">
              Horario Actual:
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

        {/* 1. Selector Interactivo de Esteticista (Pills) */}
        <div className="mb-4">
          <label className="block text-xs font-bold text-pretty-wine-900 mb-2 flex items-center space-x-1.5">
            <User className="w-3.5 h-3.5 text-pretty-pink-500" />
            <span>1. Selecciona la Esteticista para el nuevo horario:</span>
          </label>
          
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setSelectedProfId('all');
                loadUnlockedDays('all');
              }}
              className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                selectedProfId === 'all'
                  ? 'bg-pretty-wine-900 text-white border-pretty-wine-900 shadow-sm'
                  : 'bg-white hover:bg-pretty-pink-50 text-pretty-wine-900 border-pretty-pink-200 shadow-2xs'
              }`}
            >
              <Users className="w-3 h-3 text-pretty-pink-400" />
              <span>Cualquier esteticista libre</span>
            </button>

            {professionals.map((p) => {
              const isSelected = selectedProfId === p.id;
              const isCurrent = p.id === (booking.professionalId || booking.professional?.id);

              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setSelectedProfId(p.id);
                    loadUnlockedDays(p.id);
                  }}
                  className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                    isSelected
                      ? 'bg-pretty-wine-900 text-white border-pretty-wine-900 shadow-sm'
                      : 'bg-white hover:bg-pretty-pink-50 text-pretty-wine-900 border-pretty-pink-200 shadow-2xs'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-pretty-pink-100 text-pretty-wine-900'
                  }`}>
                    {p.name.slice(0, 1)}
                  </div>
                  <span>{p.name}</span>
                  {isCurrent && (
                    <span className={`text-[9px] px-1 rounded ${
                      isSelected ? 'bg-white/30 text-white' : 'bg-pretty-pink-100 text-pretty-pink-700'
                    }`}>
                      Actual
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Selector Interactivo de Nueva Fecha (Barra de Días + Selector Calendario) */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-pretty-wine-900 flex items-center space-x-1.5">
              <Calendar className="w-3.5 h-3.5 text-pretty-pink-500" />
              <span>2. Selecciona la Nueva Fecha:</span>
            </label>
            {openDays.length > 0 && (
              <span className="text-[11px] text-emerald-700 font-medium">
                {openDays.length} días con jornada activa
              </span>
            )}
          </div>

          {/* Días interactivos en cuadrícula / barra horizontal */}
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5 mb-2.5">
            {quickDays.slice(0, 7).map((qd) => {
              const isSelected = selectedDate === qd.dateStr;
              return (
                <button
                  key={qd.dateStr}
                  type="button"
                  onClick={() => setSelectedDate(qd.dateStr)}
                  className={`p-2 rounded-2xl border text-center transition-all ${
                    isSelected
                      ? 'bg-pretty-wine-900 text-white border-pretty-wine-900 shadow-md scale-102'
                      : 'bg-white hover:bg-pretty-pink-50 text-pretty-wine-900 border-pretty-pink-200/80 shadow-2xs'
                  }`}
                >
                  <span className={`text-[10px] font-bold uppercase block ${
                    isSelected ? 'text-pretty-pink-300' : 'text-pretty-wine-700/80'
                  }`}>
                    {qd.dayName}
                  </span>
                  <span className="text-base font-serif font-bold block my-0.5">
                    {qd.dayNum}
                  </span>
                  <span className={`text-[9px] block ${
                    isSelected ? 'text-white/80' : 'text-pretty-wine-700/60'
                  }`}>
                    {qd.monthName}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Selector de fecha nativo para cualquier otra fecha */}
          <div className="flex items-center space-x-2">
            <span className="text-[11px] text-pretty-wine-700/80 whitespace-nowrap">
              O elige otra fecha:
            </span>
            <input
              type="date"
              value={selectedDate}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="flex-1 px-3 py-1.5 rounded-xl border border-pretty-pink-200 bg-white text-xs font-semibold text-pretty-wine-900 focus:outline-none focus:ring-2 focus:ring-pretty-pink-400"
            />
          </div>
        </div>

        {/* 3. Selector Interactivo de Nueva Hora / Slots con Feedback de No Disponibilidad */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-pretty-wine-900 flex items-center space-x-1.5">
              <Clock className="w-3.5 h-3.5 text-pretty-pink-500" />
              <span>3. Selecciona la Nueva Hora:</span>
            </label>
            <span className="text-[11px] text-pretty-wine-700/70">
              Duración: {booking.durationMinutes || booking.snapshotDurationMinutes || 60} min
            </span>
          </div>

          {loadingSlots ? (
            <div className="py-8 text-center text-xs text-pretty-wine-800/80 bg-white/40 rounded-2xl border border-white">
              Consultando turnos libres con el equipo...
            </div>
          ) : !selectedDate ? (
            <div className="py-8 text-center text-xs text-pretty-wine-800/70 bg-white/40 rounded-2xl border border-white">
              Selecciona una fecha arriba para cargar los turnos disponibles.
            </div>
          ) : availableSlots.length === 0 ? (
            <div className="py-8 text-center text-xs text-pretty-wine-800/80 bg-white/60 rounded-2xl border border-white/80 p-4">
              <AlertCircle className="w-5 h-5 text-pretty-pink-500 mx-auto mb-1.5" />
              <span className="font-semibold block">No hay turnos disponibles para esta fecha.</span>
              <span className="text-[11px] text-pretty-wine-700/70 mt-1 block">
                Verifica que la fecha tenga jornada abierta o selecciona otra esteticista.
              </span>
            </div>
          ) : (
            <div className="space-y-3">
              
              {/* Sección Mañana si hay */}
              {morningSlots.length > 0 && (
                <div>
                  <div className="flex items-center space-x-1.5 text-[11px] font-bold text-pretty-wine-800 mb-1.5">
                    <Sun className="w-3 h-3 text-amber-500" />
                    <span>Mañana</span>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {morningSlots.map((slot) => renderSlotButton(slot))}
                  </div>
                </div>
              )}

              {/* Sección Tarde si hay */}
              {afternoonSlots.length > 0 && (
                <div>
                  <div className="flex items-center space-x-1.5 text-[11px] font-bold text-pretty-wine-800 mb-1.5">
                    <Moon className="w-3 h-3 text-indigo-500" />
                    <span>Tarde</span>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {afternoonSlots.map((slot) => renderSlotButton(slot))}
                  </div>
                </div>
              )}

              {/* AVISO IMPORTANTE: Feedback interactivo y explícito cuando se pulsa un horario no disponible */}
              {unavailableFeedback && (
                <div className="p-3 rounded-2xl bg-rose-50/90 border border-rose-200 text-xs text-rose-900 flex items-start space-x-2.5 animate-fadeIn mt-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="font-bold text-rose-950 flex items-center space-x-1.5">
                      <span>Horario de las {unavailableFeedback.time} NO disponible</span>
                    </div>
                    <p className="mt-0.5 text-xs text-rose-800 leading-relaxed">
                      {unavailableFeedback.reason}
                    </p>
                    <p className="mt-1 text-[11px] text-rose-700 font-medium">
                      Selecciona cualquiera de los turnos en blanco (habilitados) para confirmar la reprogramación.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Resumen del cambio seleccionado */}
        {selectedSlot && (
          <div className="mb-4 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between">
            <div>
              <span className="font-bold text-[11px] uppercase text-emerald-800 block">
                Nuevo Horario Seleccionado:
              </span>
              <div className="flex items-center space-x-1.5 font-bold text-emerald-950 mt-0.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>{selectedDate}</span>
                <span>·</span>
                <span>{selectedSlot.localStartTime}</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-emerald-800">Esteticista:</span>
              <div className="font-bold">
                {selectedProfId === 'all'
                  ? 'Cualquiera libre'
                  : professionals.find((p) => p.id === selectedProfId)?.name || 'Asignada'}
              </div>
            </div>
          </div>
        )}

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
            <span>{submitting ? 'Reprogramando...' : 'Confirmar Cambio de Fecha y Hora'}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
