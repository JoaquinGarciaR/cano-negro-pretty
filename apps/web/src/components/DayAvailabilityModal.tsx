'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
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
  ChevronDown,
  Search
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
  // ==========================================
  // TODOS LOS HOOKS DECLARADOS AL INICIO (REGLA DE ORO DE REACT)
  // ==========================================
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

  // Dropdown de Esteticistas
  const [isProfDropdownOpen, setIsProfDropdownOpen] = useState<boolean>(false);
  const [profSearchQuery, setProfSearchQuery] = useState<string>('');
  const profDropdownRef = useRef<HTMLDivElement>(null);

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
      setIsProfDropdownOpen(false);
      setProfSearchQuery('');
      
      // Inicializar fechas de batch por defecto a +30 días
      const today = new Date();
      const in30 = new Date();
      in30.setDate(in30.getDate() + 30);
      setBatchStartDate(today.toISOString().split('T')[0]);
      setBatchEndDate(in30.toISOString().split('T')[0]);
      setActivePreset('30');
    }
  }, [isOpen, initialDate, initialMode, professionalId]);

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

  // Lista de profesionales objetivo para la operación
  const targetProfIds = useMemo(() => {
    return selectedProfId === 'all'
      ? professionals.map((p) => p.id)
      : [selectedProfId];
  }, [selectedProfId, professionals]);

  // Información visual de la esteticista seleccionada
  const targetProfInfo = useMemo(() => {
    if (selectedProfId === 'all') {
      return {
        name: 'Todas las esteticistas',
        subtitle: 'Apertura general para todo el equipo del salón',
        badge: 'Salón Completo',
        isAll: true,
        initials: 'CN'
      };
    }
    const found = professionals.find((p) => p.id === selectedProfId);
    return {
      name: found ? found.name : 'Esteticista seleccionada',
      subtitle: found ? `Apertura exclusiva para ${found.name} (${found.title || 'Especialista'})` : 'Apertura individual',
      badge: 'Individual',
      isAll: false,
      initials: found ? found.name.slice(0, 2).toUpperCase() : 'ES'
    };
  }, [selectedProfId, professionals]);

  // Profesionales filtrados por la barra de búsqueda dentro del dropdown
  const filteredProfessionals = useMemo(() => {
    if (!profSearchQuery.trim()) return professionals;
    const q = profSearchQuery.toLowerCase().trim();
    return professionals.filter(
      (p) => p.name.toLowerCase().includes(q) || (p.title || '').toLowerCase().includes(q)
    );
  }, [professionals, profSearchQuery]);

  const presetLabels: Record<string, string> = {
    '30': '+1 Mes (30 días)',
    '60': '+2 Meses (60 días)',
    'dic2026': 'Todo Diciembre 2026',
    'ene2027': 'Todo Enero 2027',
    'custom': 'Rango Personalizado'
  };

  // ==========================================
  // RETORNO TEMPRANO SOLO DESPUÉS DE TODOS LOS HOOKS
  // ==========================================
  if (!isOpen) return null;

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

      setSuccessMsg(`Fecha ${date} desbloqueada exitosamente para ${targetProfInfo.name}`);
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

      setSuccessMsg(`Fecha ${date} bloqueada para ${targetProfInfo.name}`);
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
      setSuccessMsg(`¡Agenda habilitada con éxito! (${totalCount} jornadas desbloqueadas del ${start} al ${end} para ${targetProfInfo.name})`);
      
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

        {/* ========================================================================= */}
        {/* DROPDOWN INTERACTIVO PARA SELECCIONAR ESTETICISTA */}
        {/* ========================================================================= */}
        {professionals.length > 0 && (
          <div className="mb-4" ref={profDropdownRef}>
            <label className="block text-xs font-bold text-pretty-wine-900 mb-1.5 flex items-center justify-between">
              <span className="flex items-center space-x-1.5">
                <User className="w-3.5 h-3.5 text-pretty-pink-500" />
                <span>Aplicar apertura para:</span>
              </span>
              <span className="text-[10px] text-pretty-wine-600 font-normal">
                Toca para seleccionar
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
                    : targetProfInfo.isAll
                    ? 'bg-white/90 border-pretty-pink-200 hover:bg-white'
                    : 'bg-white/90 border-pretty-wine-300 hover:bg-white'
                }`}
              >
                <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                    targetProfInfo.isAll
                      ? 'bg-pretty-pink-100 text-pretty-wine-900'
                      : 'bg-pretty-wine-900 text-white'
                  }`}>
                    {targetProfInfo.isAll ? (
                      <Users className="w-4 h-4 text-pretty-pink-600" />
                    ) : (
                      <span>{targetProfInfo.initials || 'ES'}</span>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-xs text-pretty-wine-950 truncate">
                        {targetProfInfo.name}
                      </span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase tracking-wider ${
                        targetProfInfo.isAll
                          ? 'bg-pretty-pink-100 text-pretty-wine-800'
                          : 'bg-pretty-wine-100 text-pretty-wine-900 border border-pretty-wine-300'
                      }`}>
                        {targetProfInfo.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-pretty-wine-700/80 truncate mt-0.2">
                      {targetProfInfo.subtitle}
                    </p>
                  </div>
                </div>

                <ChevronDown
                  className={`w-4 h-4 text-pretty-wine-700 flex-shrink-0 transition-transform duration-200 ${
                    isProfDropdownOpen ? 'rotate-180 text-pretty-wine-950' : ''
                  }`}
                />
              </button>

              {/* Popover / Menú Desplegable */}
              {isProfDropdownOpen && (
                <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl p-2.5 shadow-2xl border border-pretty-pink-200 z-50 animate-fade-in space-y-2">
                  {/* Buscador dentro del dropdown si hay más de 2 */}
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

                  <div className="max-h-52 overflow-y-auto space-y-1.5 pr-0.5">
                    {/* OPCIÓN: TODAS LAS ESTETICISTAS */}
                    {!profSearchQuery && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedProfId('all');
                          setIsProfDropdownOpen(false);
                          setProfSearchQuery('');
                        }}
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
                                Todas las esteticistas
                              </span>
                              <span className={`text-[9px] font-semibold px-1.5 py-0.2 rounded-full ${
                                selectedProfId === 'all' ? 'bg-white/20 text-white' : 'bg-pretty-pink-100 text-pretty-wine-800'
                              }`}>
                                Salón completo
                              </span>
                            </div>
                            <p className={`text-[10px] truncate ${
                              selectedProfId === 'all' ? 'text-white/80' : 'text-pretty-wine-600'
                            }`}>
                              Abre la jornada para todo el equipo en paralelo
                            </p>
                          </div>
                        </div>
                        {selectedProfId === 'all' && (
                          <Check className="w-4 h-4 text-pretty-pink-300 flex-shrink-0 ml-2" />
                        )}
                      </button>
                    )}

                    {/* OPCIONES POR ESTETICISTA */}
                    {filteredProfessionals.map((p) => {
                      const isSelected = selectedProfId === p.id;
                      return (
                        <button
                          type="button"
                          key={p.id}
                          onClick={() => {
                            setSelectedProfId(p.id);
                            setIsProfDropdownOpen(false);
                            setProfSearchQuery('');
                          }}
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
                                  isSelected ? 'bg-white/20 text-white' : 'bg-pretty-wine-100 text-pretty-wine-900'
                                }`}>
                                  Individual
                                </span>
                              </div>
                              <p className={`text-[10px] truncate ${
                                isSelected ? 'text-white/80' : 'text-pretty-wine-600'
                              }`}>
                                {p.title || 'Especialista'} · Abre jornada solo para {p.name}
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
              )}
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
                className="inline-flex items-center space-x-1 px-5 py-2 rounded-full text-xs font-bold text-white bg-pretty-wine-900 hover:bg-pretty-pink-600 shadow-sm transition-all active:scale-95 disabled:opacity-50"
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
                    Del <strong>{batchStartDate}</strong> al <strong>{batchEndDate}</strong> para: <strong>{targetProfInfo.name}</strong>
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
