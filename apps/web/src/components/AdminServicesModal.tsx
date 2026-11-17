'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
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
  Power,
  ChevronDown,
  Layers,
  Gift,
  ArrowRight
} from 'lucide-react';
import {
  fetchAdminServicesApi,
  createAdminServiceApi,
  updateAdminServiceApi,
  toggleAdminServiceApi,
  deleteAdminServiceApi,
  fetchAdminPackagesApi,
  createAdminPackageApi,
  updateAdminPackageApi,
  toggleAdminPackageApi,
  deleteAdminPackageApi
} from '../lib/api';
import { formatCRC } from '@cano/shared';

interface AdminServicesModalProps {
  isOpen: boolean;
  onClose: () => void;
  token?: string;
  catalog: any;
  onServicesUpdated?: () => void;
}

const CATEGORIES = [
  { id: 'unas', label: 'Uñas' },
  { id: 'pestanas', label: 'Pestañas' },
  { id: 'peinados', label: 'Peinados' },
  { id: 'facial', label: 'Cuidado Facial' },
  { id: 'maquillaje', label: 'Maquillaje' }
];

export function getCategoryLabel(catIdOrName: string): string {
  const norm = (catIdOrName || '').toLowerCase().trim();
  if (norm === 'unas' || norm === 'uñas') return 'Uñas';
  if (norm === 'pestanas' || norm === 'pestañas') return 'Pestañas';
  if (norm === 'peinados' || norm === 'peinado') return 'Peinados';
  if (norm === 'facial' || norm === 'cuidado facial') return 'Cuidado Facial';
  if (norm === 'maquillaje') return 'Maquillaje';
  return catIdOrName || 'General';
}

export function normalizeCategoryId(catIdOrName: string): string {
  const norm = (catIdOrName || '').toLowerCase().trim();
  if (norm === 'uñas') return 'unas';
  if (norm === 'pestañas') return 'pestanas';
  return norm;
}

