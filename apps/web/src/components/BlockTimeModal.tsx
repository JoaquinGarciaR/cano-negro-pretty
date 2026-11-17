'use client';

import { useState } from 'react';
import { X, Clock, Calendar, AlertCircle } from 'lucide-react';
import { createTimeBlockApi } from '../lib/api';

interface BlockTimeModalProps {
  isOpen: boolean;
  onClose: () => void;
  professionals: any[];
  token?: string;
  onSuccess: () => void;
}

export function BlockTimeModal({ isOpen, onClose, professionals, token, onSuccess }: BlockTimeModalProps) {
  const [professionalId, setProfessionalId] = useState<string>(professionals[0]?.id || '');
  const [title, setTitle] = useState<string>('Descanso / Almuerzo');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [startHour, setStartHour] = useState<string>('12:00');
  const [endHour, setEndHour] = useState<string>('13:00');
  const [isBreak, setIsBreak] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleCreateBlock(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const [year, month, day] = date.split('-').map(Number);
      const [sh, sm] = startHour.split(':').map(Number);
      const [eh, em] = endHour.split(':').map(Number);

      // Convertir a UTC sumando 6 horas (offset de Costa Rica)
      const startTime = new Date(Date.UTC(year, month - 1, day, sh + 6, sm, 0)).toISOString();
      const endTime = new Date(Date.UTC(year, month - 1, day, eh + 6, em, 0)).toISOString();

      await createTimeBlockApi(
        {
          professionalId,
          title,
          startTime,
          endTime,
          isBreak
        },
        token
      );

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al guardar bloqueo');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-pretty-wine-950/40 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-md glass-panel rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/80 my-auto text-pretty-wine-900">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 sm:top-5 sm:right-5 p-2 rounded-full bg-white/80 hover:bg-white text-pretty-wine-800 transition-colors shadow-sm z-10"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="mb-4 pr-10 sm:pr-12">
          <div className="flex items-center space-x-1.5 text-xs font-semibold text-pretty-pink-600 uppercase tracking-wider mb-1 truncate">
            <Clock className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">Gestión de Agenda · Caño Negro Pretty</span>
          </div>
          <h3 className="font-serif text-xl sm:text-2xl font-bold text-pretty-wine-900 leading-snug">
            Bloquear Tiempo o Descanso
          </h3>
        </div>

        <form onSubmit={handleCreateBlock} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-pretty-wine-900 mb-1">
              Esteticista:
            </label>
            <select
              value={professionalId}
              onChange={(e) => setProfessionalId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-pretty-pink-200 bg-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-pretty-pink-400"
            >
              {professionals.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-pretty-wine-900 mb-1">
              Motivo o Título:
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Almuerzo, Trámite personal, Vacaciones"
              className="w-full px-3 py-2 rounded-xl border border-pretty-pink-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-pretty-pink-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-pretty-wine-900 mb-1">
              Fecha:
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full min-w-0 px-3 py-2 rounded-xl border border-pretty-pink-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-pretty-pink-400 appearance-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 min-w-0">
            <div className="min-w-0">
              <label className="block text-xs font-semibold text-pretty-wine-900 mb-1">
                Hora de Inicio:
              </label>
              <input
                type="time"
                value={startHour}
                onChange={(e) => setStartHour(e.target.value)}
                className="w-full min-w-0 px-3 py-2 rounded-xl border border-pretty-pink-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-pretty-pink-400 appearance-none"
              />
            </div>
            <div className="min-w-0">
              <label className="block text-xs font-semibold text-pretty-wine-900 mb-1">
                Hora de Fin:
              </label>
              <input
                type="time"
                value={endHour}
                onChange={(e) => setEndHour(e.target.value)}
                className="w-full min-w-0 px-3 py-2 rounded-xl border border-pretty-pink-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-pretty-pink-400 appearance-none"
              />
            </div>
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
              className="px-4 py-2 rounded-full text-xs font-semibold text-pretty-wine-800 hover:bg-white/80"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-full text-xs font-bold text-white bg-pretty-wine-900 hover:bg-pretty-pink-600 shadow-sm"
            >
              {loading ? 'Guardando...' : 'Guardar Bloqueo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
