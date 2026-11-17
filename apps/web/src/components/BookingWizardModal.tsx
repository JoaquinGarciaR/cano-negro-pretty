'use client';

import { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Clock,
  User,
  Users,
  Phone,
  MapPin,
  Calendar,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  FileText,
  ChevronLeft,
  ChevronRight,
  Lock
} from 'lucide-react';
import { formatCRC, SUPPORTED_COUNTRY_CODES, cleanPhoneInput } from '@cano/shared';
import { fetchAvailability, createBookingRequest, fetchOpenDays } from '../lib/api';

interface BookingWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  catalog: {
    services: any[];
    packages: any[];
    professionals: any[];
    locations: any[];
  } | null;
  initialSelectedService?: any | null;
  initialSelectedPackage?: any | null;
}

export function BookingWizardModal({
  isOpen,
  onClose,
  catalog,
  initialSelectedService,
  initialSelectedPackage,
}: BookingWizardModalProps) {
  // Wizard de 5 pasos (Paso 1: Servicio, Paso 2: Modalidad, Paso 3: Fecha/Hora, Paso 4: Contacto, Paso 5: Resumen)
  const [step, setStep] = useState<number>(1);
  const [selectedService, setSelectedService] = useState<any | null>(initialSelectedService || null);
  const [selectedPackage, setSelectedPackage] = useState<any | null>(initialSelectedPackage || null);
  
  // Por requerimiento del salón, la asignación de especialista la realizan las propietarias/esteticistas al confirmar
  const assignToAny = true;
  const selectedProfessional = null;
  
  // Modalidad y localidad
  const [modality, setModality] = useState<'AT_STATION' | 'HOME_VISIT'>('AT_STATION');
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [customAddress, setCustomAddress] = useState<string>('');

  // Fecha y hora
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [openDays, setOpenDays] = useState<any[]>([]);
  const [loadingOpenDays, setLoadingOpenDays] = useState<boolean>(false);
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<any | null>(null);
  const [loadingSlots, setLoadingSlots] = useState<boolean>(false);

  // Datos personales y teléfono
  const [clientName, setClientName] = useState<string>('');
  const [countryCode, setCountryCode] = useState<string>('+506');
  const [clientPhone, setClientPhone] = useState<string>('');
  const [clientNotes, setClientNotes] = useState<string>('');
  const [acceptPolicy, setAcceptPolicy] = useState<boolean>(false);

  // Estados de envío
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedBooking, setSubmittedBooking] = useState<any | null>(null);

  // Sincronizar selección inicial cuando se abre el modal
  useEffect(() => {
    if (initialSelectedService) {
      setSelectedService(initialSelectedService);
      setSelectedPackage(null);
      setStep(2); // Avanza directamente a Modalidad
    } else if (initialSelectedPackage) {
      setSelectedPackage(initialSelectedPackage);
      setSelectedService(null);
      setStep(2); // Avanza directamente a Modalidad
    }
  }, [initialSelectedService, initialSelectedPackage]);

  // Si hay localidades y ninguna seleccionada, elegir la primera por defecto
  useEffect(() => {
    if (catalog?.locations && catalog.locations.length > 0 && !selectedLocationId) {
      setSelectedLocationId(catalog.locations[0].id);
    }
  }, [catalog, selectedLocationId]);

  // Cargar días abiertos generales del salón
  useEffect(() => {
    loadOpenDays();
  }, []);

  async function loadOpenDays() {
    setLoadingOpenDays(true);
    try {
      const res = await fetchOpenDays();
      const days = res.openDays || [];
      setOpenDays(days);
      if (days.length > 0) {
        setSelectedDate(days[0].date);
      } else {
        setSelectedDate('');
      }
    } catch (e) {
      console.error(e);
      setOpenDays([]);
    } finally {
      setLoadingOpenDays(false);
    }
  }

  // Cargar disponibilidad cuando cambian fecha, modalidad o servicio
  useEffect(() => {
    if (step === 3 && selectedDate) {
      loadSlots();
    }
  }, [step, selectedDate, modality, selectedService, selectedPackage]);

  async function loadSlots() {
    setLoadingSlots(true);
    setSelectedSlot(null);
    try {
      const res = await fetchAvailability({
        serviceId: selectedService?.id,
        packageId: selectedPackage?.id,
        modality,
        date: selectedDate
      });
      setAvailableSlots(res.slots || []);
    } catch (err: any) {
      console.error(err);
      setAvailableSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  }

  // Calcular desglose de precios
  const basePrice = selectedService
    ? selectedService.priceCRC
    : selectedPackage
    ? selectedPackage.totalPriceCRC
    : 0;

  const selectedLocation = catalog?.locations.find((l) => l.id === selectedLocationId);
  const locationFeeCRC = modality === 'HOME_VISIT' && selectedLocation ? (selectedLocation.priceCRC || 0) : 0;
  const discountCRC = modality === 'HOME_VISIT' && selectedLocation ? (selectedLocation.discountCRC || 0) : 0;
  const totalPrice = Math.max(0, basePrice + locationFeeCRC - discountCRC);

  // Validación estricta de teléfono numérico con soporte internacional
  const selectedCountry = SUPPORTED_COUNTRY_CODES.find((c) => c.code === countryCode) || {
    code: '+506',
    country: 'Costa Rica',
    digits: 8,
    label: 'CR (+506)'
  };
  const expectedDigits = selectedCountry.digits;
  const numericPhone = cleanPhoneInput(clientPhone, countryCode);
  const isPhoneValid = numericPhone.length === expectedDigits;

  async function handleSubmitBooking() {
    if (!acceptPolicy) {
      setSubmitError('Debe aceptar el uso de datos para gestionar la cita.');
      return;
    }
    if (!selectedSlot) {
      setSubmitError('Por favor selecciona una hora de inicio.');
      return;
    }
    if (!isPhoneValid) {
      setSubmitError(
        `El número celular para ${selectedCountry.country} debe tener exactamente ${expectedDigits} dígitos numéricos.`
      );
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const payload = {
        clientName: clientName.trim(),
        countryCode,
        clientPhone: numericPhone,
        modality,
        locationId: modality === 'HOME_VISIT' ? selectedLocationId : undefined,
        customAddress: modality === 'HOME_VISIT' ? customAddress : undefined,
        professionalId: undefined, // Sin especialista preasignada por la clienta
        serviceId: selectedService?.id,
        packageId: selectedPackage?.id,
        startTime: selectedSlot.startTime,
        clientNotes: clientNotes || undefined,
        acceptDataPolicy: true
      };

      const res = await createBookingRequest(payload);
      setSubmittedBooking(res.booking);
      setStep(6); // Pantalla final de éxito
    } catch (err: any) {
      setSubmitError(err.message || 'Error al enviar la solicitud.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-pretty-wine-950/45 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg glass-panel rounded-3xl p-4 sm:p-6 shadow-2xl border border-white/80 my-auto text-pretty-wine-900 max-h-[92vh] flex flex-col">
        
        {/* Botón cerrar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-white/70 hover:bg-white text-pretty-wine-800 transition-colors shadow-sm z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Encabezado del modal */}
        <div className="mb-4 pr-8">
          <div className="flex items-center space-x-1.5 text-xs font-semibold text-pretty-pink-600 uppercase tracking-wider mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Reserva en Línea · Paso {step} de 5</span>
          </div>
          <h3 className="font-serif text-xl sm:text-2xl font-bold text-pretty-wine-900 leading-tight">
            {step === 1 && 'Selecciona tu Servicio'}
            {step === 2 && 'Modalidad de Atención'}
            {step === 3 && 'Fecha y Hora Disponible'}
            {step === 4 && 'Tus Datos de Contacto'}
            {step === 5 && 'Revisa y Confirma'}
            {step === 6 && '¡Solicitud Recibida!'}
          </h3>
        </div>

        {/* Contenido según el paso */}
        <div className="flex-1 overflow-y-auto pr-1">

          {/* PASO 1: Selección de Servicio o Paquete */}
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-xs text-pretty-wine-800/80">
                Elige el servicio individual o paquete combinado que deseas agendar:
              </p>

              {catalog?.packages && catalog.packages.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-pretty-wine-700/70">
                    Paquetes Combinados
                  </span>
                  {catalog.packages.map((pkg) => (
                    <div
                      key={pkg.id}
                      onClick={() => {
                        setSelectedPackage(pkg);
                        setSelectedService(null);
                      }}
                      className={`p-3 rounded-2xl cursor-pointer border transition-all ${
                        selectedPackage?.id === pkg.id
                          ? 'bg-pretty-pink-100/90 border-pretty-pink-500 shadow-sm'
                          : 'bg-white/60 hover:bg-white border-white/80'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h5 className="font-serif text-sm font-bold text-pretty-wine-900">{pkg.name}</h5>
                          <p className="text-xs text-pretty-wine-800/80 mt-0.5">{pkg.description}</p>
                        </div>
                        <span className="font-serif font-bold text-sm text-pretty-wine-900 ml-3 flex-shrink-0">
                          {formatCRC(pkg.totalPriceCRC)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2 pt-1">
                <span className="text-xs font-bold uppercase tracking-wider text-pretty-wine-700/70">
                  Servicios Individuales
                </span>
                {catalog?.services.map((srv) => (
                  <div
                    key={srv.id}
                    onClick={() => {
                      setSelectedService(srv);
                      setSelectedPackage(null);
                    }}
                    className={`p-3 rounded-2xl cursor-pointer border transition-all ${
                      selectedService?.id === srv.id
                        ? 'bg-pretty-pink-100/90 border-pretty-pink-500 shadow-sm'
                        : 'bg-white/60 hover:bg-white border-white/80'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <h5 className="font-serif text-sm font-bold text-pretty-wine-900">{srv.name}</h5>
                        <span className="text-xs text-pretty-wine-700/80 flex items-center space-x-1 mt-0.5">
                          <Clock className="w-3 h-3 text-pretty-pink-500" />
                          <span>{srv.durationMinutes} min</span>
                        </span>
                      </div>
                      <span className="font-serif font-bold text-sm text-pretty-wine-900">
                        {formatCRC(srv.priceCRC)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PASO 2: Modalidad (Estación vs Domicilio) */}
          {step === 2 && (
            <div className="space-y-4">
              <p className="text-xs text-pretty-wine-800/80">
                ¿Dónde te gustaría recibir tu atención?
              </p>

              <div className="grid grid-cols-2 gap-2.5">
                <div
                  onClick={() => setModality('AT_STATION')}
                  className={`p-3.5 rounded-2xl cursor-pointer border text-center transition-all ${
                    modality === 'AT_STATION'
                      ? 'bg-pretty-pink-100/90 border-pretty-pink-500 shadow-sm font-semibold'
                      : 'bg-white/60 hover:bg-white border-white/80'
                  }`}
                >
                  <User className="w-5 h-5 mx-auto text-pretty-pink-500 mb-1" />
                  <span className="text-xs font-serif font-bold text-pretty-wine-900 block">En estación</span>
                  <span className="text-[10px] text-pretty-wine-700/80">En el salón de belleza</span>
                </div>

                <div
                  onClick={() => setModality('HOME_VISIT')}
                  className={`p-3.5 rounded-2xl cursor-pointer border text-center transition-all ${
                    modality === 'HOME_VISIT'
                      ? 'bg-pretty-pink-100/90 border-pretty-pink-500 shadow-sm font-semibold'
                      : 'bg-white/60 hover:bg-white border-white/80'
                  }`}
                >
                  <MapPin className="w-5 h-5 mx-auto text-pretty-pink-500 mb-1" />
                  <span className="text-xs font-serif font-bold text-pretty-wine-900 block">A domicilio</span>
                  <span className="text-[10px] text-pretty-wine-700/80">Vamos hasta tu hogar</span>
                </div>
              </div>

              {modality === 'HOME_VISIT' && (
                <div className="space-y-3 p-3.5 rounded-2xl bg-white/70 border border-white/90">
                  <div>
                    <label className="block text-xs font-semibold text-pretty-wine-900 mb-1">
                      Comunidad o Localidad (Caño Negro):
                    </label>
                    <select
                      value={selectedLocationId}
                      onChange={(e) => setSelectedLocationId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-pretty-pink-200 bg-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-pretty-pink-400"
                    >
                      {catalog?.locations.map((loc) => {
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
                    <label className="block text-xs font-semibold text-pretty-wine-900 mb-1">
                      Dirección o señas exactas (Obligatorio):
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Ej: De la pulpería 100m norte, casa rosada con portón blanco."
                      value={customAddress}
                      onChange={(e) => setCustomAddress(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-pretty-pink-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-pretty-pink-400"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PASO 3: Fecha y Hora con Calendario */}
          {step === 3 && (
            <div className="space-y-3">
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-2">
                  <div className="flex items-center space-x-1.5 min-w-0">
                    <Calendar className="w-3.5 h-3.5 text-pretty-pink-500 flex-shrink-0" />
                    <span className="text-xs font-bold uppercase tracking-wider text-pretty-wine-900 truncate">
                      Días disponibles:
                    </span>
                    <span className="text-[10px] bg-pretty-pink-200/80 text-pretty-wine-900 font-semibold px-2 py-0.5 rounded-full truncate">
                      Equipo Caño Negro
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
                      className="p-1 rounded-lg bg-white/70 hover:bg-white text-pretty-wine-900 shadow-sm"
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
                      className="p-1 rounded-lg bg-white/70 hover:bg-white text-pretty-wine-900 shadow-sm"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Cuadrícula del Calendario Mensual */}
                <div className="p-2.5 rounded-2xl bg-white/80 border border-white shadow-sm">
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
                      const isSelected = selectedDate === dateStr;

                      return (
                        <button
                          key={dateStr}
                          type="button"
                          disabled={!isUnlocked}
                          onClick={() => {
                            setSelectedDate(dateStr);
                            setSelectedSlot(null);
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

                {/* Leyenda explicativa */}
                <div className="flex items-center justify-between text-[10px] text-pretty-wine-700/70 px-1 pt-1.5">
                  <span className="flex items-center space-x-1">
                    <span className="w-2 h-2 rounded-full bg-pretty-pink-400" />
                    <span>Día disponible</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <Lock className="w-2.5 h-2.5 text-gray-400" />
                    <span>Día no habilitado</span>
                  </span>
                </div>
              </div>

              {/* Selector de Horas */}
              <div className="pt-2 border-t border-pretty-pink-100">
                <label className="block text-xs font-semibold text-pretty-wine-900 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center space-x-1.5">
                    <Clock className="w-3.5 h-3.5 text-pretty-pink-500" />
                    <span>Horas para el {selectedDate || 'día seleccionado'}:</span>
                  </span>
                </label>

                {!selectedDate ? (
                  <div className="py-4 text-center text-xs text-pretty-wine-800/80 bg-white/50 rounded-2xl border border-white">
                    Por favor selecciona un día disponible en el calendario.
                  </div>
                ) : loadingSlots ? (
                  <div className="py-4 text-center text-xs text-pretty-wine-800/80">
                    Consultando turnos libres con el equipo...
                  </div>
                ) : availableSlots.length === 0 ? (
                  <div className="py-4 text-center text-xs text-pretty-wine-800/80 bg-white/50 rounded-2xl border border-white">
                    No hay franjas libres para este día o la jornada está completa.
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 max-h-32 overflow-y-auto pr-1">
                    {availableSlots.map((slot) => (
                      <button
                        key={slot.startTime}
                        disabled={!slot.available}
                        type="button"
                        onClick={() => setSelectedSlot(slot)}
                        className={`py-1.5 px-1 text-center rounded-xl text-xs font-semibold transition-all ${
                          !slot.available
                            ? 'opacity-30 cursor-not-allowed bg-gray-100 text-gray-500'
                            : selectedSlot?.startTime === slot.startTime
                            ? 'bg-pretty-wine-900 text-white shadow-sm scale-105'
                            : 'bg-white hover:bg-pretty-pink-50 text-pretty-wine-900 border border-pretty-pink-200/60'
                        }`}
                      >
                        {slot.localStartTime}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PASO 4: Datos de Contacto */}
          {step === 4 && (
            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-pretty-wine-900 mb-1 flex items-center space-x-1.5">
                  <User className="w-3.5 h-3.5 text-pretty-pink-500" />
                  <span>Tu nombre completo:</span>
                  <span className="text-rose-600 font-bold" title="Campo obligatorio">* (Obligatorio)</span>
                </label>
                <input
                  type="text"
                  placeholder="Ej: Mariana Rodríguez"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-pretty-pink-200 bg-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-pretty-pink-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-pretty-wine-900 mb-1 flex items-center space-x-1.5">
                  <Phone className="w-3.5 h-3.5 text-pretty-pink-500" />
                  <span>Teléfono celular (WhatsApp):</span>
                  <span className="text-rose-600 font-bold" title="Campo obligatorio">* (Obligatorio)</span>
                </label>
                
                <div className="flex space-x-2">
                  <select
                    value={countryCode}
                    onChange={(e) => {
                      const newCode = e.target.value;
                      setCountryCode(newCode);
                      setClientPhone((prev) => cleanPhoneInput(prev, newCode));
                    }}
                    className="w-28 px-2 py-2.5 rounded-xl border border-pretty-pink-200 bg-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-pretty-pink-400"
                  >
                    {SUPPORTED_COUNTRY_CODES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code} ({c.country})
                      </option>
                    ))}
                  </select>

                  <input
                    type="tel"
                    inputMode="numeric"
                    placeholder={countryCode === '+506' ? '88887777 (8 dígitos)' : `${expectedDigits} dígitos`}
                    value={clientPhone}
                    onChange={(e) => {
                      setClientPhone(cleanPhoneInput(e.target.value, countryCode));
                    }}
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-pretty-pink-200 bg-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-pretty-pink-400 font-mono"
                  />
                </div>

                {numericPhone.length > 0 && numericPhone.length < expectedDigits && (
                  <span className="text-[11px] text-amber-700 mt-1 block">
                    Faltan {expectedDigits - numericPhone.length} dígitos ({selectedCountry.country} requiere {expectedDigits} dígitos numéricos).
                  </span>
                )}
                {isPhoneValid && (
                  <span className="text-[11px] text-emerald-700 mt-1 flex items-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                    <span>Número telefónico válido ({countryCode} {numericPhone}).</span>
                  </span>
                )}
                {!isPhoneValid && numericPhone.length === 0 && (
                  <span className="text-[10px] text-pretty-wine-700/70 mt-1 block">
                    {countryCode === '+506'
                      ? 'Predeterminado Costa Rica (+506). Te contactaremos aquí para la confirmación.'
                      : `Ingresa los ${expectedDigits} dígitos del número celular sin el código de país.`}
                  </span>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-pretty-wine-900 mb-1 flex items-center space-x-1.5">
                  <FileText className="w-3.5 h-3.5 text-pretty-pink-500" />
                  <span>Notas adicionales (Opcional):</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="¿Algún detalle que debamos saber sobre tu piel, uñas o evento?"
                  value={clientNotes}
                  onChange={(e) => setClientNotes(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-pretty-pink-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-pretty-pink-400"
                />
              </div>

              <div className="pt-1 flex items-start space-x-2.5">
                <input
                  type="checkbox"
                  id="policy"
                  checked={acceptPolicy}
                  onChange={(e) => setAcceptPolicy(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-pretty-pink-300 text-pretty-pink-600 focus:ring-pretty-pink-400"
                />
                <label htmlFor="policy" className="text-xs text-pretty-wine-800/80 leading-relaxed cursor-pointer">
                  Acepto el uso de mis datos exclusivamente para la gestión y confirmación de mi cita en Caño Negro Pretty.
                </label>
              </div>
            </div>
          )}

          {/* PASO 5: Resumen y Confirmación */}
          {step === 5 && (
            <div className="space-y-3.5">
              <div className="p-3.5 rounded-2xl bg-white/70 border border-white/90 space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-pretty-pink-100">
                  <span className="text-pretty-wine-700/80">Servicio / Paquete:</span>
                  <span className="font-semibold text-pretty-wine-900">{selectedService?.name || selectedPackage?.name}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-pretty-pink-100 items-center">
                  <span className="text-pretty-wine-700/80">Especialista:</span>
                  <span className="font-semibold text-pretty-wine-900 flex items-center space-x-1.5">
                    <span>Asignada por recepción al confirmar</span>
                    <span className="text-[10px] bg-pretty-pink-200/80 text-pretty-wine-900 font-bold px-2 py-0.5 rounded-full">
                      Bandeja general
                    </span>
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-pretty-pink-100">
                  <span className="text-pretty-wine-700/80">Modalidad:</span>
                  <span className="font-semibold text-pretty-wine-900">
                    {modality === 'HOME_VISIT' ? `A domicilio (${selectedLocation?.name})` : 'En estación de trabajo'}
                  </span>
                </div>
                {modality === 'HOME_VISIT' && customAddress && (
                  <div className="flex justify-between py-1 border-b border-pretty-pink-100">
                    <span className="text-pretty-wine-700/80">Señas:</span>
                    <span className="font-medium text-pretty-wine-900 text-right">{customAddress}</span>
                  </div>
                )}
                <div className="flex justify-between py-1 border-b border-pretty-pink-100">
                  <span className="text-pretty-wine-700/80">Fecha y Hora:</span>
                  <span className="font-semibold text-pretty-wine-900">{selectedDate} a las {selectedSlot?.localStartTime}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-pretty-pink-100">
                  <span className="text-pretty-wine-700/80">Teléfono:</span>
                  <span className="font-semibold text-pretty-wine-900">{countryCode} {numericPhone}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-pretty-pink-100">
                  <span className="text-pretty-wine-700/80">Precio Base:</span>
                  <span className="text-pretty-wine-900">{formatCRC(basePrice)}</span>
                </div>
                {modality === 'HOME_VISIT' && locationFeeCRC > 0 && (
                  <div className="flex justify-between py-1 border-b border-pretty-pink-100 text-pretty-wine-900">
                    <span className="text-pretty-wine-700/80">Tarifa Traslado ({selectedLocation?.name}):</span>
                    <span className="font-semibold">+ {formatCRC(locationFeeCRC)}</span>
                  </div>
                )}
                {discountCRC > 0 && (
                  <div className="flex justify-between py-1 border-b border-pretty-pink-100 text-pretty-pink-600 font-semibold">
                    <span>Descuento por Localidad:</span>
                    <span>- {formatCRC(discountCRC)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 text-sm font-bold text-pretty-wine-900">
                  <span>Total estimado a cancelar:</span>
                  <span className="font-serif text-base sm:text-lg">{formatCRC(totalPrice)}</span>
                </div>
              </div>

              {submitError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}
            </div>
          )}

          {/* PASO 6: Éxito */}
          {step === 6 && submittedBooking && (
            <div className="text-center py-4 space-y-3">
              <div className="w-14 h-14 mx-auto rounded-full bg-pretty-pink-100 flex items-center justify-center text-pretty-wine-900">
                <CheckCircle2 className="w-8 h-8 text-pretty-pink-600" />
              </div>

              <h4 className="font-serif text-xl font-bold text-pretty-wine-900">
                Solicitud recibida; pendiente de confirmación
              </h4>

              <div className="inline-block px-3.5 py-1.5 rounded-xl bg-white/80 border border-pretty-pink-200 text-xs font-mono font-bold text-pretty-wine-900">
                Referencia: {submittedBooking.referenceCode}
              </div>

              <p className="text-xs text-pretty-wine-800/80 max-w-sm mx-auto leading-relaxed">
                Hemos registrado tu solicitud para el <strong>{selectedDate} a las {selectedSlot?.localStartTime}</strong>. El equipo revisará el espacio en agenda, asignará la especialista y te contactará por WhatsApp para la confirmación formal.
              </p>

              <button
                onClick={() => {
                  onClose();
                  setStep(1);
                  setSubmittedBooking(null);
                }}
                className="mt-3 px-6 py-2 rounded-full text-xs font-bold text-white bg-pretty-wine-900 hover:bg-pretty-pink-600 transition-all shadow-sm"
              >
                Entendido, gracias
              </button>
            </div>
          )}

        </div>

        {/* Botones de navegación del Wizard */}
        {step < 6 && (
          <div className="mt-4 pt-3 border-t border-pretty-pink-200/50 flex items-center justify-between flex-shrink-0">
            {step > 1 ? (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-full text-xs font-semibold text-pretty-wine-800 hover:bg-white/70 transition-all"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Anterior</span>
              </button>
            ) : <div />}

            {step < 5 ? (
              <button
                disabled={
                  (step === 1 && !selectedService && !selectedPackage) ||
                  (step === 2 && modality === 'HOME_VISIT' && (!selectedLocationId || customAddress.trim().length < 5)) ||
                  (step === 3 && !selectedSlot) ||
                  (step === 4 && (clientName.trim().length < 2 || !isPhoneValid || !acceptPolicy))
                }
                onClick={() => setStep((s) => s + 1)}
                className="inline-flex items-center space-x-1.5 px-5 py-2 rounded-full text-xs font-bold text-white bg-pretty-wine-900 hover:bg-pretty-pink-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                <span>Siguiente</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                disabled={submitting}
                onClick={handleSubmitBooking}
                className="inline-flex items-center space-x-1.5 px-5 py-2 rounded-full text-xs font-bold text-white bg-gradient-to-r from-pretty-wine-900 to-pretty-pink-600 hover:opacity-95 disabled:opacity-50 transition-all shadow-sm"
              >
                <Sparkles className="w-4 h-4" />
                <span>{submitting ? 'Enviando solicitud...' : 'Enviar Solicitud'}</span>
              </button>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