export function AdminServicesModal({
  isOpen,
  onClose,
  token,
  catalog,
  onServicesUpdated
}: AdminServicesModalProps) {
  // Pestaña principal: 'services' | 'packages'
  const [mainTab, setMainTab] = useState<'services' | 'packages'>('services');

  // ==========================================
  // ESTADO DE SERVICIOS INDIVIDUALES
  // ==========================================
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // Dropdown de Categorías con Buscador
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent | TouchEvent) {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(e.target as Node)) {
        setIsCategoryDropdownOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setIsCategoryDropdownOpen(false);
      }
    }
    if (isCategoryDropdownOpen) {
      document.addEventListener('pointerdown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('pointerdown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isCategoryDropdownOpen]);

  // Lista de categorías únicas estructuradas (id y label)
  const allCategories = useMemo(() => {
    const map = new Map<string, string>();
    CATEGORIES.forEach((c) => map.set(c.id, c.label));
    services.forEach((s) => {
      if (s.category) {
        const id = normalizeCategoryId(s.category);
        const label = getCategoryLabel(s.category);
        if (!map.has(id)) map.set(id, label);
      }
    });
    return Array.from(map.entries()).map(([id, label]) => ({ id, label }));
  }, [services]);

  // Conteo de servicios por categoría
  const categoryCounts = useMemo(() => {
    const map = new Map<string, number>();
    services.forEach((s) => {
      const id = normalizeCategoryId(s.category || 'otros');
      map.set(id, (map.get(id) || 0) + 1);
    });
    return map;
  }, [services]);

  // Categorías filtradas por la barra de búsqueda dentro del dropdown
  const filteredCategories = useMemo(() => {
    if (!categorySearchQuery.trim()) return allCategories;
    const q = categorySearchQuery.toLowerCase().trim();
    return allCategories.filter(
      (c) => c.label.toLowerCase().includes(q) || c.id.toLowerCase().includes(q)
    );
  }, [allCategories, categorySearchQuery]);

  // Modo edición / creación servicio individual
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

  // ==========================================
  // ESTADO DE PAQUETES / SERVICIOS COMBINADOS
  // ==========================================
  const [packages, setPackages] = useState<any[]>([]);
  const [packagesLoading, setPackagesLoading] = useState(false);
  const [packageSearchQuery, setPackageSearchQuery] = useState('');

  // Modo edición / creación combo
  const [isEditingPackage, setIsEditingPackage] = useState(false);
  const [editingPackageId, setEditingPackageId] = useState<string | null>(null);
  const [pkgName, setPkgName] = useState('');
  const [pkgDescription, setPkgDescription] = useState('');
  const [pkgImageUrl, setPkgImageUrl] = useState('');
  const [pkgSelectedServiceIds, setPkgSelectedServiceIds] = useState<string[]>([]);
  const [pkgDiscountCRC, setPkgDiscountCRC] = useState<string>('0');
  const [pkgDurationMinutes, setPkgDurationMinutes] = useState<string>('60');
  const [pkgSaving, setPkgSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadServices();
      loadPackages();
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

  async function loadPackages() {
    setPackagesLoading(true);
    try {
      const data = await fetchAdminPackagesApi(token);
      setPackages(data.packages || []);
    } catch (err: any) {
      console.warn('Error al cargar paquetes:', err);
    } finally {
      setPackagesLoading(false);
    }
  }

  // Cálculos automáticos para el formulario de combo
  const pkgSelectedServicesList = useMemo(() => {
    return services.filter((s) => pkgSelectedServiceIds.includes(s.id));
  }, [services, pkgSelectedServiceIds]);

  const pkgCalculatedSumPrice = useMemo(() => {
    return pkgSelectedServicesList.reduce((sum, s) => sum + s.priceCRC, 0);
  }, [pkgSelectedServicesList]);

  const pkgCalculatedSumDuration = useMemo(() => {
    return pkgSelectedServicesList.reduce((sum, s) => sum + s.durationBlocks * 15, 0);
  }, [pkgSelectedServicesList]);

  const pkgFinalPrice = useMemo(() => {
    const disc = parseInt(pkgDiscountCRC, 10) || 0;
    return Math.max(0, pkgCalculatedSumPrice - disc);
  }, [pkgCalculatedSumPrice, pkgDiscountCRC]);

  // Manejo de Servicio Individual
  function handleOpenCreateService() {
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

  function handleOpenEditService(srv: any) {
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

  async function handleSaveServiceForm(e: React.FormEvent) {
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

  async function handleToggleActiveService(id: string) {
    try {
      await toggleAdminServiceApi(id, token);
      await loadServices();
      if (onServicesUpdated) onServicesUpdated();
    } catch (err: any) {
      setError(err.message || 'Error al cambiar estado');
    }
  }

  async function handleDeleteService(id: string) {
    if (!window.confirm('¿Segura que deseas eliminar este servicio del catálogo?')) return;
    try {
      await deleteAdminServiceApi(id, token);
      await loadServices();
      if (onServicesUpdated) onServicesUpdated();
    } catch (err: any) {
      setError(err.message || 'Error al eliminar servicio');
    }
  }

  // Manejo de Paquetes / Combos
  function handleOpenCreatePackage() {
    setEditingPackageId(null);
    setPkgName('');
    setPkgDescription('');
    setPkgImageUrl('https://images.unsplash.com/photo-1560750588-73207b1ef5b8?auto=format&fit=crop&w=600&q=80');
    // Preseleccionar 2 primeros servicios por comodidad si existen
    if (services.length >= 2) {
      setPkgSelectedServiceIds([services[0].id, services[1].id]);
      const initialDur = (services[0].durationBlocks + services[1].durationBlocks) * 15;
      setPkgDurationMinutes(initialDur.toString());
    } else {
      setPkgSelectedServiceIds([]);
      setPkgDurationMinutes('60');
    }
    setPkgDiscountCRC('2000');
    setIsEditingPackage(true);
    setError(null);
    setSuccess(null);
  }

  function handleOpenEditPackage(pkg: any) {
    setEditingPackageId(pkg.id);
    setPkgName(pkg.name);
    setPkgDescription(pkg.description || '');
    setPkgImageUrl(pkg.imageUrl || '');
    setPkgSelectedServiceIds(pkg.componentServiceIds || []);
    const discount = pkg.extraPriceCRC < 0 ? Math.abs(pkg.extraPriceCRC) : 0;
    setPkgDiscountCRC(discount.toString());
    setPkgDurationMinutes((pkg.totalDurationBlocks * 15).toString());
    setIsEditingPackage(true);
    setError(null);
    setSuccess(null);
  }

  async function handleSavePackageForm(e: React.FormEvent) {
    e.preventDefault();
    if (!pkgName.trim()) {
      setError('El nombre del servicio combinado es obligatorio');
      return;
    }
    if (pkgSelectedServiceIds.length < 2) {
      setError('Debes seleccionar al menos 2 servicios para crear un servicio combinado');
      return;
    }
    const discount = parseInt(pkgDiscountCRC, 10) || 0;
    const extraPriceCRC = -Math.abs(discount);

    const mins = parseInt(pkgDurationMinutes, 10) || pkgCalculatedSumDuration || 60;
    const totalDurationBlocks = Math.max(1, Math.round(mins / 15));

    setPkgSaving(true);
    setError(null);
    try {
      const payload = {
        name: pkgName.trim(),
        description: pkgDescription.trim(),
        imageUrl: pkgImageUrl.trim() || undefined,
        componentServiceIds: pkgSelectedServiceIds,
        extraPriceCRC,
        totalDurationBlocks
      };

      if (editingPackageId) {
        await updateAdminPackageApi(editingPackageId, payload, token);
        setSuccess('Servicio combinado actualizado exitosamente');
      } else {
        await createAdminPackageApi(payload, token);
        setSuccess('Servicio combinado creado exitosamente');
      }

      setIsEditingPackage(false);
      await loadPackages();
      if (onServicesUpdated) onServicesUpdated();
    } catch (err: any) {
      setError(err.message || 'Error al guardar el servicio combinado');
    } finally {
      setPkgSaving(false);
    }
  }

  async function handleToggleActivePackage(id: string) {
    try {
      await toggleAdminPackageApi(id, token);
      await loadPackages();
      if (onServicesUpdated) onServicesUpdated();
    } catch (err: any) {
      setError(err.message || 'Error al cambiar estado del combo');
    }
  }

  async function handleDeletePackage(id: string) {
    if (!window.confirm('¿Segura que deseas eliminar este servicio combinado?')) return;
    try {
      await deleteAdminPackageApi(id, token);
      await loadPackages();
      if (onServicesUpdated) onServicesUpdated();
    } catch (err: any) {
      setError(err.message || 'Error al eliminar servicio combinado');
    }
  }

  // Filtros
  const filteredServices = services.filter((s) => {
    const matchesCat =
      selectedCategory === 'ALL' ||
      s.category === selectedCategory ||
      normalizeCategoryId(s.category) === normalizeCategoryId(selectedCategory);
    const matchesSearch =
      !searchQuery ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const filteredPackages = packages.filter((p) => {
    if (!packageSearchQuery.trim()) return true;
    const q = packageSearchQuery.toLowerCase();
    return p.name.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q);
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-pretty-wine-950/40 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl glass-panel rounded-3xl p-5 sm:p-7 shadow-2xl border border-white/80 my-auto text-pretty-wine-900 max-h-[92vh] flex flex-col">
        
        {/* Botón Cerrar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/70 hover:bg-white text-pretty-wine-800 transition-colors shadow-sm"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Encabezado */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-pretty-pink-200/50 pr-8 gap-3">
          <div>
            <div className="flex items-center space-x-1.5 text-xs font-semibold text-pretty-pink-600 uppercase tracking-wider mb-1">
              <Tag className="w-3.5 h-3.5" />
              <span>Gestión de Catálogo</span>
            </div>
            <h3 className="font-serif text-xl sm:text-2xl font-bold text-pretty-wine-900">
              Servicios del Salón
            </h3>
          </div>

          {/* Botón Acción (según pestaña activa) */}
          <div className="flex items-center space-x-2">
            {mainTab === 'services' && !isEditing && (
              <button
                onClick={handleOpenCreateService}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-pretty-wine-900 hover:bg-pretty-pink-600 transition-all shadow-sm flex items-center space-x-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Nuevo Servicio</span>
              </button>
            )}

            {mainTab === 'packages' && !isEditingPackage && (
              <button
                onClick={handleOpenCreatePackage}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-pretty-wine-900 hover:bg-pretty-pink-600 transition-all shadow-sm flex items-center space-x-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Nuevo Servicio Combinado</span>
              </button>
            )}
          </div>
        </div>

        {/* Selector de Pestañas: Individuales vs Combinados */}
        {(!isEditing && !isEditingPackage) && (
          <div className="flex items-center space-x-2 pt-3 pb-1 border-b border-pretty-pink-200/30">
            <button
              type="button"
              onClick={() => setMainTab('services')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center space-x-2 ${
                mainTab === 'services'
                  ? 'bg-pretty-wine-900 text-white shadow-xs'
                  : 'bg-white/60 text-pretty-wine-800 hover:bg-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-pretty-pink-300" />
              <span>Servicios Individuales</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                mainTab === 'services' ? 'bg-white/20 text-white' : 'bg-pretty-pink-100 text-pretty-wine-800'
              }`}>
                {services.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setMainTab('packages')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center space-x-2 ${
                mainTab === 'packages'
                  ? 'bg-pretty-wine-900 text-white shadow-xs'
                  : 'bg-white/60 text-pretty-wine-800 hover:bg-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-pretty-pink-300" />
              <span>Servicios Combinados (Combos)</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                mainTab === 'packages' ? 'bg-white/20 text-white' : 'bg-pretty-pink-100 text-pretty-wine-800'
              }`}>
                {packages.length}
              </span>
            </button>
          </div>
        )}

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

        {/* ========================================================================= */}
        {/* SECCIÓN 1: SERVICIOS INDIVIDUALES (FORMULARIO O LISTA) */}
        {/* ========================================================================= */}
        {mainTab === 'services' && (
          isEditing ? (
            <form onSubmit={handleSaveServiceForm} className="mt-4 space-y-4 overflow-y-auto pr-1">
              <div className="flex items-center justify-between pb-2 border-b border-pretty-pink-100">
                <h4 className="font-serif font-bold text-base text-pretty-wine-900">
                  {editingId ? 'Editar Servicio Individual' : 'Crear Nuevo Servicio Individual'}
                </h4>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="text-xs text-pretty-wine-600 hover:text-pretty-wine-900 underline"
                >
                  Volver a la lista
                </button>
              </div>

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
                      <option key={cat.id} value={cat.id}>{cat.label}</option>
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
              {/* Barra de Búsqueda y Dropdown de Categorías */}
              <div className="flex flex-col sm:flex-row gap-2 mb-3 relative z-30">
                {/* Buscador de Servicios */}
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-pretty-wine-600/60" />
                  <input
                    type="text"
                    placeholder="Buscar servicio por nombre o detalle..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-9 pl-9 pr-8 rounded-xl border border-pretty-pink-200 bg-white text-xs font-medium focus:ring-1 focus:ring-pretty-pink-400 focus:outline-none text-pretty-wine-900"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-2.5 p-0.5 rounded-full text-pretty-wine-400 hover:text-pretty-wine-700 transition-colors"
                      title="Limpiar búsqueda"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Dropdown de Categorías con Search Bar */}
                <div className="relative" ref={categoryDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsCategoryDropdownOpen((prev) => !prev)}
                    className={`w-full sm:w-auto h-9 px-3 rounded-xl border flex items-center justify-between sm:justify-start space-x-2 text-xs font-semibold transition-all shadow-xs ${
                      isCategoryDropdownOpen
                        ? 'bg-white border-pretty-wine-900 ring-2 ring-pretty-wine-900/10'
                        : selectedCategory !== 'ALL'
                        ? 'bg-pretty-pink-50 border-pretty-pink-300 text-pretty-wine-900'
                        : 'bg-white/80 border-pretty-pink-200 hover:bg-white text-pretty-wine-900'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5 truncate">
                      <Tag className="w-3.5 h-3.5 text-pretty-pink-500 flex-shrink-0" />
                      <span className="truncate max-w-[130px] sm:max-w-none">
                        {selectedCategory === 'ALL' ? 'Todas las categorías' : getCategoryLabel(selectedCategory)}
                      </span>
                    </div>

                    <div className="flex items-center space-x-1 flex-shrink-0">
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-pretty-pink-100/90 text-pretty-wine-800 font-bold">
                        {selectedCategory === 'ALL'
                          ? services.length
                          : categoryCounts.get(normalizeCategoryId(selectedCategory)) || 0}
                      </span>
                      <ChevronDown
                        className={`w-3.5 h-3.5 text-pretty-wine-700 transition-transform duration-200 ${
                          isCategoryDropdownOpen ? 'rotate-180 text-pretty-wine-900' : ''
                        }`}
                      />
                    </div>
                  </button>

                  {/* Popover del Dropdown con Search Bar Integrado */}
                  {isCategoryDropdownOpen && (
                    <div className="absolute left-0 sm:right-0 sm:left-auto top-full mt-1.5 w-64 max-w-[calc(100vw-2.5rem)] bg-white rounded-2xl p-2.5 shadow-2xl border border-pretty-pink-200 z-50 animate-fade-in">
                      <div className="relative mb-2">
                        <Search className="w-3 h-3 absolute left-2.5 top-2.5 text-pretty-wine-500" />
                        <input
                          type="text"
                          autoFocus
                          placeholder="Buscar categoría..."
                          value={categorySearchQuery}
                          onChange={(e) => setCategorySearchQuery(e.target.value)}
                          className="w-full h-8 pl-7 pr-7 text-xs rounded-xl border border-pretty-pink-200 bg-pretty-pink-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-pretty-pink-400 text-pretty-wine-900"
                        />
                        {categorySearchQuery && (
                          <button
                            type="button"
                            onClick={() => setCategorySearchQuery('')}
                            className="absolute right-2 top-2 p-0.5 rounded-full text-pretty-wine-400 hover:text-pretty-wine-700 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      <div className="max-h-52 overflow-y-auto space-y-1 pr-0.5">
                        {!categorySearchQuery.trim() && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCategory('ALL');
                              setIsCategoryDropdownOpen(false);
                            }}
                            className={`w-full px-2.5 py-1.5 rounded-xl text-left flex items-center justify-between text-xs transition-all ${
                              selectedCategory === 'ALL'
                                ? 'bg-pretty-wine-900 text-white font-bold shadow-xs'
                                : 'text-pretty-wine-900 hover:bg-pretty-pink-50'
                            }`}
                          >
                            <div className="flex items-center space-x-2 truncate">
                              <Sparkles className="w-3.5 h-3.5 text-pretty-pink-400 flex-shrink-0" />
                              <span className="truncate">Todas las categorías</span>
                            </div>
                            <div className="flex items-center space-x-1.5 flex-shrink-0 ml-2">
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                                  selectedCategory === 'ALL'
                                    ? 'bg-white/20 text-white'
                                    : 'bg-pretty-pink-100 text-pretty-wine-800'
                                }`}
                              >
                                {services.length}
                              </span>
                              {selectedCategory === 'ALL' && (
                                <Check className="w-3.5 h-3.5 text-pretty-pink-300" />
                              )}
                            </div>
                          </button>
                        )}

                        {filteredCategories.length === 0 ? (
                          <div className="py-4 text-center text-xs text-pretty-wine-700/60">
                            No se encontraron categorías
                          </div>
                        ) : (
                          filteredCategories.map((c) => {
                            const isSelected =
                              selectedCategory === c.id ||
                              normalizeCategoryId(selectedCategory) === c.id;
                            const count = categoryCounts.get(c.id) || 0;
                            return (
                              <button
                                type="button"
                                key={c.id}
                                onClick={() => {
                                  setSelectedCategory(c.id);
                                  setIsCategoryDropdownOpen(false);
                                  setCategorySearchQuery('');
                                }}
                                className={`w-full px-2.5 py-1.5 rounded-xl text-left flex items-center justify-between text-xs transition-all ${
                                  isSelected
                                    ? 'bg-pretty-wine-900 text-white font-bold shadow-xs'
                                    : 'text-pretty-wine-900 hover:bg-pretty-pink-50'
                                }`}
                              >
                                <span className="truncate font-medium">{c.label}</span>
                                <div className="flex items-center space-x-1.5 flex-shrink-0 ml-2">
                                  <span
                                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                                      isSelected
                                        ? 'bg-white/20 text-white'
                                        : 'bg-pretty-pink-100 text-pretty-wine-800'
                                    }`}
                                  >
                                    {count}
                                  </span>
                                  {isSelected && (
                                    <Check className="w-3.5 h-3.5 text-pretty-pink-300" />
                                  )}
                                </div>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
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
                          onClick={() => handleToggleActiveService(srv.id)}
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
                          onClick={() => handleOpenEditService(srv)}
                          className="p-1.5 rounded-lg text-pretty-wine-800 bg-white/90 hover:bg-white shadow-sm border border-white"
                          title="Editar servicio"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteService(srv.id)}
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
          )
        )}

        {/* ========================================================================= */}
        {/* SECCIÓN 2: SERVICIOS COMBINADOS / COMBOS (FORMULARIO O LISTA) */}
        {/* ========================================================================= */}
        {mainTab === 'packages' && (
          isEditingPackage ? (
            <form onSubmit={handleSavePackageForm} className="mt-4 space-y-4 overflow-y-auto pr-1">
              <div className="flex items-center justify-between pb-2 border-b border-pretty-pink-100">
                <div className="flex items-center space-x-2">
                  <Layers className="w-4 h-4 text-pretty-pink-600" />
                  <h4 className="font-serif font-bold text-base text-pretty-wine-900">
                    {editingPackageId ? 'Editar Servicio Combinado' : 'Crear Nuevo Servicio Combinado (Combo)'}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditingPackage(false)}
                  className="text-xs text-pretty-wine-600 hover:text-pretty-wine-900 underline"
                >
                  Volver a la lista
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-pretty-wine-800 mb-1">
                    Nombre del Combo o Paquete:
                  </label>
                  <input
                    type="text"
                    value={pkgName}
                    onChange={(e) => setPkgName(e.target.value)}
                    placeholder="Ej: Dúo Spa (Manicura + Pedicura Spa)"
                    required
                    className="w-full h-10 px-3 rounded-xl border border-pretty-pink-200 bg-white text-xs font-medium focus:ring-1 focus:ring-pretty-pink-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-pretty-wine-800 mb-1">
                    URL de Imagen / Portada:
                  </label>
                  <input
                    type="url"
                    value={pkgImageUrl}
                    onChange={(e) => setPkgImageUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full h-10 px-3 rounded-xl border border-pretty-pink-200 bg-white text-xs font-medium focus:ring-1 focus:ring-pretty-pink-400 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-pretty-wine-800 mb-1">
                  Descripción o Beneficios del Combo:
                </label>
                <textarea
                  value={pkgDescription}
                  onChange={(e) => setPkgDescription(e.target.value)}
                  rows={2}
                  placeholder="Incluye diseño completo, exfoliación con sales y masaje relajante..."
                  className="w-full px-3 py-2 rounded-xl border border-pretty-pink-200 bg-white text-xs font-medium focus:ring-1 focus:ring-pretty-pink-400 focus:outline-none resize-none"
                />
              </div>

              {/* SELECCIÓN DE SERVICIOS QUE COMPONEN EL COMBO */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-pretty-wine-900">
                    Selecciona los servicios a combinar (mínimo 2):
                  </label>
                  <span className="text-[11px] font-semibold text-pretty-pink-600">
                    {pkgSelectedServiceIds.length} seleccionados
                  </span>
                </div>

                <div className="max-h-44 overflow-y-auto p-2 rounded-2xl bg-white/70 border border-pretty-pink-200 space-y-1.5">
                  {services.map((srv) => {
                    const isSelected = pkgSelectedServiceIds.includes(srv.id);
                    return (
                      <button
                        type="button"
                        key={srv.id}
                        onClick={() => {
                          if (isSelected) {
                            setPkgSelectedServiceIds(pkgSelectedServiceIds.filter((id) => id !== srv.id));
                          } else {
                            setPkgSelectedServiceIds([...pkgSelectedServiceIds, srv.id]);
                          }
                        }}
                        className={`w-full p-2 rounded-xl border text-left flex items-center justify-between transition-all ${
                          isSelected
                            ? 'bg-pretty-wine-900 text-white border-pretty-wine-900 shadow-xs'
                            : 'bg-white text-pretty-wine-900 border-pretty-pink-100 hover:border-pretty-pink-300'
                        }`}
                      >
                        <div className="flex items-center space-x-2.5 truncate">
                          <div className={`w-4 h-4 rounded-md flex items-center justify-center border flex-shrink-0 ${
                            isSelected ? 'bg-pretty-pink-500 border-pretty-pink-400 text-white' : 'border-pretty-pink-300 bg-white'
                          }`}>
                            {isSelected && <Check className="w-3 h-3" />}
                          </div>
                          <span className="text-xs font-medium truncate">{srv.name}</span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                            isSelected ? 'bg-white/20 text-white' : 'bg-pretty-pink-100 text-pretty-wine-800'
                          }`}>
                            {srv.category}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 flex-shrink-0 ml-2 text-xs">
                          <span className="font-semibold">{formatCRC(srv.priceCRC)}</span>
                          <span className="text-[11px] opacity-80">({srv.durationBlocks * 15}m)</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* CÁLCULO DE PRECIO Y DESCUENTO */}
              <div className="p-3.5 rounded-2xl bg-pretty-pink-50/70 border border-pretty-pink-200/80 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-pretty-wine-800 mb-1">
                      Descuento del Combo (₡ CRC):
                    </label>
                    <input
                      type="number"
                      value={pkgDiscountCRC}
                      onChange={(e) => setPkgDiscountCRC(e.target.value)}
                      min="0"
                      step="500"
                      className="w-full h-10 px-3 rounded-xl border border-pretty-pink-300 bg-white text-xs font-bold text-pretty-wine-900 focus:ring-1 focus:ring-pretty-pink-400 focus:outline-none"
                    />
                    <p className="text-[10px] text-pretty-wine-600 mt-1">
                      Monto de ahorro que se le descuenta a la clienta respecto al precio individual.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-pretty-wine-800 mb-1">
                      Duración Total (Minutos):
                    </label>
                    <select
                      value={pkgDurationMinutes}
                      onChange={(e) => setPkgDurationMinutes(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-pretty-pink-300 bg-white text-xs font-semibold focus:ring-1 focus:ring-pretty-pink-400 focus:outline-none"
                    >
                      <option value="45">45 minutos</option>
                      <option value="60">60 minutos (1 hora)</option>
                      <option value="75">75 minutos (1h 15m)</option>
                      <option value="90">90 minutos (1h 30m)</option>
                      <option value="105">105 minutos (1h 45m)</option>
                      <option value="120">120 minutos (2 horas)</option>
                      <option value="150">150 minutos (2h 30m)</option>
                      <option value="180">180 minutos (3 horas)</option>
                      <option value="210">210 minutos (3h 30m)</option>
                      <option value="240">240 minutos (4 horas)</option>
                    </select>
                    <p className="text-[10px] text-pretty-wine-600 mt-1">
                      Suma de tiempos: {pkgCalculatedSumDuration} min. Puedes ajustarlo si se hace en paralelo.
                    </p>
                  </div>
                </div>

                {/* Resumen en vivo */}
                <div className="pt-2 border-t border-pretty-pink-200 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-pretty-wine-600">Suma servicios sueltos: </span>
                    <span className="line-through font-semibold text-pretty-wine-700">
                      {formatCRC(pkgCalculatedSumPrice)}
                    </span>
                    {parseInt(pkgDiscountCRC, 10) > 0 && (
                      <span className="ml-2 font-bold text-emerald-700">
                        (-{formatCRC(parseInt(pkgDiscountCRC, 10) || 0)})
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="font-semibold text-pretty-wine-900">Precio Final del Combo:</span>
                    <span className="font-serif text-base font-bold text-pretty-wine-900">
                      {formatCRC(pkgFinalPrice)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Botones de acción del formulario */}
              <div className="pt-3 flex items-center justify-end space-x-2 border-t border-pretty-pink-200/50">
                <button
                  type="button"
                  onClick={() => setIsEditingPackage(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-pretty-wine-800 hover:bg-white/60 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={pkgSaving || pkgSelectedServiceIds.length < 2}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-pretty-wine-900 hover:bg-pretty-pink-600 transition-all shadow-md disabled:opacity-50"
                >
                  {pkgSaving ? 'Guardando...' : (editingPackageId ? 'Actualizar Combo' : 'Crear Combo')}
                </button>
              </div>
            </form>
          ) : (
            <div className="mt-3 flex-1 flex flex-col min-h-0">
              {/* Barra de Búsqueda de Combos */}
              <div className="relative mb-3">
                <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-pretty-wine-600/60" />
                <input
                  type="text"
                  placeholder="Buscar combo por nombre..."
                  value={packageSearchQuery}
                  onChange={(e) => setPackageSearchQuery(e.target.value)}
                  className="w-full h-9 pl-9 pr-8 rounded-xl border border-pretty-pink-200 bg-white text-xs font-medium focus:ring-1 focus:ring-pretty-pink-400 focus:outline-none text-pretty-wine-900"
                />
                {packageSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setPackageSearchQuery('')}
                    className="absolute right-2.5 top-2.5 p-0.5 rounded-full text-pretty-wine-400 hover:text-pretty-wine-700 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Listado de Combos */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {packagesLoading ? (
                  <div className="py-12 text-center text-xs text-pretty-wine-700/60">
                    Cargando servicios combinados...
                  </div>
                ) : filteredPackages.length === 0 ? (
                  <div className="py-12 text-center text-xs text-pretty-wine-700/60 space-y-2">
                    <p>No hay servicios combinados o paquetes registrados todavía.</p>
                    <button
                      type="button"
                      onClick={handleOpenCreatePackage}
                      className="px-4 py-2 rounded-xl text-xs font-semibold bg-pretty-wine-900 text-white hover:bg-pretty-pink-600 transition-all inline-flex items-center space-x-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Crear mi primer combo</span>
                    </button>
                  </div>
                ) : (
                  filteredPackages.map((pkg) => (
                    <div
                      key={pkg.id}
                      className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        pkg.active
                          ? 'bg-white/80 border-white hover:bg-white shadow-sm'
                          : 'bg-pretty-pink-50/40 border-pretty-pink-200/50 opacity-60'
                      }`}
                    >
                      <div className="flex items-start sm:items-center space-x-3 min-w-0">
                        <img
                          src={pkg.imageUrl || 'https://images.unsplash.com/photo-1560750588-73207b1ef5b8?auto=format&fit=crop&w=150&q=80'}
                          alt={pkg.name}
                          className="w-12 h-12 rounded-xl object-cover border border-pretty-pink-200 flex-shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center space-x-2 flex-wrap">
                            <span className="font-semibold text-xs text-pretty-wine-900 truncate">
                              {pkg.name}
                            </span>
                            <span className="px-1.5 py-0.2 rounded-md text-[10px] font-semibold bg-pretty-pink-100 text-pretty-wine-800">
                              Combo ({pkg.componentServiceIds?.length || 2} servicios)
                            </span>
                            {!pkg.active && (
                              <span className="px-1.5 py-0.2 rounded-md text-[10px] font-semibold bg-gray-200 text-gray-700">
                                Oculto
                              </span>
                            )}
                          </div>

                          {/* Lista de servicios incluidos */}
                          <div className="flex flex-wrap gap-1 mt-1">
                            {pkg.components?.map((comp: any) => (
                              <span
                                key={comp.id}
                                className="inline-flex items-center space-x-1 text-[10px] px-2 py-0.5 rounded-md bg-white border border-pretty-pink-200 text-pretty-wine-900 font-medium"
                              >
                                <Sparkles className="w-2.5 h-2.5 text-pretty-pink-500" />
                                <span>{comp.name}</span>
                              </span>
                            ))}
                          </div>

                          {/* Precios y duración */}
                          <div className="flex items-center space-x-3 text-[11px] text-pretty-wine-700/80 mt-1">
                            <div className="flex items-center space-x-1.5">
                              {pkg.extraPriceCRC < 0 && (
                                <span className="line-through text-pretty-wine-500">
                                  {formatCRC(pkg.componentsSumCRC)}
                                </span>
                              )}
                              <span className="font-bold text-pretty-wine-900 text-xs">
                                {formatCRC(pkg.totalPriceCRC)}
                              </span>
                              {pkg.extraPriceCRC < 0 && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-emerald-100 text-emerald-800">
                                  Ahorro {formatCRC(Math.abs(pkg.extraPriceCRC))}
                                </span>
                              )}
                            </div>
                            <span>•</span>
                            <span className="flex items-center space-x-0.5">
                              <Clock className="w-3 h-3 text-pretty-pink-500" />
                              <span>{pkg.totalDurationMinutes} min</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Acciones */}
                      <div className="flex items-center space-x-1 flex-shrink-0 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => handleToggleActivePackage(pkg.id)}
                          className={`p-1.5 rounded-lg text-xs font-semibold transition-all ${
                            pkg.active
                              ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                              : 'text-gray-500 bg-gray-100 hover:bg-gray-200'
                          }`}
                          title={pkg.active ? 'Desactivar combo' : 'Activar combo'}
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenEditPackage(pkg)}
                          className="p-1.5 rounded-lg text-pretty-wine-800 bg-white/90 hover:bg-white shadow-sm border border-white"
                          title="Editar combo"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeletePackage(pkg.id)}
                          className="p-1.5 rounded-lg text-red-600 bg-white/90 hover:bg-red-50 shadow-sm border border-white"
                          title="Eliminar combo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )
        )}

      </div>
    </div>
  );
}
