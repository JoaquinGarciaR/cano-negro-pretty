'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import {
  X,
  PlusCircle,
  Lock,
  Unlock,
  Clock,
  Calendar,
  Tag,
  MapPin,
  User,
  Bell,
  Share2,
  Download,
  Sparkles,
  LogOut,
  ChevronRight
} from 'lucide-react';

interface AdminMenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  activeTab: 'pending' | 'agenda' | 'availability';
  setActiveTab: (tab: 'pending' | 'agenda' | 'availability') => void;
  setFilterStatus: (status: string) => void;
  pendingCount: number;
  notifGranted: boolean;
  onOpenManualBooking: () => void;
  onOpenBlockTime: () => void;
  onOpenDayAvail: () => void;
  onOpenServices: () => void;
  onOpenLocations: () => void;
  onOpenProfile: () => void;
  onOpenPushModal: () => void;
  onInstallPwa: () => void;
  onShareCatalog: () => void;
  onLogout: () => void;
}

export function AdminMenuDrawer({
  isOpen,
  onClose,
  currentUser,
  activeTab,
  setActiveTab,
  setFilterStatus,
  pendingCount,
  notifGranted,
  onOpenManualBooking,
  onOpenBlockTime,
  onOpenDayAvail,
  onOpenServices,
  onOpenLocations,
  onOpenProfile,
  onOpenPushModal,
  onInstallPwa,
  onShareCatalog,
  onLogout
}: AdminMenuDrawerProps) {
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Cerrar con tecla Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  // Renderizar a través de createPortal directamente en document.body con z-50
  // para cubrir limpiamente el header sticky y todo el viewport
  const drawerContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Menú Administrativo"
      className="fixed inset-0 z-50 flex justify-end bg-pretty-wine-950/50 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="relative w-72 sm:w-80 max-w-[85vw] h-full bg-white/95 backdrop-blur-xl shadow-2xl border-l border-pretty-pink-200/60 p-4 sm:p-5 flex flex-col justify-between overflow-y-auto">
        <div>
          {/* Cabecera compacta y elegante del perfil */}
          <div className="flex items-center justify-between pb-3 border-b border-pretty-pink-100">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-pretty-wine-900 to-pretty-pink-500 text-white flex items-center justify-center font-serif text-xs font-bold shadow-xs flex-shrink-0">
                {currentUser?.name?.slice(0, 2).toUpperCase() || 'CN'}
              </div>
              <div className="min-w-0">
                <p className="font-serif font-bold text-xs sm:text-sm text-pretty-wine-900 truncate">
                  {currentUser?.name || 'Personal'}
                </p>
                <span className="inline-block text-[10px] text-pretty-wine-700/70 truncate">
                  {currentUser?.role === 'OWNER' ? 'Propietaria' : 'Esteticista'}
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-pretty-pink-100 text-pretty-wine-800 transition-colors flex-shrink-0"
              title="Cerrar menú"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Botón Principal de Acción Rápida (Sleek CTA) */}
          <button
            onClick={() => {
              onClose();
              onOpenManualBooking();
            }}
            className="w-full my-3 py-2 px-3.5 rounded-xl bg-pretty-wine-900 hover:bg-pretty-pink-600 text-white text-xs font-bold flex items-center justify-center space-x-2 shadow-xs transition-all active:scale-98"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Nueva Cita Manual</span>
          </button>

          <div className="space-y-3.5 text-xs">
            {/* SECCIÓN 1: VISTAS DEL SALÓN */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-pretty-wine-700/50 px-2 mb-1">
                Vistas del Salón
              </p>
              <div className="space-y-0.5">
                {/* 1.1 Solicitudes */}
                <button
                  onClick={() => {
                    onClose();
                    setActiveTab('pending');
                    setFilterStatus('PENDING');
                  }}
                  className={`w-full px-2.5 py-1.5 rounded-xl text-left font-semibold flex items-center justify-between transition-colors ${
                    activeTab === 'pending'
                      ? 'bg-pretty-pink-100/90 text-pretty-wine-950 font-bold'
                      : 'text-pretty-wine-900 hover:bg-pretty-pink-50/80'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <Clock className="w-3.5 h-3.5 text-pretty-pink-600 flex-shrink-0" />
                    <span>Bandeja de Solicitudes</span>
                  </div>
                  {pendingCount > 0 && (
                    <span className="bg-pretty-wine-900 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                      {pendingCount}
                    </span>
                  )}
                </button>

                {/* 1.2 Agenda & Calendario */}
                <button
                  onClick={() => {
                    onClose();
                    setActiveTab('agenda');
                    setFilterStatus('ALL');
                  }}
                  className={`w-full px-2.5 py-1.5 rounded-xl text-left font-semibold flex items-center space-x-2.5 transition-colors ${
                    activeTab === 'agenda'
                      ? 'bg-pretty-pink-100/90 text-pretty-wine-950 font-bold'
                      : 'text-pretty-wine-900 hover:bg-pretty-pink-50/80'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5 text-pretty-pink-600 flex-shrink-0" />
                  <span>Agenda & Calendario</span>
                </button>

                {/* 1.3 Bloquear Horario */}
                <button
                  onClick={() => {
                    onClose();
                    onOpenBlockTime();
                  }}
                  className="w-full px-2.5 py-1.5 rounded-xl text-left font-semibold text-pretty-wine-900 hover:bg-pretty-pink-50/80 transition-colors flex items-center space-x-2.5"
                >
                  <Lock className="w-3.5 h-3.5 text-pretty-pink-600 flex-shrink-0" />
                  <span>Bloquear Horario</span>
                </button>

                {/* 1.4 Apertura de Jornadas */}
                <button
                  onClick={() => {
                    onClose();
                    onOpenDayAvail();
                  }}
                  className={`w-full px-2.5 py-1.5 rounded-xl text-left font-semibold transition-colors flex items-center space-x-2.5 ${
                    activeTab === 'availability'
                      ? 'bg-pretty-pink-100/90 text-pretty-wine-950 font-bold'
                      : 'text-pretty-wine-900 hover:bg-pretty-pink-50/80'
                  }`}
                >
                  <Unlock className="w-3.5 h-3.5 text-pretty-pink-600 flex-shrink-0" />
                  <span>Apertura de Agenda</span>
                </button>
              </div>
            </div>

            {/* SECCIÓN 2: GESTIÓN & NEGOCIO */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-pretty-wine-700/50 px-2 mb-1">
                Gestión & Negocio
              </p>
              <div className="space-y-0.5">
                {/* 2.1 Gestión de Servicios */}
                <button
                  onClick={() => {
                    onClose();
                    onOpenServices();
                  }}
                  className="w-full px-2.5 py-1.5 rounded-xl text-left font-semibold text-pretty-wine-900 hover:bg-pretty-pink-50/80 transition-colors flex items-center space-x-2.5"
                >
                  <Tag className="w-3.5 h-3.5 text-pretty-pink-600 flex-shrink-0" />
                  <span>Gestión de Servicios</span>
                </button>

                {/* 2.2 Tarifas & Ubicaciones Domicilio */}
                <button
                  onClick={() => {
                    onClose();
                    onOpenLocations();
                  }}
                  className="w-full px-2.5 py-1.5 rounded-xl text-left font-semibold text-pretty-wine-900 hover:bg-pretty-pink-50/80 transition-colors flex items-center space-x-2.5"
                >
                  <MapPin className="w-3.5 h-3.5 text-pretty-pink-600 flex-shrink-0" />
                  <span>Tarifas a Domicilio</span>
                </button>

                {/* 2.3 Mi Cuenta & Perfil */}
                <button
                  onClick={() => {
                    onClose();
                    onOpenProfile();
                  }}
                  className="w-full px-2.5 py-1.5 rounded-xl text-left font-semibold text-pretty-wine-900 hover:bg-pretty-pink-50/80 transition-colors flex items-center space-x-2.5"
                >
                  <User className="w-3.5 h-3.5 text-pretty-pink-600 flex-shrink-0" />
                  <span>Mi Cuenta & Perfil</span>
                </button>
              </div>
            </div>

            {/* SECCIÓN 3: HERRAMIENTAS & ACCESOS */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-pretty-wine-700/50 px-2 mb-1">
                Herramientas
              </p>
              <div className="space-y-0.5">
                {/* 3.1 Alertas & Sonido */}
                <button
                  onClick={() => {
                    onClose();
                    onOpenPushModal();
                  }}
                  className="w-full px-2.5 py-1.5 rounded-xl text-left font-semibold text-pretty-wine-900 hover:bg-pretty-pink-50/80 transition-colors flex items-center justify-between"
                >
                  <div className="flex items-center space-x-2.5">
                    <Bell className="w-3.5 h-3.5 text-pretty-pink-600 flex-shrink-0" />
                    <span>Alertas & Sonido</span>
                  </div>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    notifGranted ? 'bg-emerald-100 text-emerald-800' : 'bg-pretty-pink-200 text-pretty-wine-800'
                  }`}>
                    {notifGranted ? 'Activo' : 'Probar'}
                  </span>
                </button>

                {/* 3.2 Compartir Catálogo */}
                <button
                  onClick={() => {
                    onShareCatalog();
                    onClose();
                  }}
                  className="w-full px-2.5 py-1.5 rounded-xl text-left font-semibold text-pretty-wine-900 hover:bg-pretty-pink-50/80 transition-colors flex items-center space-x-2.5"
                >
                  <Share2 className="w-3.5 h-3.5 text-pretty-pink-600 flex-shrink-0" />
                  <span>Compartir Catálogo</span>
                </button>

                {/* 3.3 Instalar en Teléfono */}
                <button
                  onClick={() => {
                    onClose();
                    onInstallPwa();
                  }}
                  className="w-full px-2.5 py-1.5 rounded-xl text-left font-semibold text-pretty-wine-900 hover:bg-pretty-pink-50/80 transition-colors flex items-center space-x-2.5"
                >
                  <Download className="w-3.5 h-3.5 text-pretty-pink-600 flex-shrink-0" />
                  <span>Instalar Aplicación PWA</span>
                </button>

                {/* 3.4 Ver Catálogo Web */}
                <Link
                  href="/#catalogo"
                  target="_blank"
                  onClick={onClose}
                  className="w-full px-2.5 py-1.5 rounded-xl text-left font-semibold text-pretty-wine-900 hover:bg-pretty-pink-50/80 transition-colors flex items-center justify-between"
                >
                  <div className="flex items-center space-x-2.5">
                    <Sparkles className="w-3.5 h-3.5 text-pretty-pink-600 flex-shrink-0" />
                    <span>Ver Catálogo Web</span>
                  </div>
                  <ChevronRight className="w-3 h-3 text-pretty-wine-700/50" />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Footer elegante y compacto */}
        <div className="pt-3 border-t border-pretty-pink-100 flex items-center justify-between text-xs">
          <button
            onClick={() => {
              onClose();
              onLogout();
            }}
            className="inline-flex items-center space-x-1.5 font-semibold text-pretty-wine-800 hover:text-rose-700 transition-colors py-1 px-2 rounded-lg hover:bg-rose-50"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Cerrar Sesión</span>
          </button>
          <span className="text-[10px] text-pretty-wine-700/50 font-mono">
            Caño Negro Pretty
          </span>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(drawerContent, document.body) : null;
}
