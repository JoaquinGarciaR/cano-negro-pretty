'use client';

import { useState, useEffect } from 'react';
import {
  X,
  MapPin,
  Plus,
  Edit2,
  Trash2,
  Check,
  CheckCircle2,
  AlertCircle,
  Search,
  DollarSign,
  Tag,
  Power
} from 'lucide-react';
import {
  fetchAdminLocationsApi,
  createAdminLocationApi,
  updateAdminLocationApi,
  toggleAdminLocationApi,
  deleteAdminLocationApi
} from '../lib/api';
import { formatCRC } from '@cano/shared';

interface AdminLocationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  token?: string;
  onLocationsUpdated?: () => void;
}

export function AdminLocationsModal({
  isOpen,
  onClose,
  token,
  onLocationsUpdated
}: AdminLocationsModalProps) {
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Modo edición / creación
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formPriceCRC, setFormPriceCRC] = useState('0');
  const [formDiscountCRC, setFormDiscountCRC] = useState('0');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadLocations();
    }
  }, [isOpen]);

  async function loadLocations() {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAdminLocationsApi(token);
      setLocations(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar ubicaciones');
    } finally {
      setLoading(false);
    }
  }

  function handleStartCreate() {
    setEditingId(null);
    setFormName('');
    setFormPriceCRC('2000');
    setFormDiscountCRC('0');
    setIsFormOpen(true);
    setError(null);
    setSuccess(null);
  }

  function handleStartEdit(loc: any) {
    setEditingId(loc.id);
    setFormName(loc.name);
    setFormPriceCRC(String(loc.priceCRC || 0));
    setFormDiscountCRC(String(loc.discountCRC || 0));
    setIsFormOpen(true);
    setError(null);
    setSuccess(null);
  }

  function handleCancelForm() {
    setIsFormOpen(false);
    setEditingId(null);
  }

  async function handleSaveLocation(e: React.FormEvent) {
    e.preventDefault();
    if (!formName.trim()) {
      setError('El nombre de la comunidad o localidad es obligatorio.');
      return;
    }

    const price = parseInt(formPriceCRC, 10);
    const discount = parseInt(formDiscountCRC, 10);
    if (isNaN(price) || price < 0) {
      setError('La tarifa de traslado debe ser un valor mayor o igual a 0.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      if (editingId) {
        await updateAdminLocationApi(
          editingId,
          {
            name: formName.trim(),
            priceCRC: price,
            discountCRC: isNaN(discount) ? 0 : discount
          },
          token
        );
        setSuccess('¡Tarifa y localidad actualizadas exitosamente!');
      } else {
        await createAdminLocationApi(
          {
            name: formName.trim(),
            priceCRC: price,
            discountCRC: isNaN(discount) ? 0 : discount,
            active: true
          },
          token
        );
        setSuccess('¡Nueva localidad agregada con éxito!');
      }

      await loadLocations();
      setIsFormOpen(false);
      setEditingId(null);
      if (onLocationsUpdated) onLocationsUpdated();
    } catch (err: any) {
      setError(err.message || 'Error al guardar localidad');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(loc: any) {
    try {
      await toggleAdminLocationApi(loc.id, token);
      await loadLocations();
      if (onLocationsUpdated) onLocationsUpdated();
    } catch (err: any) {
      setError(err.message || 'Error al alternar estado');
    }
  }

  async function handleDelete(loc: any) {
    const confirmMsg = `¿Eliminar la localidad "${loc.name}"? Si tiene citas asociadas se marcará como inactiva.`;
    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await deleteAdminLocationApi(loc.id, token);
      setSuccess(res.message || 'Localidad eliminada');
      await loadLocations();
      if (onLocationsUpdated) onLocationsUpdated();
    } catch (err: any) {
      setError(err.message || 'Error al eliminar localidad');
    }
  }

  if (!isOpen) return null;

  const filteredLocations = locations.filter((l) =>
    l.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-pretty-wine-950/40 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white/95 rounded-3xl p-5 sm:p-7 shadow-2xl border border-white/80 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-pretty-pink-100 flex-shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-2.5 rounded-2xl bg-pretty-wine-900 text-white shadow-sm">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-lg sm:text-xl font-bold text-pretty-wine-900">
                Tarifas de Domicilio & Ubicaciones
              </h3>
              <p className="text-xs text-pretty-wine-700/80">
                Configura el costo de traslado para cada comunidad en Caño Negro
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-pretty-pink-50 hover:bg-pretty-pink-100 text-pretty-wine-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notificaciones de error o éxito */}
        {error && (
          <div className="mt-3 p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center space-x-2 flex-shrink-0">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1">{error}</span>
            <button onClick={() => setError(null)}>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {success && (
          <div className="mt-3 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2 flex-shrink-0">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1">{success}</span>
            <button onClick={() => setSuccess(null)}>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Formulario de Creación / Edición */}
        {isFormOpen && (
          <form
            onSubmit={handleSaveLocation}
            className="my-3 p-4 rounded-2xl bg-pretty-pink-50/90 border border-pretty-pink-200/70 space-y-3 flex-shrink-0"
          >
            <div className="flex items-center justify-between">
              <h4 className="font-serif font-bold text-xs uppercase tracking-wider text-pretty-wine-900">
                {editingId ? 'Editar Localidad' : 'Nueva Localidad en Caño Negro'}
              </h4>
              <button
                type="button"
                onClick={handleCancelForm}
                className="text-xs text-pretty-wine-700 hover:text-pretty-wine-900"
              >
                Cancelar
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-pretty-wine-900 mb-1">
                  Comunidad / Sector:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: San Antonio, Chompipera..."
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-pretty-pink-200 bg-white text-pretty-wine-900 focus:outline-none focus:ring-2 focus:ring-pretty-pink-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-pretty-wine-900 mb-1">
                  Tarifa de Traslado (₡ CRC):
                </label>
                <input
                  type="number"
                  min="0"
                  step="500"
                  required
                  placeholder="Ej: 2000"
                  value={formPriceCRC}
                  onChange={(e) => setFormPriceCRC(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-pretty-pink-200 bg-white text-pretty-wine-900 focus:outline-none focus:ring-2 focus:ring-pretty-pink-400"
                />
                <span className="text-[10px] text-pretty-wine-700/60 block mt-0.5">
                  0 = Sin costo adicional (Traslado incluido)
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-pretty-wine-900 mb-1">
                  Descuento Especial (₡ CRC):
                </label>
                <input
                  type="number"
                  min="0"
                  step="500"
                  placeholder="0"
                  value={formDiscountCRC}
                  onChange={(e) => setFormDiscountCRC(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-pretty-pink-200 bg-white text-pretty-wine-900 focus:outline-none focus:ring-2 focus:ring-pretty-pink-400"
                />
                <span className="text-[10px] text-pretty-wine-700/60 block mt-0.5">
                  Opcional (bonificación o promo)
                </span>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-1">
              <button
                type="button"
                onClick={handleCancelForm}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-pretty-wine-800 bg-white border border-pretty-pink-200 hover:bg-pretty-pink-50"
              >
                Descartar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center space-x-1.5 px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-pretty-wine-900 hover:bg-pretty-pink-600 transition-colors shadow-sm disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{saving ? 'Guardando...' : editingId ? 'Actualizar' : 'Crear Ubicación'}</span>
              </button>
            </div>
          </form>
        )}

        {/* Barra de herramientas: Búsqueda y Botón Nueva */}
        <div className="my-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 flex-shrink-0">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-pretty-wine-700/50" />
            <input
              type="text"
              placeholder="Buscar comunidad o sector..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl text-xs border border-pretty-pink-200 bg-white text-pretty-wine-900 focus:outline-none focus:ring-2 focus:ring-pretty-pink-400"
            />
          </div>

          {!isFormOpen && (
            <button
              onClick={handleStartCreate}
              className="inline-flex items-center justify-center space-x-1 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-pretty-wine-900 hover:bg-pretty-pink-600 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Nueva Localidad</span>
            </button>
          )}
        </div>

        {/* Lista de Ubicaciones */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {loading ? (
            <div className="p-8 text-center text-xs text-pretty-wine-700/70">
              Cargando ubicaciones y tarifas...
            </div>
          ) : filteredLocations.length === 0 ? (
            <div className="p-8 text-center bg-pretty-pink-50/50 rounded-2xl border border-pretty-pink-100">
              <MapPin className="w-8 h-8 text-pretty-pink-400 mx-auto mb-2 opacity-50" />
              <p className="text-xs font-semibold text-pretty-wine-900">
                No se encontraron localidades
              </p>
              <p className="text-[11px] text-pretty-wine-700/70 mt-0.5">
                {searchQuery ? 'Prueba con otro término de búsqueda.' : 'Crea una nueva localidad para asignar tarifas.'}
              </p>
            </div>
          ) : (
            filteredLocations.map((loc) => {
              const fee = loc.priceCRC || 0;
              const discount = loc.discountCRC || 0;

              return (
                <div
                  key={loc.id}
                  className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    loc.active
                      ? 'bg-white border-pretty-pink-100 hover:border-pretty-pink-300 shadow-xs'
                      : 'bg-gray-50/80 border-gray-200 opacity-60'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="font-serif font-bold text-sm text-pretty-wine-900">
                        {loc.name}
                      </span>
                      {!loc.active && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-200 text-gray-700">
                          Inactiva
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className="inline-flex items-center space-x-1 text-xs font-semibold text-pretty-wine-900 bg-pretty-pink-50 px-2 py-0.5 rounded-md border border-pretty-pink-100">
                        <DollarSign className="w-3 h-3 text-pretty-pink-500" />
                        <span>
                          {fee > 0 ? `Traslado: ${formatCRC(fee)}` : 'Traslado Incluido (₡0)'}
                        </span>
                      </span>

                      {discount > 0 && (
                        <span className="inline-flex items-center space-x-1 text-[11px] font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                          <Tag className="w-3 h-3 text-emerald-600" />
                          <span>Descuento: -{formatCRC(discount)}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5 self-end sm:self-center flex-shrink-0">
                    <button
                      onClick={() => handleToggleActive(loc)}
                      title={loc.active ? 'Desactivar localidad' : 'Activar localidad'}
                      className={`p-2 rounded-xl text-xs font-semibold transition-colors ${
                        loc.active
                          ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      <Power className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleStartEdit(loc)}
                      title="Editar nombre y tarifa"
                      className="p-2 rounded-xl bg-pretty-pink-50 text-pretty-wine-800 hover:bg-pretty-pink-100 transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleDelete(loc)}
                      title="Eliminar localidad"
                      className="p-2 rounded-xl bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 mt-2 border-t border-pretty-pink-100 flex items-center justify-between text-xs text-pretty-wine-700/70 flex-shrink-0">
          <span>{filteredLocations.length} localidades registradas</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl font-semibold text-pretty-wine-800 bg-pretty-pink-50 hover:bg-pretty-pink-100 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
