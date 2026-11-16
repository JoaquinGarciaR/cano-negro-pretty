'use client';

import { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Plus,
  Edit2,
  Trash2,
  Check,
  CheckCircle2,
  AlertCircle,
  Clock,
  Tag,
  DollarSign,
  Image as ImageIcon,
  Users,
  Search,
  Power
} from 'lucide-react';
import {
  fetchAdminServicesApi,
  createAdminServiceApi,
  updateAdminServiceApi,
  toggleAdminServiceApi,
  deleteAdminServiceApi
} from '../lib/api';
import { formatCRC } from '@cano/shared';

interface AdminServicesModalProps {
  isOpen: boolean;
  onClose: () => void;
  token?: string;
  catalog: any;
  onServicesUpdated?: () => void;
}

const CATEGORIES = ['Uñas', 'Pestañas', 'Peinados', 'Cuidado Facial', 'Maquillaje'];

export function AdminServicesModal({
  isOpen,
  onClose,
  token,
  catalog,
  onServicesUpdated
}: AdminServicesModalProps) {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // Modo edición / creación
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('Uñas');
  const [formDescription, setFormDescription] = useState('');
  const [formPriceCRC, setFormPriceCRC] = useState('15000');
  const [formDurationMinutes, setFormDurationMinutes] = useState('60');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formProfessionalIds, setFormProfessionalIds] = useState<string[]>([]);
  const [formSaving, setFormSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadServices();
    }
  }, [isOpen]);

  async function loadServices() {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAdminServicesApi(token);
      setServices(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar servicios');
    } finally {
      setLoading(false);
    }
  }

  function handleOpenCreate() {
    setEditingId(null);
    setFormName('');
    setFormCategory('Uñas');
    setFormDescription('');
    setFormPriceCRC('15000');
    setFormDurationMinutes('60');
    setFormImageUrl('https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=600&q=80');
    const allProfs = catalog?.professionals?.map((p: any) => p.id) || [];
    setFormProfessionalIds(allProfs);
    setIsEditing(true);
    setError(null);
    setSuccess(null);
  }

  function handleOpenEdit(srv: any) {
    setEditingId(srv.id);
    setFormName(srv.name);
    setFormCategory(srv.category);
    setFormDescription(srv.description || '');
    setFormPriceCRC(srv.priceCRC.toString());
    setFormDurationMinutes((srv.durationBlocks * 15).toString());
    setFormImageUrl(srv.imageUrl || '');
    const assigned = srv.professionals?.map((p: any) => p.professionalId || p.id) || [];
    setFormProfessionalIds(assigned);
    setIsEditing(true);
    setError(null);
    setSuccess(null);
  }

  async function handleSaveForm(e: React.FormEvent) {
    e.preventDefault();
    if (!formName.trim()) {
      setError('El nombre del servicio es obligatorio');
      return;
    }
    const price = parseInt(formPriceCRC, 10);
    if (isNaN(price) || price < 0) {
      setError('El precio debe ser un número válido');
      return;
    }
    const mins = parseInt(formDurationMinutes, 10);
    const durationBlocks = Math.max(1, Math.round(mins / 15));

    setFormSaving(true);
    setError(null);
    try {
      const payload = {
        name: formName.trim(),
        category: formCategory.trim(),
        description: formDescription.trim(),
        priceCRC: price,
        durationBlocks,
        imageUrl: formImageUrl.trim() || undefined,
        professionalIds: formProfessionalIds
      };

      if (editingId) {
        await updateAdminServiceApi(editingId, payload, token);
        setSuccess('Servicio actualizado exitosamente');
      } else {
        await createAdminServiceApi(payload, token);
        setSuccess('Servicio creado exitosamente');
      }

      setIsEditing(false);
      await loadServices();
      if (onServicesUpdated) onServicesUpdated();
    } catch (err: any) {
      setError(err.message || 'Error al guardar el servicio');
    } finally {
      setFormSaving(false);
    }
  }

  async function handleToggleActive(id: string) {
    try {
      await toggleAdminServiceApi(id, token);
      await loadServices();
      if (onServicesUpdated) onServicesUpdated();
    } catch (err: any) {
      setError(err.message || 'Error al cambiar estado');
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('¿Segura que deseas eliminar este servicio del catálogo?')) return;
    try {
      await deleteAdminServiceApi(id, token);
      await loadServices();
      if (onServicesUpdated) onServicesUpdated();
    } catch (err: any) {
      setError(err.message || 'Error al eliminar servicio');
    }
  }

  const filteredServices = services.filter((s) => {
    const matchesCat = selectedCategory === 'ALL' || s.category === selectedCategory;
    const matchesSearch = !searchQuery || s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-pretty-wine-950/40 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl glass-panel rounded-3xl p-5 sm:p-7 shadow-2xl border border-white/80 my-auto text-pretty-wine-900 max-h-[90vh] flex flex-col">
        
        {/* Botón Cerrar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/70 hover:bg-white text-pretty-wine-800 transition-colors shadow-sm"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Encabezado */}
        <div className="flex items-center justify-between pb-4 border-b border-pretty-pink-200/50 pr-8">
          <div>
            <div className="flex items-center space-x-1.5 text-xs font-semibold text-pretty-pink-600 uppercase tracking-wider mb-1">
              <Tag className="w-3.5 h-3.5" />
              <span>Gestión de Catálogo</span>
            </div>
            <h3 className="font-serif text-xl sm:text-2xl font-bold text-pretty-wine-900">
              Servicios del Salón
            </h3>
          </div>

          {!isEditing && (
            <button
              onClick={handleOpenCreate}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-pretty-wine-900 hover:bg-pretty-pink-600 transition-all shadow-sm flex items-center space-x-1"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Servicio</span>
            </button>
          )}
        </div>

        {error && (
          <div className="mt-3 p-3 rounded-2xl bg-red-50/90 border border-red-200 flex items-center space-x-2 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mt-3 p-3 rounded-2xl bg-emerald-50/90 border border-emerald-200 flex items-center space-x-2 text-xs text-emerald-800">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* CONTENIDO: Formulario o Lista */}
        {isEditing ? (
          <form onSubmit={handleSaveForm} className="mt-4 space-y-4 overflow-y-auto pr-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-pretty-wine-800 mb-1">
                  Nombre del Servicio:
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ej: Manicura Rusa Combinada"
                  required
                  className="w-full h-10 px-3 rounded-xl border border-pretty-pink-200 bg-white text-xs font-medium focus:ring-1 focus:ring-pretty-pink-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-pretty-wine-800 mb-1">
                  Categoría:
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-pretty-pink-200 bg-white text-xs font-medium focus:ring-1 focus:ring-pretty-pink-400 focus:outline-none"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-pretty-wine-800 mb-1">
                  Precio (₡ CRC):
                </label>
                <input
                  type="number"
                  value={formPriceCRC}
                  onChange={(e) => setFormPriceCRC(e.target.value)}
                  min="0"
                  step="500"
                  required
                  className="w-full h-10 px-3 rounded-xl border border-pretty-pink-200 bg-white text-xs font-medium focus:ring-1 focus:ring-pretty-pink-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-pretty-wine-800 mb-1">
                  Duración (Minutos):
                </label>
                <select
                  value={formDurationMinutes}
                  onChange={(e) => setFormDurationMinutes(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-pretty-pink-200 bg-white text-xs font-medium focus:ring-1 focus:ring-pretty-pink-400 focus:outline-none"
                >
                  <option value="30">30 minutos (2 bloques)</option>
                  <option value="45">45 minutos (3 bloques)</option>
                  <option value="60">60 minutos (1 hora)</option>
                  <option value="75">75 minutos (1h 15m)</option>
                  <option value="90">90 minutos (1h 30m)</option>
                  <option value="120">120 minutos (2 horas)</option>
                  <option value="150">150 minutos (2h 30m)</option>
                  <option value="180">180 minutos (3 horas)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-pretty-wine-800 mb-1">
                Descripción detallada:
              </label>
              <textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={2}
                placeholder="Beneficios, materiales o recomendaciones..."
                className="w-full px-3 py-2 rounded-xl border border-pretty-pink-200 bg-white text-xs font-medium focus:ring-1 focus:ring-pretty-pink-400 focus:outline-none resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-pretty-wine-800 mb-1">
                URL de Imagen / Foto:
              </label>
              <input
                type="url"
                value={formImageUrl}
                onChange={(e) => setFormImageUrl(e.target.value)}
                placeholder="https://..."
                className="w-full h-10 px-3 rounded-xl border border-pretty-pink-200 bg-white text-xs font-medium focus:ring-1 focus:ring-pretty-pink-400 focus:outline-none"
              />
            </div>

            {/* Esteticistas que realizan este servicio */}
            <div>
              <label className="block text-xs font-semibold text-pretty-wine-800 mb-1.5">
                Especialistas asignadas a este servicio:
              </label>
              <div className="flex flex-wrap gap-2">
                {catalog?.professionals?.map((prof: any) => {
                  const isAssigned = formProfessionalIds.includes(prof.id);
                  return (
                    <button
                      type="button"
                      key={prof.id}
                      onClick={() => {
                        if (isAssigned) {
                          setFormProfessionalIds(formProfessionalIds.filter((id) => id !== prof.id));
                        } else {
                          setFormProfessionalIds([...formProfessionalIds, prof.id]);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center space-x-1.5 border ${
                        isAssigned
                          ? 'bg-pretty-wine-900 text-white border-pretty-wine-900 shadow-sm'
                          : 'bg-white/80 text-pretty-wine-800 border-pretty-pink-200 hover:bg-white'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-pretty-pink-400"></span>
                      <span>{prof.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Botones de acción del formulario */}
            <div className="pt-3 flex items-center justify-end space-x-2 border-t border-pretty-pink-200/50">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-pretty-wine-800 hover:bg-white/60 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={formSaving}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-pretty-wine-900 hover:bg-pretty-pink-600 transition-all shadow-md disabled:opacity-50"
              >
                {formSaving ? 'Guardando...' : (editingId ? 'Actualizar Servicio' : 'Crear Servicio')}
              </button>
            </div>
          </form>
        ) : (
          <div className="mt-3 flex-1 flex flex-col min-h-0">
            {/* Barra de Búsqueda y Filtro de Categoría */}
            <div className="flex flex-col sm:flex-row gap-2 mb-3">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-pretty-wine-600/60" />
                <input
                  type="text"
                  placeholder="Buscar servicio..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-9 pl-9 pr-3 rounded-xl border border-pretty-pink-200 bg-white text-xs font-medium focus:ring-1 focus:ring-pretty-pink-400 focus:outline-none"
                />
              </div>

              <div className="flex items-center space-x-1 overflow-x-auto pb-1 sm:pb-0">
                <button
                  type="button"
                  onClick={() => setSelectedCategory('ALL')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    selectedCategory === 'ALL'
                      ? 'bg-pretty-wine-900 text-white'
                      : 'bg-white/70 text-pretty-wine-800 hover:bg-white'
                  }`}
                >
                  Todas
                </button>
                {CATEGORIES.map((cat) => (
                  <button
                    type="button"
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                      selectedCategory === cat
                        ? 'bg-pretty-wine-900 text-white'
                        : 'bg-white/70 text-pretty-wine-800 hover:bg-white'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Listado de Servicios */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {loading ? (
                <div className="py-12 text-center text-xs text-pretty-wine-700/60">
                  Cargando catálogo de servicios...
                </div>
              ) : filteredServices.length === 0 ? (
                <div className="py-12 text-center text-xs text-pretty-wine-700/60">
                  No se encontraron servicios para los filtros seleccionados.
                </div>
              ) : (
                filteredServices.map((srv) => (
                  <div
                    key={srv.id}
                    className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                      srv.active
                        ? 'bg-white/80 border-white hover:bg-white shadow-sm'
                        : 'bg-pretty-pink-50/40 border-pretty-pink-200/50 opacity-60'
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <img
                        src={srv.imageUrl || 'https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=150&q=80'}
                        alt={srv.name}
                        className="w-11 h-11 rounded-xl object-cover border border-pretty-pink-200 flex-shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-xs text-pretty-wine-900 truncate">
                            {srv.name}
                          </span>
                          <span className="px-1.5 py-0.2 rounded-md text-[10px] font-semibold bg-pretty-pink-100 text-pretty-wine-800">
                            {srv.category}
                          </span>
                          {!srv.active && (
                            <span className="px-1.5 py-0.2 rounded-md text-[10px] font-semibold bg-gray-200 text-gray-700">
                              Oculto
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-3 text-[11px] text-pretty-wine-700/80 mt-0.5">
                          <span className="font-bold text-pretty-wine-900">{formatCRC(srv.priceCRC)}</span>
                          <span>•</span>
                          <span className="flex items-center space-x-0.5">
                            <Clock className="w-3 h-3 text-pretty-pink-500" />
                            <span>{srv.durationBlocks * 15} min</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Acciones */}
                    <div className="flex items-center space-x-1 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(srv.id)}
                        className={`p-1.5 rounded-lg text-xs font-semibold transition-all ${
                          srv.active
                            ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                            : 'text-gray-500 bg-gray-100 hover:bg-gray-200'
                        }`}
                        title={srv.active ? 'Desactivar del catálogo' : 'Activar en catálogo'}
                      >
                        <Power className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenEdit(srv)}
                        className="p-1.5 rounded-lg text-pretty-wine-800 bg-white/90 hover:bg-white shadow-sm border border-white"
                        title="Editar servicio"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(srv.id)}
                        className="p-1.5 rounded-lg text-red-600 bg-white/90 hover:bg-red-50 shadow-sm border border-white"
                        title="Eliminar servicio"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
