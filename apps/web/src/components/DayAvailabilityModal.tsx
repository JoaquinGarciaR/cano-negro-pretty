'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  X,
  Calendar,
  Clock,
  Lock,
  Unlock,
  AlertCircle,
  Users,
  User,
  Sparkles,
  CheckCircle2,
  Check,
  ArrowRight
} from 'lucide-react';
import { openDayApi, closeDayApi, batchOpenDaysApi } from '../lib/api';

interface DayAvailabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  professionalId?: string;
  professionalName?: string;
  professionals?: any[];
  initialDate?: string;
  initialMode?: 'single' | 'batch';
  token?: string;
  onSuccess: (targetMonthDate?: string) => void;
}

export function DayAvailabilityModal({
  isOpen,
  onClose,
  professionalId,
  professionalName,
  professionals = [],
  initialDate,
  initialMode = 'single',
  token,
  onSuccess
}: DayAvailabilityModalProps) {
  const [mode, setMode] = useState<'single' | 'batch'>(initialMode);
  const [selectedProfId, setSelectedProfId] = useState<string>(professionalId || 'all');

  // Modo single
  const [date, setDate] = useState<string>(initialDate || new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState<string>('08:00');
  const [endTime, setEndTime] = useState<string>('17:00');
  const [customNote, setCustomNote] = useState<string>('');

  // Modo batch
  const [activePreset, setActivePreset] = useState<'30' | '60' | 'dic2026' | 'ene2027' | 'custom'>('30');
  const [batchStartDate, setBatchStartDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [batchEndDate, setBatchEndDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30); // 30 días por defecto
    return d.toISOString().split('T')[0];
  });

  // Días de la semana seleccionados (0: Dom, 1: Lun, ..., 6: Sáb)
  const [selectedDaysOfWeek, setSelectedDaysOfWeek] = useState<number[]>([1, 2, 3, 4, 5, 6]);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Sincronizar estado cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setSelectedProfId(professionalId || 'all');
      if (initialDate) {
        setDate(initialDate);
      }
      setError(null);
      setSuccessMsg(null);
      
      // Inicializar fechas de batch por defecto a +30 días
      const today = new Date();
      const in30 = new Date();
      in30.setDate(in30.getDate() + 30);
      setBatchStartDate(today.toISOString().split('T')[0]);
      setBatchEndDate(in30.toISOString().split('T')[0]);
      setActivePreset('30');
    }
  }, [isOpen, initialDate, initialMode, professionalId]);

  if (!isOpen) return null;

  // Lista de profesionales objetivo para la operación
  const targetProfIds = selectedProfId === 'all'
    ? professionals.map((p) => p.id)
    : [selectedProfId];

  const targetProfLabel = useMemo(() => {
    if (selectedProfId === 'all') return 'Todas las esteticistas (Salón Completo)';
    const found = professionals.find((p) => p.id === selectedProfId);
    return found ? found.name : 'Esteticista seleccionada';
  }, [selectedProfId, professionals]);

  const presetLabels: Record<string, string> = {
    '30': '+1 Mes (30 días)',
    '60': '+2 Meses (60 días)',
    'dic2026': 'Todo Diciembre 2026',
    'ene2027': 'Todo Enero 2027',
    'custom': 'Rango Personalizado'
  };

  async function handleSaveSingle(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      if (targetProfIds.length === 0) {
        throw new Error('No se encontraron esteticistas disponibles');
      }

      await Promise.all(
        targetProfIds.map((pId) =>
          openDayApi(
            {
              professionalId: pId,
              date,
              startTime,
              endTime,
              isOpen: true,
              customNote: customNote || undefined
            },
            token
          )
        )
      );

      setSuccessMsg(`Fecha ${date} desbloqueada exitosamente`);
      setTimeout(() => {
        onSuccess(date);
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Error al habilitar fecha');
    } finally {
      setLoading(false);
    }
  }

  async function handleCloseDay() {
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      if (targetProfIds.length === 0) {
        throw new Error('No se encontraron esteticistas disponibles');
      }

      await Promise.all(
        targetProfIds.map((pId) =>
          closeDayApi({ professionalId: pId, date }, token)
        )
      );

      setSuccessMsg(`Fecha ${date} bloqueada`);
      setTimeout(() => {
        onSuccess(date);
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Error al bloquear fecha');
    } finally {
      setLoading(false);
    }
  }

  async function executeBatchOpen(startDateToUse?: string, endDateToUse?: string) {
    if (selectedDaysOfWeek.length === 0) {
      setError('Debes seleccionar al menos un día de la semana para habilitar.');
      return;
    }

    const start = startDateToUse || batchStartDate;
    const end = endDateToUse || batchEndDate;

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      if (targetProfIds.length === 0) {
        throw new Error('No se encontraron esteticistas disponibles');
      }

      const results = await Promise.all(
        targetProfIds.map((pId) =>
          batchOpenDaysApi(
            {
              professionalId: pId,
              startDate: start,
              endDate: end,
              startTime,
              endTime,
              daysOfWeek: selectedDaysOfWeek,
              customNote: customNote || undefined
            },
            token
          )
        )
      );

      const totalCount = results.reduce((acc: number, curr: any) => acc + (curr.count || 0), 0);
      setSuccessMsg(`¡Agenda habilitada con éxito! (${totalCount} jornadas desbloqueadas del ${start} al ${end})`);
      
      setTimeout(() => {
        onSuccess(start);
        onClose();
      }, 1300);
    } catch (err: any) {
      setError(err.message || 'Error al habilitar rango de fechas');
    } finally {
      setLoading(false);
    }
  }

  function handleSaveBatch(e: React.FormEvent) {
    e.preventDefault();
    executeBatchOpen();
  }

  function applyQuickPreset(days: number, key: '30' | '60') {
    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + days);
    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];

    setBatchStartDate(startStr);
    setBatchEndDate(endStr);
    setActivePreset(key);
    setError(null);
  }

  function applyMonthPreset(year: number, monthZeroIndexed: number, key: 'dic2026' | 'ene2027') {
    const start = `${year}-${String(monthZeroIndexed + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(year, monthZeroIndexed + 1, 0).getDate();
    const end = `${year}-${String(monthZeroIndexed + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    setBatchStartDate(start);
    setBatchEndDate(end);
    setActivePreset(key);
    setError(null);
  }

  function toggleDayOfWeek(d: number) {
    setSelectedDaysOfWeek((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()
    );
  }

  const daysConfig = [
    { num: 1, label: 'Lun' },
    { num: 2, label: 'Mar' },
    { num: 3, label: 'Mié' },
    { num: 4, label: 'Jue' },
    { num: 5, label: 'Vie' },
    { num: 6, label: 'Sáb' },
    { num: 0, label: 'Dom' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-pretty-wine-950/45 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg glass-panel rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/80 my-auto text-pretty-wine-900 max-h-[95vh] overflow-y-auto">
        
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
          <div className="flex items-center space-x-1.5 text-xs font-semibold text-pretty-pink-600 uppercase tracking-wider mb-1">
            <Unlock className="w-3.5 h-3.5" />
            <span>Configuración de Agenda · Caño Negro Pretty</span>
          </div>
          <h3 className="font-serif text-2xl font-bold text-pretty-wine-900">
            Apertura y Desbloqueo de Citas
          </h3>
          <p className="text-xs text-pretty-wine-800/80 mt-0.5">
            Las clientas solo podrán reservar en los días y horarios habilitados.
          </p>
        </div>

        {/* Selector de Esteticista si hay varias */}
        {professionals.length > 0 && (
          <div className="mb-4 p-3 rounded-2xl bg-pretty-pink-100/50 border border-pretty-pink-200/60">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-pretty-wine-900 flex items-center space-x-1.5">
                <User className="w-3.5 h-3.5 text-pretty-pink-500" />
                <span>Aplicar apertura para:</span>
              </label>
              <span className="text-[10px] font-semibold text-pretty-wine-700 truncate max-w-[180px]">
                {targetProfLabel}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedProfId('all')}
                className={`inline-flex items-center space-x-1 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  selectedProfId === 'all'
                    ? 'bg-pretty-wine-900 text-white border-pretty-wine-900 shadow-sm'
                    : 'bg-white hover:bg-pretty-pink-50 text-pretty-wine-900 border-pretty-pink-200'
                }`}
              >
                <Users className="w-3 h-3 text-pretty-pink-400" />
                <span>Todas las esteticistas</span>
              </button>

              {professionals.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedProfId(p.id)}
                  className={`inline-flex items-center space-x-1 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                    selectedProfId === p.id
                      ? 'bg-pretty-wine-900 text-white border-pretty-wine-900 shadow-sm'
                      : 'bg-white hover:bg-pretty-pink-50 text-pretty-wine-900 border-pretty-pink-200'
                  }`}
                >
                  <span>{p.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Selector de modo */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <button
            type="button"
            onClick={() => setMode('single')}
            className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
              mode === 'single'
                ? 'bg-pretty-wine-900 text-white border-pretty-wine-900 shadow-sm'
                : 'bg-white/80 text-pretty-wine-900 border-white hover:bg-white'
            }`}
          >
            Día Específico
          </button>
          <button
            type="button"
            onClick={() => setMode('batch')}
            className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
              mode === 'batch'
                ? 'bg-pretty-wine-900 text-white border-pretty-wine-900 shadow-sm'
                : 'bg-white/80 text-pretty-wine-900 border-white hover:bg-white'
            }`}
          >
            Rango de Fechas (1 mes o más)
          </button>
        </div>

        {/* Mensajes de Estado */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center space-x-2 shadow-sm animate-fade-in">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
            <span className="font-semibold">{successMsg}</span>
          </div>
        )}

        {/* CONTENIDO SEGÚN MODO */}
        {mode === 'single' ? (
          <form onSubmit={handleSaveSingle} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-pretty-wine-900 mb-1">
                Fecha a desbloquear o modificar:
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-pretty-pink-200 bg-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-pretty-pink-400"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 min-w-0">
              <div className="min-w-0">
                <label className="block text-xs font-semibold text-pretty-wine-900 mb-1">
                  Hora Inicio:
                </label>
                <input
                  type="time"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full min-w-0 px-3 py-2 rounded-xl border border-pretty-pink-200 bg-white text-xs font-medium appearance-none focus:outline-none focus:ring-2 focus:ring-pretty-pink-400"
                />
              </div>
              <div className="min-w-0">
                <label className="block text-xs font-semibold text-pretty-wine-900 mb-1">
                  Hora Fin:
                </label>
                <input
                  type="time"
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full min-w-0 px-3 py-2 rounded-xl border border-pretty-pink-200 bg-white text-xs font-medium appearance-none focus:outline-none focus:ring-2 focus:ring-pretty-pink-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-pretty-wine-900 mb-1">
                Nota de jornada (Opcional):
              </label>
              <input
                type="text"
                placeholder="Ej: Jornada especial o citas a domicilio"
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-pretty-pink-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-pretty-pink-400"
              />
            </div>

            <div className="pt-2 flex items-center justify-between gap-2 border-t border-pretty-pink-100">
              <button
                type="button"
                onClick={handleCloseDay}
                disabled={loading}
                className="inline-flex items-center space-x-1 px-3.5 py-2 rounded-full text-xs font-semibold text-rose-700 hover:bg-rose-50 border border-rose-200 transition-all"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Bloquear / Cerrar Día</span>
              </button>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center space-x-1 px-5 py-2 rounded-full text-xs font-bold text-white bg-pretty-wine-900 hover:bg-pretty-pink-600 shadow-sm transition-all active:scale-95"
              >
                <Unlock className="w-3.5 h-3.5" />
                <span>{loading ? 'Guardando...' : 'Desbloquear Día'}</span>
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSaveBatch} className="space-y-4">
            
            {/* BOTONES DE EXTENSIÓN RÁPIDA (CON ESTADO ACTIVO Y APLICACIÓN INMEDIATA) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] font-bold text-pretty-wine-800">
                  Extensión rápida de agenda:
                </label>
                <span className="text-[10px] text-pretty-pink-600 font-semibold">
                  Selecciona y aplica con un clic
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => applyQuickPreset(30, '30')}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all flex items-center space-x-1 ${
                    activePreset === '30'
                      ? 'bg-pretty-wine-900 text-white border-pretty-wine-900 shadow-sm scale-102'
                      : 'bg-white hover:bg-pretty-pink-50 border-pretty-pink-200 text-pretty-wine-900 shadow-2xs'
                  }`}
                >
                  {activePreset === '30' && <Check className="w-3 h-3 text-pretty-pink-300" />}
                  <span>+1 Mes (30 días)</span>
                </button>

                <button
                  type="button"
                  onClick={() => applyQuickPreset(60, '60')}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all flex items-center space-x-1 ${
                    activePreset === '60'
                      ? 'bg-pretty-wine-900 text-white border-pretty-wine-900 shadow-sm scale-102'
                      : 'bg-white hover:bg-pretty-pink-50 border-pretty-pink-200 text-pretty-wine-900 shadow-2xs'
                  }`}
                >
                  {activePreset === '60' && <Check className="w-3 h-3 text-pretty-pink-300" />}
                  <span>+2 Meses (60 días)</span>
                </button>

                <button
                  type="button"
                  onClick={() => applyMonthPreset(2026, 11, 'dic2026')}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all flex items-center space-x-1 ${
                    activePreset === 'dic2026'
                      ? 'bg-pretty-wine-900 text-white border-pretty-wine-900 shadow-sm scale-102'
                      : 'bg-pretty-pink-100 hover:bg-pretty-pink-200 text-pretty-wine-900 border-pretty-pink-300'
                  }`}
                >
                  {activePreset === 'dic2026' && <Check className="w-3 h-3 text-pretty-pink-300" />}
                  <span>Todo Diciembre 2026</span>
                </button>

                <button
                  type="button"
                  onClick={() => applyMonthPreset(2027, 0, 'ene2027')}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all flex items-center space-x-1 ${
                    activePreset === 'ene2027'
                      ? 'bg-pretty-wine-900 text-white border-pretty-wine-900 shadow-sm scale-102'
                      : 'bg-pretty-pink-100 hover:bg-pretty-pink-200 text-pretty-wine-900 border-pretty-pink-300'
                  }`}
                >
                  {activePreset === 'ene2027' && <Check className="w-3 h-3 text-pretty-pink-300" />}
                  <span>Todo Enero 2027</span>
                </button>
              </div>

              {/* BANNER DE ACCIÓN RÁPIDA DESTACADO */}
              <div className="mt-2.5 p-3 rounded-2xl bg-pretty-pink-50 border border-pretty-pink-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-2xs">
                <div className="min-w-0">
                  <div className="flex items-center space-x-1.5 font-bold text-xs text-pretty-wine-950">
                    <Sparkles className="w-3.5 h-3.5 text-pretty-pink-600 flex-shrink-0" />
                    <span>Rango listo: {presetLabels[activePreset] || 'Personalizado'}</span>
                  </div>
                  <p className="text-[11px] text-pretty-wine-800/80 mt-0.5">
                    Del <strong>{batchStartDate}</strong> al <strong>{batchEndDate}</strong> para: <strong>{targetProfLabel}</strong>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => executeBatchOpen()}
                  disabled={loading}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold text-white bg-pretty-wine-900 hover:bg-pretty-pink-600 transition-all shadow-sm flex items-center justify-center space-x-1.5 flex-shrink-0 disabled:opacity-50 active:scale-95"
                >
                  <Unlock className="w-3 h-3 text-pretty-pink-300" />
                  <span>{loading ? 'Habilitando...' : `Aplicar ${presetLabels[activePreset] || 'Rango'}`}</span>
                </button>
              </div>
            </div>

            {/* Fechas Desde y Hasta (Ajuste manual si se desea) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 min-w-0">
              <div className="min-w-0">
                <label className="block text-xs font-semibold text-pretty-wine-900 mb-1">
                  Desde:
                </label>
                <input
                  type="date"
                  required
                  value={batchStartDate}
                  onChange={(e) => {
                    setBatchStartDate(e.target.value);
                    setActivePreset('custom');
                  }}
                  className="w-full min-w-0 px-3 py-2 rounded-xl border border-pretty-pink-200 bg-white text-xs font-medium appearance-none focus:outline-none focus:ring-2 focus:ring-pretty-pink-400"
                />
              </div>
              <div className="min-w-0">
                <label className="block text-xs font-semibold text-pretty-wine-900 mb-1">
                  Hasta:
                </label>
                <input
                  type="date"
                  required
                  value={batchEndDate}
                  onChange={(e) => {
                    setBatchEndDate(e.target.value);
                    setActivePreset('custom');
                  }}
                  className="w-full min-w-0 px-3 py-2 rounded-xl border border-pretty-pink-200 bg-white text-xs font-medium appearance-none focus:outline-none focus:ring-2 focus:ring-pretty-pink-400"
                />
              </div>
            </div>

            {/* Horarios */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 min-w-0">
              <div className="min-w-0">
                <label className="block text-xs font-semibold text-pretty-wine-900 mb-1">
                  Hora Inicio:
                </label>
                <input
                  type="time"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full min-w-0 px-3 py-2 rounded-xl border border-pretty-pink-200 bg-white text-xs font-medium appearance-none focus:outline-none focus:ring-2 focus:ring-pretty-pink-400"
                />
              </div>
              <div className="min-w-0">
                <label className="block text-xs font-semibold text-pretty-wine-900 mb-1">
                  Hora Fin:
                </label>
                <input
                  type="time"
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full min-w-0 px-3 py-2 rounded-xl border border-pretty-pink-200 bg-white text-xs font-medium appearance-none focus:outline-none focus:ring-2 focus:ring-pretty-pink-400"
                />
              </div>
            </div>

            {/* Selector de Días de la Semana */}
            <div>
              <label className="block text-xs font-semibold text-pretty-wine-900 mb-1.5">
                Días de la semana habilitados:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {daysConfig.map((day) => {
                  const isChecked = selectedDaysOfWeek.includes(day.num);
                  return (
                    <button
                      key={day.num}
                      type="button"
                      onClick={() => toggleDayOfWeek(day.num)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                        isChecked
                          ? 'bg-pretty-wine-900 text-white border-pretty-wine-900 shadow-xs'
                          : 'bg-white text-gray-500 border-gray-200 hover:bg-pretty-pink-50'
                      }`}
                    >
                      {day.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Botones de acción del formulario inferior */}
            <div className="pt-2 flex items-center justify-end space-x-2 border-t border-pretty-pink-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-full text-xs font-semibold text-pretty-wine-800 hover:bg-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center space-x-1.5 px-6 py-2 rounded-full text-xs font-bold text-white bg-pretty-wine-900 hover:bg-pretty-pink-600 shadow-sm transition-all active:scale-95 disabled:opacity-50"
              >
                <Unlock className="w-3.5 h-3.5" />
                <span>
                  {loading
                    ? 'Habilitando...'
                    : `Habilitar ${presetLabels[activePreset] || 'Rango de Fechas'}`}
                </span>
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}
