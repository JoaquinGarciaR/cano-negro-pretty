'use client';

import { useState } from 'react';
import { X, Calendar, Clock, Lock, Unlock, AlertCircle } from 'lucide-react';
import { openDayApi, closeDayApi, batchOpenDaysApi } from '../lib/api';

interface DayAvailabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  professionalId: string;
  professionalName: string;
  initialDate?: string;
  token?: string;
  onSuccess: () => void;
}

export function DayAvailabilityModal({
  isOpen,
  onClose,
  professionalId,
  professionalName,
  initialDate,
  token,
  onSuccess
}: DayAvailabilityModalProps) {
  const [mode, setMode] = useState<'single' | 'batch'>('single');
  
  // Modo single
  const [date, setDate] = useState<string>(initialDate || new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState<string>('08:00');
  const [endTime, setEndTime] = useState<string>('17:00');
  const [customNote, setCustomNote] = useState<string>('');

  // Modo batch
  const [batchStartDate, setBatchStartDate] = useState<string>(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });
  const [batchEndDate, setBatchEndDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleSaveSingle(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await openDayApi(
        {
          professionalId,
          date,
          startTime,
          endTime,
          isOpen: true,
          customNote: customNote || undefined
        },
        token
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al habilitar fecha');
    } finally {
      setLoading(false);
    }
  }

  async function handleCloseDay() {
    setLoading(true);
    setError(null);

    try {
      await closeDayApi({ professionalId, date }, token);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al bloquear fecha');
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveBatch(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await batchOpenDaysApi(
        {
          professionalId,
          startDate: batchStartDate,
          endDate: batchEndDate,
          startTime,
          endTime,
          daysOfWeek: [1, 2, 3, 4, 5, 6], // Lunes a Sábado
          customNote: customNote || undefined
        },
        token
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al habilitar rango de fechas');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-pretty-wine-950/40 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-md glass-panel rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/80 my-auto text-pretty-wine-900">
        
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-white/70 hover:bg-white text-pretty-wine-800 transition-colors shadow-sm"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="mb-4">
          <div className="flex items-center space-x-1.5 text-xs font-semibold text-pretty-pink-600 uppercase tracking-wider mb-1">
            <Unlock className="w-3.5 h-3.5" />
            <span>Configuración de Agenda Futura</span>
          </div>
          <h3 className="font-serif text-2xl font-bold text-pretty-wine-900">
            Apertura de Citas
          </h3>
          <p className="text-xs text-pretty-wine-800/80 mt-0.5">
            Para la esteticista: <strong>{professionalName}</strong>
          </p>
        </div>

        {/* Selector de modo */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <button
            type="button"
            onClick={() => setMode('single')}
            className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
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
            className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
              mode === 'batch'
                ? 'bg-pretty-wine-900 text-white border-pretty-wine-900 shadow-sm'
                : 'bg-white/80 text-pretty-wine-900 border-white hover:bg-white'
            }`}
          >
            Rango de Fechas
          </button>
        </div>

        {mode === 'single' ? (
          <form onSubmit={handleSaveSingle} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-pretty-wine-900 mb-1">
                Fecha a desbloquear:
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-pretty-pink-200 bg-white text-xs font-medium"
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
                  className="w-full min-w-0 px-3 py-2 rounded-xl border border-pretty-pink-200 bg-white text-xs font-medium appearance-none"
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
                  className="w-full min-w-0 px-3 py-2 rounded-xl border border-pretty-pink-200 bg-white text-xs font-medium appearance-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-pretty-wine-900 mb-1">
                Nota de jornada (Opcional):
              </label>
              <input
                type="text"
                placeholder="Ej: Jornada con citas a domicilio"
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-pretty-pink-200 bg-white text-xs"
              />
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="pt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={handleCloseDay}
                disabled={loading}
                className="inline-flex items-center space-x-1 px-3 py-2 rounded-full text-xs font-semibold text-rose-700 hover:bg-rose-50 border border-rose-200"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Bloquear / Cerrar Día</span>
              </button>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center space-x-1 px-5 py-2 rounded-full text-xs font-bold text-white bg-pretty-wine-900 hover:bg-pretty-pink-600 shadow-sm"
              >
                <Unlock className="w-3.5 h-3.5" />
                <span>{loading ? 'Guardando...' : 'Desbloquear Día'}</span>
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSaveBatch} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 min-w-0">
              <div className="min-w-0">
                <label className="block text-xs font-semibold text-pretty-wine-900 mb-1">
                  Desde:
                </label>
                <input
                  type="date"
                  required
                  value={batchStartDate}
                  onChange={(e) => setBatchStartDate(e.target.value)}
                  className="w-full min-w-0 px-3 py-2 rounded-xl border border-pretty-pink-200 bg-white text-xs font-medium appearance-none"
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
                  onChange={(e) => setBatchEndDate(e.target.value)}
                  className="w-full min-w-0 px-3 py-2 rounded-xl border border-pretty-pink-200 bg-white text-xs font-medium appearance-none"
                />
              </div>
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
                  className="w-full min-w-0 px-3 py-2 rounded-xl border border-pretty-pink-200 bg-white text-xs font-medium appearance-none"
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
                  className="w-full min-w-0 px-3 py-2 rounded-xl border border-pretty-pink-200 bg-white text-xs font-medium appearance-none"
                />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-pretty-pink-50/70 border border-pretty-pink-200/60 text-[11px] text-pretty-wine-800">
              Desbloqueará automáticamente los días de <strong>Lunes a Sábado</strong> en el rango seleccionado para recibir solicitudes.
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center space-x-2">
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
                disabled={loading}
                className="px-5 py-2 rounded-full text-xs font-bold text-white bg-pretty-wine-900 hover:bg-pretty-pink-600 shadow-sm"
              >
                {loading ? 'Habilitando...' : 'Habilitar Rango'}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}
