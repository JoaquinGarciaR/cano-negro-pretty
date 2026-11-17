'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
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
  ChevronDown,
  Check,
  Search,
  UserCheck,
  RefreshCw,
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
  professionals = [],
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

  // Estado para el Dropdown interactivo de Esteticista
  const [isProfDropdownOpen, setIsProfDropdownOpen] = useState<boolean>(false);
  const [profSearchQuery, setProfSearchQuery] = useState<string>('');
  const profDropdownRef = useRef<HTMLDivElement>(null);

  // Manejo de clic exterior y tecla Escape para el dropdown de esteticista
  useEffect(() => {
    function handleClickOutside(e: MouseEvent | TouchEvent) {
      if (profDropdownRef.current && !profDropdownRef.current.contains(e.target as Node)) {
        setIsProfDropdownOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setIsProfDropdownOpen(false);
      }
    }
    if (isProfDropdownOpen) {
      document.addEventListener('pointerdown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('pointerdown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isProfDropdownOpen]);

  // Esteticista actualmente asignada a la cita original
  const currentBookingProfId = booking?.professionalId || booking?.professional?.id || null;
  const currentBookingProf = useMemo(() => {
    if (!currentBookingProfId) return null;
    return professionals.find((p) => p.id === currentBookingProfId) || booking?.professional || null;
  }, [currentBookingProfId, professionals, booking]);

  // Inicializar estado cuando se abre el modal con una cita
  useEffect(() => {
    if (booking && isOpen) {
      const initialProf = currentBookingProfId || 'all';
      setSelectedProfId(initialProf);

      // Fecha inicial en formato YYYY-MM-DD
      const datePart = booking.startTime ? booking.startTime.split('T')[0] : '';
      setSelectedDate(datePart);

      setSelectedSlot(null);
      setUnavailableFeedback(null);
      setErrorMsg(null);
      setStaffNotes('');
      setIsProfDropdownOpen(false);
      setProfSearchQuery('');

      loadUnlockedDays(initialProf);
    }
  }, [booking, isOpen, currentBookingProfId]);

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

  // Selección activa de esteticista formateada para el botón del dropdown
  const selectedProfInfo = useMemo(() => {
    if (selectedProfId === 'all') {
      return {
        title: 'Cualquier esteticista libre',
        subtitle: 'Revisando disponibilidad general de todo el salón',
        badge: 'Salón completo',
        isCurrent: false,
        isAll: true
      };
    }
    const prof = professionals.find((p) => p.id === selectedProfId);
    const isCurrent = currentBookingProfId && selectedProfId === currentBookingProfId;
    return {
      title: prof?.name || 'Esteticista seleccionada',
      subtitle: isCurrent
        ? 'Dejar la misma esteticista asignada'
        : `Cambiar a ${prof?.name || 'otra esteticista'} (antes: ${currentBookingProf?.name || 'Sin asignar'})`,
      badge: isCurrent ? 'Dejar la misma' : 'Cambiar esteticista',
      isCurrent,
      isAll: false,
      photoUrl: prof?.photoUrl,
      initials: prof?.name ? prof.name.slice(0, 2).toUpperCase() : 'ES'
    };
  }, [selectedProfId, currentBookingProfId, professionals, currentBookingProf]);

  // Profesionales filtrados por la búsqueda dentro del dropdown
  const filteredProfessionals = useMemo(() => {
    if (!profSearchQuery.trim()) return professionals;
    const q = profSearchQuery.toLowerCase().trim();
    return professionals.filter(
      (p) => p.name.toLowerCase().includes(q) || (p.title || '').toLowerCase().includes(q)
    );
  }, [professionals, profSearchQuery]);

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

  function handleSelectProf(profId: string) {
    setSelectedProfId(profId);
    setIsProfDropdownOpen(false);
    setProfSearchQuery('');
    loadUnlockedDays(profId);
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
              {currentBookingProf?.name || 'Sin asignar (Bandeja compartida)'}
            </span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 1. SELECTOR DROPDOWN DE ESTETICISTA: DEJAR LA MISMA O CAMBIARLA */}
        {/* ========================================================================= */}
        <div className="mb-4" ref={profDropdownRef}>
          <label className="block text-xs font-bold text-pretty-wine-900 mb-1.5 flex items-center justify-between">
            <div className="flex items-center space-x-1.5">
              <User className="w-3.5 h-3.5 text-pretty-pink-500" />
              <span>1. Esteticista: ¿Cambiarla o dejar la misma?</span>
            </div>
            <span className="text-[10px] text-pretty-wine-600 font-normal">
              Haz clic para elegir
            </span>
          </label>

          {/* Botón Disparador del Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsProfDropdownOpen((prev) => !prev)}
              className={`w-full p-2.5 rounded-2xl border text-left flex items-center justify-between transition-all shadow-xs ${
                isProfDropdownOpen
                  ? 'bg-white border-pretty-wine-900 ring-2 ring-pretty-wine-900/10'
                  : selectedProfInfo.isCurrent
                  ? 'bg-white/90 border-emerald-300 hover:bg-white'
                  : selectedProfInfo.isAll
                  ? 'bg-white/90 border-pretty-pink-200 hover:bg-white'
                  : 'bg-white/90 border-pretty-wine-300 hover:bg-white'
              }`}
            >
              <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                {/* Avatar o Icono */}
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                  selectedProfInfo.isCurrent
                    ? 'bg-emerald-100 text-emerald-900'
                    : selectedProfInfo.isAll
                    ? 'bg-pretty-pink-100 text-pretty-wine-900'
                    : 'bg-pretty-wine-900 text-white'
                }`}>
                  {selectedProfInfo.isAll ? (
                    <Users className="w-4 h-4 text-pretty-pink-600" />
                  ) : (
                    <span>{selectedProfInfo.initials || 'ES'}</span>
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-xs text-pretty-wine-950 truncate">
                      {selectedProfInfo.title}
                    </span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase tracking-wider ${
                      selectedProfInfo.isCurrent
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : selectedProfInfo.isAll
                        ? 'bg-pretty-pink-100 text-pretty-wine-800'
                        : 'bg-pretty-wine-100 text-pretty-wine-900 font-bold border border-pretty-wine-300'
                    }`}>
                      {selectedProfInfo.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-pretty-wine-700/80 truncate mt-0.2">
                    {selectedProfInfo.subtitle}
                  </p>
                </div>
              </div>

              <ChevronDown
                className={`w-4 h-4 text-pretty-wine-700 flex-shrink-0 transition-transform duration-200 ${
                  isProfDropdownOpen ? 'rotate-180 text-pretty-wine-950' : ''
                }`}
              />
            </button>

            {/* Popover / Menú desplegable */}
            {isProfDropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl p-2.5 shadow-2xl border border-pretty-pink-200 z-50 animate-fade-in space-y-2">
                
                {/* Buscador dentro del dropdown */}
                {professionals.length > 2 && (
                  <div className="relative">
                    <Search className="w-3 h-3 absolute left-2.5 top-2.5 text-pretty-wine-500" />
                    <input
                      type="text"
                      autoFocus
                      placeholder="Buscar esteticista..."
                      value={profSearchQuery}
                      onChange={(e) => setProfSearchQuery(e.target.value)}
                      className="w-full h-8 pl-7 pr-7 text-xs rounded-xl border border-pretty-pink-200 bg-pretty-pink-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-pretty-pink-400 text-pretty-wine-900"
                    />
                    {profSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setProfSearchQuery('')}
                        className="absolute right-2 top-2 p-0.5 rounded-full text-pretty-wine-400 hover:text-pretty-wine-700 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )}

                <div className="max-h-56 overflow-y-auto space-y-1.5 pr-0.5">
                  {/* OPCIÓN 1: DEJAR LA MISMA ESTETICISTA (si ya tiene una asignada) */}
                  {currentBookingProf && !profSearchQuery && (
                    <button
                      type="button"
                      onClick={() => handleSelectProf(currentBookingProf.id)}
                      className={`w-full p-2 rounded-xl text-left flex items-center justify-between transition-all border ${
                        selectedProfId === currentBookingProf.id
                          ? 'bg-emerald-50 border-emerald-300 ring-1 ring-emerald-300'
                          : 'bg-white hover:bg-emerald-50/50 border-gray-100 hover:border-emerald-200'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 truncate">
                        <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-900 flex items-center justify-center font-bold text-xs flex-shrink-0">
                          {currentBookingProf.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center space-x-1.5">
                            <span className="font-bold text-xs text-pretty-wine-900 truncate">
                              {currentBookingProf.name}
                            </span>
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                              Dejar la misma (Actual)
                            </span>
                          </div>
                          <p className="text-[10px] text-pretty-wine-600 truncate">
                            Mantener asignada a {currentBookingProf.name} en el nuevo horario
                          </p>
                        </div>
                      </div>
                      {selectedProfId === currentBookingProf.id && (
                        <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 ml-2" />
                      )}
                    </button>
                  )}

                  {/* OPCIÓN 2: CUALQUIER ESTETICISTA LIBRE */}
                  {!profSearchQuery && (
                    <button
                      type="button"
                      onClick={() => handleSelectProf('all')}
                      className={`w-full p-2 rounded-xl text-left flex items-center justify-between transition-all border ${
                        selectedProfId === 'all'
                          ? 'bg-pretty-wine-900 text-white border-pretty-wine-900 shadow-xs'
                          : 'bg-white hover:bg-pretty-pink-50 border-gray-100 hover:border-pretty-pink-200'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 truncate">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          selectedProfId === 'all' ? 'bg-white/20 text-white' : 'bg-pretty-pink-100 text-pretty-wine-800'
                        }`}>
                          <Users className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center space-x-1.5">
                            <span className={`font-bold text-xs truncate ${
                              selectedProfId === 'all' ? 'text-white' : 'text-pretty-wine-900'
                            }`}>
                              Cualquier esteticista libre
                            </span>
                            <span className={`text-[9px] font-semibold px-1.5 py-0.2 rounded-full ${
                              selectedProfId === 'all' ? 'bg-white/20 text-white' : 'bg-pretty-pink-100 text-pretty-wine-800'
                            }`}>
                              Ver todo
                            </span>
                          </div>
                          <p className={`text-[10px] truncate ${
                            selectedProfId === 'all' ? 'text-white/80' : 'text-pretty-wine-600'
                          }`}>
                            Revisa horarios de todo el equipo del salón
                          </p>
                        </div>
                      </div>
                      {selectedProfId === 'all' && (
                        <Check className="w-4 h-4 text-pretty-pink-300 flex-shrink-0 ml-2" />
                      )}
                    </button>
                  )}

                  {/* SECCIÓN 3: CAMBIAR A OTRA ESTETICISTA */}
                  <div className="pt-1">
                    <div className="text-[10px] font-bold uppercase text-pretty-pink-700 tracking-wider px-2 py-1 flex items-center space-x-1">
                      <RefreshCw className="w-2.5 h-2.5 text-pretty-pink-500" />
                      <span>Cambiar a otra compañera:</span>
                    </div>

                    <div className="space-y-1 mt-0.5">
                      {filteredProfessionals.map((p) => {
                        const isCurrent = currentBookingProfId && p.id === currentBookingProfId;
                        const isSelected = selectedProfId === p.id;
                        // Si ya se mostró arriba como "Actual", podemos omitirlo o mostrarlo con etiqueta clara
                        if (isCurrent && !profSearchQuery) return null;

                        return (
                          <button
                            type="button"
                            key={p.id}
                            onClick={() => handleSelectProf(p.id)}
                            className={`w-full p-2 rounded-xl text-left flex items-center justify-between transition-all border ${
                              isSelected
                                ? 'bg-pretty-wine-900 text-white border-pretty-wine-900 shadow-xs'
                                : 'bg-white hover:bg-pretty-pink-50 border-gray-100 hover:border-pretty-pink-200 text-pretty-wine-900'
                            }`}
                          >
                            <div className="flex items-center space-x-2.5 truncate">
                              <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                                isSelected ? 'bg-white/20 text-white' : 'bg-pretty-wine-100 text-pretty-wine-900'
                              }`}>
                                {p.name.slice(0, 2).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center space-x-1.5">
                                  <span className={`font-bold text-xs truncate ${
                                    isSelected ? 'text-white' : 'text-pretty-wine-900'
                                  }`}>
                                    {p.name}
                                  </span>
                                  <span className={`text-[9px] font-semibold px-1.5 py-0.2 rounded-full ${
                                    isSelected
                                      ? 'bg-white/20 text-white'
                                      : 'bg-pretty-wine-100 text-pretty-wine-900'
                                  }`}>
                                    {isCurrent ? 'Actual' : 'Cambiar a esta'}
                                  </span>
                                </div>
                                <p className={`text-[10px] truncate ${
                                  isSelected ? 'text-white/80' : 'text-pretty-wine-600'
                                }`}>
                                  {isCurrent
                                    ? 'Mantener misma esteticista'
                                    : `Reasignar cita a ${p.name} (${p.title || 'Especialista'})`}
                                </p>
                              </div>
                            </div>
                            {isSelected && (
                              <Check className="w-4 h-4 text-pretty-pink-300 flex-shrink-0 ml-2" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                </div>
              </div>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. SELECTOR INTERACTIVO DE NUEVA FECHA (BARRA DE DÍAS + SELECTOR CALENDARIO) */}
        {/* ========================================================================= */}
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
                      : 'bg-white hover:bg-pretty-pink-50 text-pretty-wine-900 border-pretty-pink-200/70 shadow-2xs'
                  }`}
                >
                  <span className="block text-[10px] uppercase font-semibold opacity-80">
                    {qd.dayName}
                  </span>
                  <span className="block font-serif text-base font-bold my-0.5">
                    {qd.dayNum}
                  </span>
                  <span className="block text-[9px] uppercase font-medium opacity-70">
                    {qd.monthName}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Selector de fecha nativo (para buscar cualquier otra fecha del año) */}
          <div className="flex items-center space-x-2">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="flex-1 px-3 py-2 rounded-xl border border-pretty-pink-200 bg-white text-xs text-pretty-wine-900 focus:outline-none focus:ring-2 focus:ring-pretty-pink-400 font-medium"
            />
            {loadingDays && (
              <span className="text-[11px] text-pretty-wine-600 animate-pulse">
                Cargando...
              </span>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. SELECTOR INTERACTIVO DE HORARIO / TURNOS DISPONIBLES */}
        {/* ========================================================================= */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-pretty-wine-900 flex items-center space-x-1.5">
              <Clock className="w-3.5 h-3.5 text-pretty-pink-500" />
              <span>3. Selecciona la Nueva Hora:</span>
            </label>
            {availableSlots.length > 0 && (
              <span className="text-[11px] text-pretty-wine-700/80">
                {availableSlots.filter((s) => s.available).length} turnos libres encontrados
              </span>
            )}
          </div>

          {loadingSlots ? (
            <div className="p-8 text-center bg-white/50 rounded-2xl border border-pretty-pink-100">
              <div className="w-5 h-5 border-2 border-pretty-wine-900 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-xs text-pretty-wine-800">
                Consultando disponibilidad para {selectedProfInfo.title} el {selectedDate}...
              </p>
            </div>
          ) : availableSlots.length === 0 ? (
            <div className="p-5 text-center bg-white/70 rounded-2xl border border-pretty-pink-200">
              <p className="text-xs font-semibold text-pretty-wine-900">
                No hay turnos disponibles para esta fecha.
              </p>
              <p className="text-[11px] text-pretty-wine-700/80 mt-1">
                Verifica que la jornada esté abierta en la pestaña de Apertura de Agenda o prueba con otro día.
              </p>
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
              <div className="font-bold flex items-center justify-end space-x-1">
                <span>{selectedProfInfo.title}</span>
                {selectedProfInfo.isCurrent ? (
                  <span className="text-[9px] px-1 rounded bg-emerald-200 text-emerald-900 font-bold">
                    Misma
                  </span>
                ) : !selectedProfInfo.isAll ? (
                  <span className="text-[9px] px-1 rounded bg-pretty-wine-200 text-pretty-wine-900 font-bold">
                    Reasignada
                  </span>
                ) : null}
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
