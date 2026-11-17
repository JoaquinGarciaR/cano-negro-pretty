'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { User, Users, ChevronDown, Check, Sparkles, Search, X } from 'lucide-react';

interface StylistDropdownProps {
  value: string;
  onChange: (value: string) => void;
  professionals: any[];
  allLabel?: string;
  allSublabel?: string;
  showUnassigned?: boolean;
  unassignedLabel?: string;
  unassignedSublabel?: string;
  headerTitle?: string;
  title?: string;
  align?: 'left' | 'right';
  className?: string;
  searchPlaceholder?: string;
}

export function StylistDropdown({
  value,
  onChange,
  professionals = [],
  allLabel = 'Todas las Estilistas',
  allSublabel = 'Agenda completa del salón',
  showUnassigned = true,
  unassignedLabel = 'Sin asignar',
  unassignedSublabel = 'Pendientes de asignación',
  headerTitle = 'Filtrar por Estilista',
  title = 'Filtrar por estilista',
  align = 'right',
  className = '',
  searchPlaceholder = 'Buscar estilista...'
}: StylistDropdownProps) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Cerrar al hacer clic fuera del dropdown o al presionar Escape
  useEffect(() => {
    function handleClickOutside(e: MouseEvent | TouchEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setSearchQuery('');
      }
    }
    if (isOpen) {
      document.addEventListener('pointerdown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
    return () => {
      document.removeEventListener('pointerdown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Nombre y datos de la opción actualmente seleccionada
  const currentSelection = useMemo(() => {
    if (!value || value === 'ALL') {
      return {
        label: allLabel,
        sublabel: allSublabel,
        initials: 'CN',
        isAll: true
      };
    }
    if (value === 'UNASSIGNED') {
      return {
        label: unassignedLabel,
        sublabel: unassignedSublabel,
        initials: '?',
        isUnassigned: true
      };
    }
    const found = professionals.find((p) => p.id === value);
    if (found) {
      return {
        label: found.name,
        sublabel: found.title || 'Especialista',
        initials: found.name.slice(0, 2).toUpperCase(),
        photoUrl: found.photoUrl
      };
    }
    return {
      label: allLabel,
      sublabel: allSublabel,
      initials: 'CN'
    };
  }, [value, professionals, allLabel, allSublabel, unassignedLabel, unassignedSublabel]);

  // Filtrado de profesionales según la barra de búsqueda
  const filteredProfessionals = useMemo(() => {
    if (!searchQuery.trim()) return professionals;
    const q = searchQuery.toLowerCase().trim();
    return professionals.filter(
      (p) =>
        p.name?.toLowerCase().includes(q) ||
        p.title?.toLowerCase().includes(q) ||
        p.specialty?.toLowerCase().includes(q)
    );
  }, [professionals, searchQuery]);

  // Visibilidad de opción "Todas"
  const showAllOption = useMemo(() => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return allLabel.toLowerCase().includes(q) || allSublabel.toLowerCase().includes(q);
  }, [allLabel, allSublabel, searchQuery]);

  // Visibilidad de opción "Sin asignar"
  const showUnassignedOption = useMemo(() => {
    if (!showUnassigned) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return unassignedLabel.toLowerCase().includes(q) || unassignedSublabel.toLowerCase().includes(q);
  }, [showUnassigned, unassignedLabel, unassignedSublabel, searchQuery]);

  const totalVisibleOptions =
    filteredProfessionals.length +
    (showAllOption ? 1 : 0) +
    (showUnassignedOption ? 1 : 0);

  return (
    <div className={`relative inline-block ${className}`} ref={containerRef}>
      {/* Botón Trigger de Estilo Pretty Salon */}
      <button
        type="button"
        onClick={() => {
          setIsOpen((prev) => {
            if (prev) setSearchQuery('');
            return !prev;
          });
        }}
        className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-2xl bg-white border transition-all shadow-xs ${
          isOpen
            ? 'border-pretty-wine-900 ring-2 ring-pretty-wine-900/15'
            : 'border-pretty-pink-200 hover:border-pretty-pink-400 hover:bg-white'
        }`}
        style={{ backgroundColor: '#ffffff' }}
        title={title}
      >
        <div className="w-5 h-5 rounded-full bg-pretty-pink-100 flex items-center justify-center text-pretty-wine-900 font-bold text-[10px] flex-shrink-0">
          {currentSelection.photoUrl ? (
            <img
              src={currentSelection.photoUrl}
              alt={currentSelection.label}
              className="w-full h-full rounded-full object-cover"
            />
          ) : currentSelection.isAll ? (
            <Users className="w-3 h-3 text-pretty-pink-600" />
          ) : currentSelection.isUnassigned ? (
            <Sparkles className="w-3 h-3 text-amber-600" />
          ) : (
            currentSelection.initials
          )}
        </div>

        <span className="text-xs font-bold text-pretty-wine-900 truncate max-w-[110px] xs:max-w-[130px] sm:max-w-none">
          {currentSelection.label}
        </span>

        <ChevronDown
          className={`w-3.5 h-3.5 text-pretty-wine-700 transition-transform duration-200 flex-shrink-0 ${
            isOpen ? 'rotate-180 text-pretty-wine-900' : ''
          }`}
        />
      </button>

      {/* Popover con Menú Estilizado - 100% Sólido Opaque Luxury Card con Search Bar */}
      {isOpen && (
        <div
          className={`absolute ${
            align === 'left' ? 'left-0' : 'left-0 sm:right-0 sm:left-auto'
          } top-full mt-2 w-64 max-w-[calc(100vw-2rem)] bg-white rounded-2xl p-2.5 shadow-2xl border border-pretty-pink-200 ring-1 ring-pretty-wine-900/5 z-50 animate-fade-in`}
          style={{ backgroundColor: '#ffffff', opacity: 1 }}
        >
          {/* Header del Popover */}
          <div className="px-2.5 py-1.5 bg-pretty-pink-50/80 rounded-xl border border-pretty-pink-100/90 mb-2 flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-wider font-bold text-pretty-wine-800">
              {headerTitle}
            </p>
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white text-pretty-wine-700 font-semibold border border-pretty-pink-200/60">
              {totalVisibleOptions} {totalVisibleOptions === 1 ? 'opción' : 'opciones'}
            </span>
          </div>

          {/* Search Bar Integrado */}
          <div className="relative mb-2">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-pretty-wine-500" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8 pl-8 pr-7 text-xs rounded-xl border border-pretty-pink-200 bg-pretty-pink-50/40 focus:bg-white focus:outline-none focus:ring-1 focus:ring-pretty-pink-400 text-pretty-wine-900 placeholder:text-pretty-wine-700/40 font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-2 p-0.5 rounded-full text-pretty-wine-400 hover:text-pretty-wine-700 transition-colors"
                title="Limpiar búsqueda"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Lista de Opciones */}
          <div className="space-y-1 max-h-56 overflow-y-auto pr-0.5">
            {/* Opción 1: Todas */}
            {showAllOption && (
              <button
                type="button"
                onClick={() => {
                  onChange('');
                  setIsOpen(false);
                  setSearchQuery('');
                }}
                className={`w-full px-2.5 py-2 rounded-xl text-left flex items-center justify-between text-xs transition-all ${
                  !value || value === 'ALL'
                    ? 'bg-pretty-wine-900 text-white font-bold shadow-xs'
                    : 'text-pretty-wine-900 hover:bg-pretty-pink-50 bg-white'
                }`}
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <div
                    className={`p-1.5 rounded-xl flex-shrink-0 ${
                      !value || value === 'ALL' ? 'bg-white/20' : 'bg-pretty-pink-100'
                    }`}
                  >
                    <Users
                      className={`w-3.5 h-3.5 ${
                        !value || value === 'ALL' ? 'text-white' : 'text-pretty-pink-700'
                      }`}
                    />
                  </div>
                  <div className="min-w-0">
                    <span className="block font-semibold truncate">{allLabel}</span>
                    <span
                      className={`text-[10px] truncate block ${
                        !value || value === 'ALL' ? 'text-pretty-pink-200' : 'text-pretty-wine-700/60'
                      }`}
                    >
                      {allSublabel}
                    </span>
                  </div>
                </div>
                {(!value || value === 'ALL') && (
                  <Check className="w-3.5 h-3.5 text-pretty-pink-300 flex-shrink-0 ml-2" />
                )}
              </button>
            )}

            {/* Opciones: Estilistas individuales */}
            {filteredProfessionals.map((p) => {
              const isSelected = value === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    onChange(p.id);
                    setIsOpen(false);
                    setSearchQuery('');
                  }}
                  className={`w-full px-2.5 py-2 rounded-xl text-left flex items-center justify-between text-xs transition-all ${
                    isSelected
                      ? 'bg-pretty-wine-900 text-white font-bold shadow-xs'
                      : 'text-pretty-wine-900 hover:bg-pretty-pink-50 bg-white'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    {p.photoUrl ? (
                      <img
                        src={p.photoUrl}
                        alt={p.name}
                        className="w-6 h-6 rounded-xl object-cover flex-shrink-0"
                      />
                    ) : (
                      <div
                        className={`w-6 h-6 rounded-xl flex items-center justify-center font-serif text-[10px] font-bold flex-shrink-0 ${
                          isSelected
                            ? 'bg-white/20 text-white'
                            : 'bg-pretty-pink-100 text-pretty-wine-900'
                        }`}
                      >
                        {p.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <span className="block font-semibold truncate">{p.name}</span>
                      <span
                        className={`text-[10px] truncate block ${
                          isSelected ? 'text-pretty-pink-200' : 'text-pretty-wine-700/60'
                        }`}
                      >
                        {p.title || 'Especialista'}
                      </span>
                    </div>
                  </div>
                  {isSelected && (
                    <Check className="w-3.5 h-3.5 text-pretty-pink-300 flex-shrink-0 ml-2" />
                  )}
                </button>
              );
            })}

            {/* Opción 3: Sin asignar */}
            {showUnassignedOption && (
              <button
                type="button"
                onClick={() => {
                  onChange('UNASSIGNED');
                  setIsOpen(false);
                  setSearchQuery('');
                }}
                className={`w-full px-2.5 py-2 rounded-xl text-left flex items-center justify-between text-xs transition-all ${
                  value === 'UNASSIGNED'
                    ? 'bg-pretty-wine-900 text-white font-bold shadow-xs'
                    : 'text-pretty-wine-900 hover:bg-pretty-pink-50 bg-white'
                }`}
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <div
                    className={`p-1.5 rounded-xl flex-shrink-0 ${
                      value === 'UNASSIGNED' ? 'bg-white/20' : 'bg-amber-100'
                    }`}
                  >
                    <Sparkles
                      className={`w-3.5 h-3.5 ${
                        value === 'UNASSIGNED' ? 'text-white' : 'text-amber-700'
                      }`}
                    />
                  </div>
                  <div className="min-w-0">
                    <span className="block font-semibold truncate">{unassignedLabel}</span>
                    <span
                      className={`text-[10px] truncate block ${
                        value === 'UNASSIGNED' ? 'text-pretty-pink-200' : 'text-pretty-wine-700/60'
                      }`}
                    >
                      {unassignedSublabel}
                    </span>
                  </div>
                </div>
                {value === 'UNASSIGNED' && (
                  <Check className="w-3.5 h-3.5 text-pretty-pink-300 flex-shrink-0 ml-2" />
                )}
              </button>
            )}

            {/* Estado vacío cuando no hay coincidencias */}
            {totalVisibleOptions === 0 && (
              <div className="py-4 text-center text-xs text-pretty-wine-700/70">
                <p className="font-semibold">No se encontraron estilistas</p>
                <p className="text-[10px] text-pretty-wine-600/50 mt-0.5">
                  Prueba buscando por otro nombre o especialidad
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
