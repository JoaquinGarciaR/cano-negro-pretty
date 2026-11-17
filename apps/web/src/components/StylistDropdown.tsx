'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { User, Users, ChevronDown, Check, Sparkles } from 'lucide-react';

interface StylistDropdownProps {
  value: string;
  onChange: (value: string) => void;
  professionals: any[];
  allLabel?: string;
  allSublabel?: string;
  unassignedLabel?: string;
  unassignedSublabel?: string;
  headerTitle?: string;
  title?: string;
  className?: string;
}

export function StylistDropdown({
  value,
  onChange,
  professionals = [],
  allLabel = 'Todas las Estilistas',
  allSublabel = 'Agenda completa del salón',
  unassignedLabel = 'Sin asignar',
  unassignedSublabel = 'Pendientes de asignación',
  headerTitle = 'Filtrar por Estilista',
  title = 'Filtrar por estilista',
  className = ''
}: StylistDropdownProps) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Cerrar al hacer clic fuera del dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent | TouchEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('pointerdown', handleClickOutside);
    }
    return () => document.removeEventListener('pointerdown', handleClickOutside);
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

  return (
    <div className={`relative inline-block ${className}`} ref={containerRef}>
      {/* Botón Trigger de Estilo Pretty Salon */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex items-center space-x-2 px-3 py-1.5 rounded-2xl bg-white/95 border transition-all shadow-xs ${
          isOpen
            ? 'border-pretty-wine-900 ring-2 ring-pretty-wine-900/10'
            : 'border-pretty-pink-200 hover:border-pretty-pink-400 hover:bg-white'
        }`}
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

        <span className="text-xs font-bold text-pretty-wine-900 truncate max-w-[130px] sm:max-w-none">
          {currentSelection.label}
        </span>

        <ChevronDown
          className={`w-3.5 h-3.5 text-pretty-wine-700 transition-transform duration-200 flex-shrink-0 ${
            isOpen ? 'rotate-180 text-pretty-wine-900' : ''
          }`}
        />
      </button>

      {/* Popover con Menú Estilizado */}
      {isOpen && (
        <div className="absolute left-0 sm:right-0 sm:left-auto top-full mt-1.5 w-64 glass-panel rounded-2xl p-1.5 shadow-2xl border border-white/90 z-30 animate-fade-in backdrop-blur-xl">
          <div className="px-2 py-1.5 border-b border-pretty-pink-100 mb-1">
            <p className="text-[10px] uppercase tracking-wider font-bold text-pretty-wine-700/70">
              {headerTitle}
            </p>
          </div>

          <div className="space-y-1">
            {/* Opción 1: Todas */}
            <button
              type="button"
              onClick={() => {
                onChange('');
                setIsOpen(false);
              }}
              className={`w-full px-2.5 py-2 rounded-xl text-left flex items-center justify-between text-xs transition-all ${
                !value || value === 'ALL'
                  ? 'bg-pretty-wine-900 text-white font-bold shadow-xs'
                  : 'text-pretty-wine-900 hover:bg-pretty-pink-50'
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

            {/* Opciones: Estilistas individuales */}
            {professionals.map((p) => {
              const isSelected = value === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    onChange(p.id);
                    setIsOpen(false);
                  }}
                  className={`w-full px-2.5 py-2 rounded-xl text-left flex items-center justify-between text-xs transition-all ${
                    isSelected
                      ? 'bg-pretty-wine-900 text-white font-bold shadow-xs'
                      : 'text-pretty-wine-900 hover:bg-pretty-pink-50'
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
            <button
              type="button"
              onClick={() => {
                onChange('UNASSIGNED');
                setIsOpen(false);
              }}
              className={`w-full px-2.5 py-2 rounded-xl text-left flex items-center justify-between text-xs transition-all ${
                value === 'UNASSIGNED'
                  ? 'bg-pretty-wine-900 text-white font-bold shadow-xs'
                  : 'text-pretty-wine-900 hover:bg-pretty-pink-50'
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
          </div>
        </div>
      )}
    </div>
  );
}
