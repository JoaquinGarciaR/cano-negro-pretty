'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  X,
  Calendar,
  Clock,
  User,
  Phone,
  MapPin,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Lock,
  Sparkles,
  Check,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { SUPPORTED_COUNTRY_CODES, cleanPhoneInput, AvailableTimeSlot, formatCRC } from '@cano/shared';
import { createManualBookingApi, fetchAvailability, fetchOpenDays } from '../lib/api';
import { showBrowserNotification } from '../lib/sound';

interface ManualBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  catalog: any;
  token?: string;
  onSuccess: () => void;
}

export function ManualBookingModal({
  isOpen,
  onClose,
  catalog,
  token,
  onSuccess
}: ManualBookingModalProps) {
  const [clientName, setClientName] = useState<string>('');
  const [countryCode, setCountryCode] = useState<string>('+506');
  const [clientPhone, setClientPhone] = useState<string>('');
  const [modality, setModality] = useState<'AT_STATION' | 'HOME_VISIT'>('AT_STATION');
  const [locationId, setLocationId] = useState<string>('');
  const [customAddress, setCustomAddress] = useState<string>('');
  const [serviceType, setServiceType] = useState<'service' | 'package'>('service');
  const [serviceId, setServiceId] = useState<string>('');
  const [packageId, setPackageId] = useState<string>('');
  const [professionalId, setProfessionalId] = useState<string>('');
  
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [openDays, setOpenDays] = useState<any[]>([]);
  const [loadingOpenDays, setLoadingOpenDays] = useState<boolean>(false);
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  const [selectedStartTime, setSelectedStartTime] = useState<string>('');
  const [clientNotes, setClientNotes] = useState<string>('');
  const [staffNotes, setStaffNotes] = useState<string>('Cita ingresada en recepción');

  const [availableSlots, setAvailableSlots] = useState<AvailableTimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState<boolean>(false);
  const [slotWarning, setSlotWarning] = useState<string | null>(null);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Estados de interacción para validación estricta de campos obligatorios
  const [touchedName, setTouchedName] = useState<boolean>(false);
  const [touchedPhone, setTouchedPhone] = useState<boolean>(false);

  // Reiniciar validaciones y advertencias al abrir el modal
  useEffect(() => {
    if (isOpen) {
      setTouchedName(false);
      setTouchedPhone(false);
      setError(null);
    }
  }, [isOpen]);

  // Validaciones en tiempo real
  const isNameValid = clientName.trim().length >= 2;

  const selectedCountry = useMemo(() => {
    return SUPPORTED_COUNTRY_CODES.find((c) => c.code === countryCode) || {
      code: '+506',
      country: 'Costa Rica',
      digits: 8
    };
  }, [countryCode]);

  const cleanedPhone = useMemo(() => {
    return cleanPhoneInput(clientPhone, countryCode);
  }, [clientPhone, countryCode]);

  const isPhoneValid = cleanedPhone.length === selectedCountry.digits;
  const canSubmit = isNameValid && isPhoneValid && !!selectedStartTime && !loading;

  // Inicializar IDs por defecto en cuanto el catálogo esté disponible
  useEffect(() => {
    if (catalog && isOpen) {
      if (!serviceId && catalog.services?.[0]?.id) {
        setServiceId(catalog.services[0].id);
      }
      if (!packageId && catalog.packages?.[0]?.id) {
        setPackageId(catalog.packages[0].id);
      }
      if (!professionalId && catalog.professionals?.[0]?.id) {
        setProfessionalId(catalog.professionals[0].id);
      }
      if (!locationId && catalog.locations?.[0]?.id) {
        setLocationId(catalog.locations[0].id);
      }
    }
  }, [catalog, isOpen]);

  const effectiveProfId = professionalId || catalog?.professionals?.[0]?.id;
  const effectiveServiceId = serviceType === 'service' ? (serviceId || catalog?.services?.[0]?.id) : undefined;
  const effectivePackageId = serviceType === 'package' ? (packageId || catalog?.packages?.[0]?.id) : undefined;
  const effectiveLocationId = modality === 'HOME_VISIT' ? (locationId || catalog?.locations?.[0]?.id) : undefined;

  // Servicio o paquete actualmente seleccionado y cálculo de duración y bloques
  const selectedService = useMemo(() => {
    return catalog?.services?.find((s: any) => s.id === effectiveServiceId);
  }, [catalog, effectiveServiceId]);

  const selectedPackage = useMemo(() => {
    return catalog?.packages?.find((pkg: any) => pkg.id === effectivePackageId);
  }, [catalog, effectivePackageId]);

  const durationMinutes = useMemo(() => {
    if (serviceType === 'service') {
      return selectedService?.durationMinutes || 60;
    }
    return selectedPackage?.totalDurationMinutes || 60;
  }, [serviceType, selectedService, selectedPackage]);

  const requiredBlocks = useMemo(() => {
    return Math.max(1, Math.ceil(durationMinutes / 15));
  }, [durationMinutes]);

  // Cargar jornadas abiertas del salón/profesional
  useEffect(() => {
    if (isOpen) {
      loadOpenDays();
    }
  }, [isOpen, effectiveProfId]);

  async function loadOpenDays() {
    setLoadingOpenDays(true);
    try {
      const res = await fetchOpenDays(effectiveProfId);
      const days = res.openDays || [];
      setOpenDays(days);
      if (days.length > 0) {
        if (!days.some((d: any) => d.date === date)) {
          setDate(days[0].date);
          const [y, m] = days[0].date.split('-').map(Number);
          setCalendarMonth(new Date(y, m - 1, 1));
        } else {
          const [y, m] = date.split('-').map(Number);
          setCalendarMonth(new Date(y, m - 1, 1));
        }
      }
    } catch (e) {
      console.error('Error al cargar días abiertos:', e);
      setOpenDays([]);
    } finally {
      setLoadingOpenDays(false);
    }
  }

  // Consultar disponibilidad y bloques de 15 min en tiempo real
  useEffect(() => {
    if (isOpen && date && effectiveProfId) {
      loadSlots();
    }
  }, [isOpen, date, effectiveProfId, effectiveServiceId, effectivePackageId, modality]);

  async function loadSlots() {
    if (!effectiveProfId || !date) return;
    setLoadingSlots(true);
    setSlotWarning(null);
    try {
      const res = await fetchAvailability({
        professionalId: effectiveProfId,
        serviceId: effectiveServiceId,
        packageId: effectivePackageId,
        modality,
        date
      });
      const slots: AvailableTimeSlot[] = res.slots || [];
      setAvailableSlots(slots);

      // Si el bloque previamente seleccionado ya no es válido o está bloqueado, deseleccionar
      if (selectedStartTime) {
        const matching = slots.find((s) => s.localStartTime === selectedStartTime);
        if (!matching || !matching.available) {
          setSelectedStartTime('');
          if (matching && !matching.available) {
            setSlotWarning(
              matching.conflictDetail || `El turno de las ${selectedStartTime} hrs ya no tiene disponibilidad para los ${requiredBlocks} bloques consecutivos requeridos.`
            );
          }
        }
      }
    } catch (_) {
      setAvailableSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  }

  // Datos del bloque de inicio seleccionado
  const selectedSlotData = useMemo(() => {
    if (!selectedStartTime) return null;
    return availableSlots.find((s) => s.localStartTime === selectedStartTime) || null;
  }, [availableSlots, selectedStartTime]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!isNameValid) {
      setTouchedName(true);
      setError('El nombre de la clienta es obligatorio (mínimo 2 caracteres).');
      setLoading(false);
      return;
    }

    if (!isPhoneValid) {
      setTouchedPhone(true);
      setError(
        `El número de teléfono celular es obligatorio y debe tener exactamente ${selectedCountry.digits} dígitos para ${selectedCountry.country}.`
      );
      setLoading(false);
      return;
    }

    if (!effectiveProfId) {
      setError('Debe seleccionar una esteticista para la asignación');
      setLoading(false);
      return;
    }

    if (!effectiveServiceId && !effectivePackageId) {
      setError('Debe seleccionar al menos un servicio o paquete');
      setLoading(false);
      return;
    }

    // Validación estricta del bloque de inicio
    if (!selectedStartTime) {
      setError('Debe seleccionar un bloque de inicio disponible en la cuadrícula de 15 minutos.');
      setLoading(false);
      return;
    }

    const currentSlot = availableSlots.find((s) => s.localStartTime === selectedStartTime);
    if (!currentSlot || !currentSlot.available) {
      setError(
        `El horario seleccionado (${selectedStartTime} hrs) no cuenta con los ${requiredBlocks} bloques consecutivos libres para este tratamiento.`
      );
      setSlotWarning(
        currentSlot?.conflictDetail || `¡Horario bloqueado o insuficiente para ${durationMinutes} min!`
      );
      setLoading(false);
      return;
    }

    try {
      const [year, month, day] = date.split('-').map(Number);
      const [hour, min] = selectedStartTime.split(':').map(Number);
      // UTC sumando 6 horas (offset America/Costa_Rica)
      const startTimeUTC = new Date(Date.UTC(year, month - 1, day, hour + 6, min, 0)).toISOString();

      const payload = {
        clientName: clientName.trim(),
        countryCode,
        clientPhone: cleanedPhone,
        modality,
        locationId: effectiveLocationId,
        customAddress: modality === 'HOME_VISIT' ? customAddress : undefined,
        professionalId: effectiveProfId,
        serviceId: effectiveServiceId,
        packageId: effectivePackageId,
        startTime: startTimeUTC,
        clientNotes: clientNotes || undefined,
        staffNotes: staffNotes || undefined
      };

      const res = await createManualBookingApi(payload, token);

      // Disparar notificación de navegador con sonido
      const profName = catalog?.professionals?.find((p: any) => p.id === effectiveProfId)?.name || 'Esteticista';
      showBrowserNotification(`Cita asignada a ${profName}`, {
        body: `Cita #${res.booking?.referenceCode || ''} para ${clientName} a las ${selectedStartTime} hrs (${durationMinutes} min).`
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al agendar la cita manual');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-pretty-wine-950/40 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg glass-panel rounded-3xl p-5 sm:p-7 shadow-2xl border border-white/80 my-auto text-pretty-wine-900">
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/70 hover:bg-white text-pretty-wine-800 transition-colors shadow-sm"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="mb-4 pr-8">
          <div className="flex items-center space-x-1.5 text-xs font-semibold text-pretty-pink-600 uppercase tracking-wider mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Recepción y Agenda Manual</span>
          </div>
          <h3 className="font-serif text-xl sm:text-2xl font-bold text-pretty-wine-900">
            Ingresar Cita Manual
          </h3>
          <p className="text-xs text-pretty-wine-800/80 mt-0.5">
            Registra una cita telefónica o presencial seleccionando el bloque inicial libre con espacio para toda la duración.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          
          {/* Nombre de la Clienta (Obligatorio) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-semibold text-pretty-wine-900 flex items-center space-x-1">
                <span>Nombre de la clienta:</span>
                <span className="text-rose-600 font-bold" title="Campo obligatorio">* (Obligatorio)</span>
              </label>
              {touchedName && !isNameValid ? (
                <span className="text-[10px] text-rose-600 font-semibold animate-fade-in">
                  Mínimo 2 caracteres
                </span>
              ) : isNameValid ? (
                <span className="text-[10px] text-emerald-700 font-semibold flex items-center space-x-0.5 animate-fade-in">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>Válido</span>
                </span>
              ) : null}
            </div>
            <input
              type="text"
              required
              placeholder="Ej: Sofía Chaves"
              value={clientName}
              onChange={(e) => {
                setClientName(e.target.value);
                if (!touchedName) setTouchedName(true);
              }}
              onBlur={() => setTouchedName(true)}
              className={`w-full px-3 py-2 rounded-xl border bg-white text-xs transition-all focus:outline-none focus:ring-2 ${
                touchedName && !isNameValid
                  ? 'border-rose-400 focus:ring-rose-300 bg-rose-50/20 text-rose-950'
                  : isNameValid
                  ? 'border-emerald-300 focus:ring-emerald-300'
                  : 'border-pretty-pink-200 focus:ring-pretty-pink-400'
              }`}
            />
          </div>

          {/* Teléfono con Código de País (Obligatorio) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-semibold text-pretty-wine-900 flex items-center space-x-1">
                <span>Teléfono Celular:</span>
                <span className="text-rose-600 font-bold" title="Campo obligatorio">* (Obligatorio)</span>
              </label>
              {isPhoneValid ? (
                <span className="text-[10px] text-emerald-700 font-semibold flex items-center space-x-0.5 animate-fade-in">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>{selectedCountry.digits} dígitos completos</span>
                </span>
              ) : touchedPhone ? (
                <span className="text-[10px] text-rose-600 font-semibold animate-fade-in">
                  {cleanedPhone.length === 0
                    ? 'Número celular obligatorio'
                    : `Faltan ${selectedCountry.digits - cleanedPhone.length} dígitos`}
                </span>
              ) : null}
            </div>

            <div className="flex space-x-2">
              <select
                value={countryCode}
                onChange={(e) => {
                  const newCode = e.target.value;
                  setCountryCode(newCode);
                  setClientPhone((prev) => cleanPhoneInput(prev, newCode));
                }}
                className="w-32 px-2 py-2 rounded-xl border border-pretty-pink-200 bg-white text-xs font-semibold focus:ring-2 focus:ring-pretty-pink-400"
              >
                {SUPPORTED_COUNTRY_CODES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>

              <input
                type="tel"
                required
                maxLength={selectedCountry.digits}
                placeholder={countryCode === '+506' ? '88887777 (8 dígitos)' : `${selectedCountry.digits} dígitos`}
                value={clientPhone}
                onChange={(e) => {
                  setClientPhone(cleanPhoneInput(e.target.value, countryCode));
                  if (!touchedPhone) setTouchedPhone(true);
                }}
                onBlur={() => setTouchedPhone(true)}
                className={`flex-1 px-3 py-2 rounded-xl border bg-white text-xs focus:outline-none focus:ring-2 font-mono transition-all ${
                  touchedPhone && !isPhoneValid
                    ? 'border-rose-400 focus:ring-rose-300 bg-rose-50/20 text-rose-950'
                    : isPhoneValid
                    ? 'border-emerald-300 focus:ring-emerald-300'
                    : 'border-pretty-pink-200 focus:ring-pretty-pink-400'
                }`}
              />
            </div>

            <div className="mt-1 flex items-center justify-between text-[10px]">
              <span className={touchedPhone && !isPhoneValid ? 'text-rose-700 font-medium' : 'text-pretty-wine-700/70'}>
                {countryCode === '+506'
                  ? 'Para Costa Rica ingrese exactamente 8 dígitos numéricos.'
                  : `${selectedCountry.country}: ingrese exactamente ${selectedCountry.digits} dígitos.`}
              </span>
              <span className={`font-mono font-bold ${isPhoneValid ? 'text-emerald-700' : 'text-pretty-wine-700/60'}`}>
                {cleanedPhone.length}/{selectedCountry.digits}
              </span>
            </div>
          </div>

          {/* Selección de Tratamiento */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-semibold text-pretty-wine-900 mb-1">
                Tipo de tratamiento:
              </label>
              <select
                value={serviceType}
                onChange={(e) => {
                  setServiceType(e.target.value as any);
                  setSelectedStartTime('');
                  setSlotWarning(null);
                }}
                className="w-full px-2.5 py-2 rounded-xl border border-pretty-pink-200 bg-white text-xs font-semibold"
              >
                <option value="service">Servicio Individual</option>
                <option value="package">Paquete Especial</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-pretty-wine-900 mb-1">
                {serviceType === 'service' ? 'Servicio:' : 'Combo:'}
              </label>
              {serviceType === 'service' ? (
                <select
                  value={serviceId || catalog?.services?.[0]?.id || ''}
                  onChange={(e) => {
                    setServiceId(e.target.value);
                    setSelectedStartTime('');
                    setSlotWarning(null);
                  }}
                  className="w-full px-2.5 py-2 rounded-xl border border-pretty-pink-200 bg-white text-xs font-medium"
                >
                  {catalog?.services?.map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.durationMinutes} min)
                    </option>
                  ))}
                </select>
              ) : (
                <select
                  value={packageId || catalog?.packages?.[0]?.id || ''}
                  onChange={(e) => {
                    setPackageId(e.target.value);
                    setSelectedStartTime('');
                    setSlotWarning(null);
                  }}
                  className="w-full px-2.5 py-2 rounded-xl border border-pretty-pink-200 bg-white text-xs font-medium"
                >
                  {catalog?.packages?.map((pkg: any) => (
                    <option key={pkg.id} value={pkg.id}>
                      {pkg.name} ({pkg.totalDurationMinutes} min)
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Resumen de Duración y Bloques Requeridos */}
          <div className="px-3 py-2 rounded-2xl bg-pretty-pink-100/70 border border-pretty-pink-200 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-1.5 text-pretty-wine-900 min-w-0">
              <Sparkles className="w-3.5 h-3.5 text-pretty-pink-600 flex-shrink-0" />
              <span className="font-semibold truncate">
                {serviceType === 'service' ? selectedService?.name : selectedPackage?.name}
              </span>
            </div>
            <div className="flex items-center space-x-1.5 font-mono font-bold text-pretty-wine-900 text-[11px] flex-shrink-0 ml-2">
              <span className="px-2 py-0.5 rounded-full bg-white border border-pretty-pink-200">
                {durationMinutes} min
              </span>
              <span className="px-2 py-0.5 rounded-full bg-pretty-wine-900 text-white">
                {requiredBlocks} {requiredBlocks === 1 ? 'bloque' : 'bloques de 15m'}
              </span>
            </div>
          </div>

          {/* Asignar a Esteticista */}
          <div className="p-3 rounded-2xl bg-pretty-pink-50/70 border border-pretty-pink-200/60">
            <label className="block font-bold text-pretty-wine-900 mb-1 flex items-center space-x-1.5">
              <User className="w-3.5 h-3.5 text-pretty-pink-500" />
              <span>Asignar trabajo a:</span>
            </label>
            <select
              value={professionalId || catalog?.professionals?.[0]?.id || ''}
              onChange={(e) => {
                setProfessionalId(e.target.value);
                setSelectedStartTime('');
                setSlotWarning(null);
              }}
              className="w-full px-3 py-2 rounded-xl border border-pretty-pink-200 bg-white text-xs font-bold text-pretty-wine-900"
            >
              {catalog?.professionals?.map((p: any) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Selección Visual de Fecha (Calendario Idéntico al Wizard) */}
          <div className="space-y-2.5">
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-1.5">
                <div className="flex items-center space-x-1.5 min-w-0">
                  <Calendar className="w-3.5 h-3.5 text-pretty-pink-500 flex-shrink-0" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-pretty-wine-900 truncate">
                    Días disponibles:
                  </span>
                  <span className="text-[10px] bg-pretty-pink-200/80 text-pretty-wine-900 font-semibold px-2 py-0.5 rounded-full truncate">
                    {catalog?.professionals?.find((p: any) => p.id === effectiveProfId)?.name || 'Salón'}
                  </span>
                </div>

                <div className="flex items-center space-x-1 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => {
                      const prev = new Date(calendarMonth);
                      prev.setMonth(prev.getMonth() - 1);
                      setCalendarMonth(prev);
                    }}
                    className="p-1 rounded-lg bg-white/80 hover:bg-white text-pretty-wine-900 shadow-xs border border-pretty-pink-100"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-xs font-serif font-bold text-pretty-wine-900 px-2 capitalize">
                    {calendarMonth.toLocaleDateString('es-CR', { month: 'short', year: 'numeric' })}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const next = new Date(calendarMonth);
                      next.setMonth(next.getMonth() + 1);
                      setCalendarMonth(next);
                    }}
                    className="p-1 rounded-lg bg-white/80 hover:bg-white text-pretty-wine-900 shadow-xs border border-pretty-pink-100"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Cuadrícula del Calendario Mensual */}
              <div className="p-2.5 rounded-2xl bg-white/80 border border-white shadow-xs">
                <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase text-pretty-wine-700/70 mb-1.5">
                  <span>D</span>
                  <span>L</span>
                  <span>M</span>
                  <span>M</span>
                  <span>J</span>
                  <span>V</span>
                  <span>S</span>
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1).getDay() }).map((_, i) => (
                    <div key={`empty-${i}`} className="h-7" />
                  ))}

                  {Array.from({ length: new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0).getDate() }).map((_, i) => {
                    const dayNum = i + 1;
                    const dateStr = `${calendarMonth.getFullYear()}-${String(calendarMonth.getMonth() + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                    const openInfo = openDays.find((o) => o.date === dateStr);
                    const isUnlocked = Boolean(openInfo);
                    const isSelected = date === dateStr;

                    return (
                      <button
                        key={dateStr}
                        type="button"
                        disabled={!isUnlocked}
                        onClick={() => {
                          setDate(dateStr);
                          setSelectedStartTime('');
                          setSlotWarning(null);
                        }}
                        className={`h-7 sm:h-8 rounded-xl text-xs font-semibold flex flex-col items-center justify-center relative transition-all ${
                          !isUnlocked
                            ? 'opacity-25 cursor-not-allowed text-gray-400 bg-transparent'
                            : isSelected
                            ? 'bg-pretty-wine-900 text-white shadow-sm scale-105'
                            : 'bg-pretty-pink-100/90 text-pretty-wine-900 hover:bg-pretty-pink-200 border border-pretty-pink-200'
                        }`}
                      >
                        <span>{dayNum}</span>
                        {isUnlocked && (
                          <span className={`w-1 h-1 rounded-full -mt-0.5 ${isSelected ? 'bg-white' : 'bg-pretty-pink-500'}`} />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Leyenda explicativa idéntica */}
              <div className="flex items-center justify-between text-[10px] text-pretty-wine-700/70 px-1 pt-1.5">
                <span className="flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-pretty-pink-400" />
                  <span>Día desbloqueado</span>
                </span>
                <span className="flex items-center space-x-1">
                  <Lock className="w-2.5 h-2.5 text-gray-400" />
                  <span>Día aún no habilitado</span>
                </span>
              </div>
            </div>

            {/* Indicador del Bloque Inicial Elegido */}
            <div className="min-w-0">
              <label className="block font-semibold text-pretty-wine-900 mb-1 flex items-center space-x-1">
                <Clock className="w-3.5 h-3.5 text-pretty-pink-500" />
                <span>Bloque de Inicio:</span>
              </label>
              <div
                className={`w-full h-9 px-3 py-1.5 rounded-xl border flex items-center justify-between text-xs font-bold transition-all ${
                  selectedStartTime
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-900 shadow-xs'
                    : 'border-dashed border-pretty-pink-300 bg-white/70 text-pretty-wine-700/60'
                }`}
              >
                {selectedStartTime ? (
                  <>
                    <div className="flex items-center space-x-1.5 truncate">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                      <span className="font-mono text-xs">{selectedStartTime} hrs</span>
                      <span className="text-[10px] text-emerald-700 font-normal">
                        ({selectedSlotData?.localEndTime ? `hasta ${selectedSlotData.localEndTime}` : `${durationMinutes}m`})
                      </span>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-emerald-200/80 text-emerald-900 font-bold flex-shrink-0">
                      {requiredBlocks} blq.
                    </span>
                  </>
                ) : (
                  <span className="italic text-[11px] font-normal">
                    {date ? `Selecciona la hora de inicio para el ${date} abajo` : 'Selecciona un día desbloqueado arriba'}
                  </span>
                )}
              </div>
            </div>

            {/* Alerta explicativa si un horario intentado no cuenta con los bloques consecutivos */}
            {slotWarning && (
              <div className="p-2.5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-[11px] flex items-start space-x-2 animate-fade-in shadow-xs">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-0.5 flex-1 min-w-0">
                  <p className="font-bold">Horario no disponible</p>
                  <p className="text-[10px] leading-relaxed text-amber-800">{slotWarning}</p>
                </div>
              </div>
            )}

            {/* Confirmación del bloque y franja continua */}
            {selectedSlotData && selectedSlotData.available && (
              <div className="p-2.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px] flex items-center space-x-2 shadow-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span className="font-medium">
                  <strong>Franja confirmada:</strong> {selectedStartTime} a {selectedSlotData.localEndTime} hrs ({requiredBlocks} {requiredBlocks === 1 ? 'bloque continuo' : 'bloques continuos de 15 min'} disponibles).
                </span>
              </div>
            )}

            {/* Cuadrícula interactiva de bloques de 15 minutos */}
            <div className="p-2.5 rounded-2xl bg-pretty-pink-50/50 border border-pretty-pink-200/60">
              <div className="flex items-center justify-between text-[11px] font-bold text-pretty-wine-900 mb-1.5">
                <span className="flex items-center space-x-1.5">
                  <Clock className="w-3.5 h-3.5 text-pretty-pink-500" />
                  <span>Horas para el {date || 'día seleccionado'}:</span>
                </span>
                <span className="text-[10px] text-pretty-wine-700/70 font-semibold">
                  {loadingSlots ? 'Consultando...' : `${availableSlots.filter((s) => s.available).length} disponibles`}
                </span>
              </div>

              {loadingSlots ? (
                <div className="py-3 text-center text-xs text-pretty-wine-700/60">
                  Calculando bloques y franjas continuas de 15 min...
                </div>
              ) : availableSlots.length === 0 ? (
                <div className="py-2.5 text-center text-[11px] text-pretty-wine-700/70 bg-white/60 rounded-xl border border-white">
                  No hay turnos registrados para esta fecha o la jornada no está abierta.
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 max-h-36 overflow-y-auto pr-1">
                  {availableSlots.map((slot) => {
                    const isSelectedStart = selectedStartTime === slot.localStartTime;
                    const isCoveredConsecutive =
                      selectedSlotData?.consecutiveBlocks?.includes(slot.localStartTime) && !isSelectedStart;

                    return (
                      <button
                        key={slot.startTime}
                        type="button"
                        data-available={slot.available ? "true" : "false"}
                        onClick={() => {
                          if (!slot.available) {
                            setSlotWarning(
                              `¡No se puede iniciar a las ${slot.localStartTime} hrs! Este servicio dura ${durationMinutes} min y requiere ${slot.requiredBlocks || requiredBlocks} bloques consecutivos (${slot.consecutiveBlocks?.join(' • ') || '15 min c/u'}), pero: ${slot.conflictDetail || 'uno o más bloques siguientes están ocupados o bloqueados.'}`
                            );
                            return;
                          }
                          setSelectedStartTime(slot.localStartTime);
                          setSlotWarning(null);
                          setError(null);
                        }}
                        className={`py-1.5 px-0.5 rounded-xl text-[11px] font-bold transition-all text-center border relative ${
                          !slot.available
                            ? 'opacity-40 bg-red-100/70 text-red-800 border-red-200 line-through hover:opacity-90'
                            : isSelectedStart
                            ? 'bg-pretty-wine-900 text-white border-pretty-wine-900 shadow-sm scale-105 ring-2 ring-pretty-pink-400 z-10'
                            : isCoveredConsecutive
                            ? 'bg-pretty-pink-200/90 text-pretty-wine-950 border-pretty-pink-400 font-extrabold shadow-xs'
                            : 'bg-white hover:bg-pretty-pink-100 text-pretty-wine-900 border-pretty-pink-200/70 shadow-xs'
                        }`}
                        title={
                          slot.available
                            ? `Iniciar a las ${slot.localStartTime} hrs (${durationMinutes} min libres hasta las ${slot.localEndTime})`
                            : slot.conflictDetail || `BLOQUEADO a las ${slot.localStartTime} hrs`
                        }
                      >
                        {slot.localStartTime}
                        {isCoveredConsecutive && (
                          <span className="block text-[8px] font-semibold text-pretty-pink-700 leading-none">
                            en rango
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Leyenda explicativa de los bloques */}
              <div className="flex flex-wrap items-center justify-between gap-1 text-[10px] text-pretty-wine-700/70 pt-2 border-t border-pretty-pink-200/40 mt-2">
                <span className="flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-pretty-pink-400" />
                  <span>Inicio disponible</span>
                </span>
                <span className="flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-pretty-wine-900" />
                  <span>Inicio seleccionado</span>
                </span>
                <span className="flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-pretty-pink-300" />
                  <span>Bloques siguientes</span>
                </span>
                <span className="flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-red-400" />
                  <span className="line-through text-red-700">Bloqueado</span>
                </span>
              </div>
            </div>
          </div>

          {/* Modalidad */}
          <div>
            <label className="block font-semibold text-pretty-wine-900 mb-1">
              Modalidad:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setModality('AT_STATION')}
                className={`py-1.5 px-3 rounded-xl font-semibold border transition-all ${
                  modality === 'AT_STATION'
                    ? 'bg-pretty-wine-900 text-white'
                    : 'bg-white hover:bg-pretty-pink-50 text-pretty-wine-900'
                }`}
              >
                En estación
              </button>
              <button
                type="button"
                onClick={() => setModality('HOME_VISIT')}
                className={`py-1.5 px-3 rounded-xl font-semibold border transition-all ${
                  modality === 'HOME_VISIT'
                    ? 'bg-pretty-wine-900 text-white'
                    : 'bg-white hover:bg-pretty-pink-50 text-pretty-wine-900'
                }`}
              >
                A domicilio
              </button>
            </div>
          </div>

          {modality === 'HOME_VISIT' && (
            <div className="space-y-2 p-3 rounded-xl bg-white/70 border border-white">
              <div>
                <label className="block font-semibold text-pretty-wine-900 mb-1">
                  Localidad:
                </label>
                <select
                  value={locationId}
                  onChange={(e) => setLocationId(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-xl border border-pretty-pink-200 bg-white text-xs"
                >
                  {catalog?.locations?.map((loc: any) => {
                    const fee = loc.priceCRC || 0;
                    const disc = loc.discountCRC || 0;
                    let label = loc.name;
                    if (fee > 0) {
                      label += ` (+ ${formatCRC(fee)} traslado)`;
                    } else {
                      label += ' (Traslado incluido)';
                    }
                    if (disc > 0) {
                      label += ` - Descuento: ${formatCRC(disc)}`;
                    }
                    return (
                      <option key={loc.id} value={loc.id}>
                        {label}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-pretty-wine-900 mb-1">
                  Señas exactas:
                </label>
                <input
                  type="text"
                  placeholder="Ej: De la pulpería 100m norte..."
                  value={customAddress}
                  onChange={(e) => setCustomAddress(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-xl border border-pretty-pink-200 bg-white text-xs"
                />
              </div>
            </div>
          )}

          {error && (
            <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="pt-2 flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full text-xs font-semibold text-pretty-wine-800 hover:bg-white"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className={`px-5 py-2 rounded-full text-xs font-bold text-white transition-all shadow-sm ${
                !canSubmit
                  ? 'opacity-50 bg-pretty-wine-900/60 cursor-not-allowed'
                  : 'bg-pretty-wine-900 hover:bg-pretty-pink-600 active:scale-95'
              }`}
              title={
                !isNameValid
                  ? 'El nombre de la clienta es obligatorio'
                  : !isPhoneValid
                  ? `El teléfono celular es obligatorio (${selectedCountry.digits} dígitos)`
                  : !selectedStartTime
                  ? 'Seleccione un bloque de inicio disponible'
                  : 'Confirmar Cita'
              }
            >
              {loading ? 'Guardando...' : 'Confirmar Cita'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
