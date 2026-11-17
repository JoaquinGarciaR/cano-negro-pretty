'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Sparkles,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  Ban,
  MessageSquare,
  AlertTriangle,
  LogOut,
  User,
  Users,
  PlusCircle,
  WifiOff,
  Download,
  Filter,
  Check,
  MapPin,
  Phone,
  Unlock,
  Lock,
  Settings2,
  Bell,
  Volume2,
  Search,
  ListFilter,
  ChevronLeft,
  ChevronRight,
  CalendarRange,
  Share2,
  ChevronDown,
  Menu,
  Tag,
  CalendarClock,
  X
} from 'lucide-react';
import { formatCRC } from '@cano/shared';
import {
  fetchAdminBookings,
  updateBookingStatusApi,
  fetchCatalog,
  fetchAdminAvailability,
  assignBookingApi
} from '../../lib/api';
import { playNotificationSound, showBrowserNotification, requestNotificationPermission, unsubscribeUserFromPush } from '../../lib/sound';
import { WhatsAppModal, WhatsAppTemplateType } from '../../components/WhatsAppModal';
import { RescheduleModal } from '../../components/RescheduleModal';
import { BlockTimeModal } from '../../components/BlockTimeModal';
import { DayAvailabilityModal } from '../../components/DayAvailabilityModal';
import { InstallPwaModal } from '../../components/InstallPwaModal';
import { ManualBookingModal } from '../../components/ManualBookingModal';
import { AdminProfileModal } from '../../components/AdminProfileModal';
import { AdminServicesModal } from '../../components/AdminServicesModal';
import { AdminLocationsModal } from '../../components/AdminLocationsModal';
import { PushNotificationModal } from '../../components/PushNotificationModal';
import { AdminMenuDrawer } from '../../components/AdminMenuDrawer';
import { StylistDropdown } from '../../components/StylistDropdown';

export default function AdminDashboardPage() {
  const router = useRouter();

  // Estados de autenticación
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authToken, setAuthToken] = useState<string>('');

  // Estados de conexión y notificaciones
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [notifGranted, setNotifGranted] = useState<boolean>(false);

  // Estados de navegación principal
  const [activeTab, setActiveTab] = useState<'pending' | 'agenda' | 'availability'>('pending');
  const [bookings, setBookings] = useState<any[]>([]);
  const [availabilities, setAvailabilities] = useState<any[]>([]);
  const [catalog, setCatalog] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Modos de vista de Agenda: 'calendar' (Calendario Visual) o 'list' (Lista por Rango)
  const [agendaViewMode, setAgendaViewMode] = useState<'calendar' | 'list'>('calendar');
  const [agendaCalendarMonth, setAgendaCalendarMonth] = useState<Date>(new Date());

  // Filtros de agenda (fecha actual en Costa Rica)
  const [filterDate, setFilterDate] = useState<string>(() => {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Costa_Rica' }).format(new Date());
  });
  const [filterProfessionalId, setFilterProfessionalId] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Filtros para la vista en lista por rango
  const [rangeStartDate, setRangeStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 3);
    return d.toISOString().split('T')[0];
  });
  const [rangeEndDate, setRangeEndDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 28);
    return d.toISOString().split('T')[0];
  });
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modales
  const [selectedBookingForWa, setSelectedBookingForWa] = useState<any | null>(null);
  const [isWaOpen, setIsWaOpen] = useState<boolean>(false);
  const [waInitialTemplate, setWaInitialTemplate] = useState<WhatsAppTemplateType>('confirmation');
  const [previousScheduleForWa, setPreviousScheduleForWa] = useState<{ date: string; time: string } | undefined>(undefined);
  const [selectedBookingForReschedule, setSelectedBookingForReschedule] = useState<any | null>(null);
  const [isRescheduleOpen, setIsRescheduleOpen] = useState<boolean>(false);
  const [isBlockTimeOpen, setIsBlockTimeOpen] = useState<boolean>(false);
  const [isDayAvailOpen, setIsDayAvailOpen] = useState<boolean>(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState<boolean>(false);
  const [isManualBookingOpen, setIsManualBookingOpen] = useState<boolean>(false);
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const [isProfileOpen, setIsProfileOpen] = useState<boolean>(false);
  const [isServicesOpen, setIsServicesOpen] = useState<boolean>(false);
  const [isLocationsOpen, setIsLocationsOpen] = useState<boolean>(false);
  const [isPushModalOpen, setIsPushModalOpen] = useState<boolean>(false);
  const [selectedDateForAvail, setSelectedDateForAvail] = useState<string | undefined>(undefined);

  // Retroalimentación de acciones
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // 1. Verificar autenticación al montar
  useEffect(() => {
    const token = localStorage.getItem('cnp_auth_token') || '';
    const userStr = localStorage.getItem('cnp_auth_user');

    if (!token && !document.cookie.includes('auth_token')) {
      router.push('/admin/login');
      return;
    }

    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        setCurrentUser(u);
        if (u.role === 'STAFF' && u.professional?.id) {
          setFilterProfessionalId(u.professional.id);
        }
      } catch (e) {}
    }

    setAuthToken(token);

    // Estado inicial de permisos de notificación
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotifGranted(Notification.permission === 'granted');
    }

    // Listener de conectividad
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Evento PWA install
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [router]);

  // 2. Cargar catálogo y reservas
  useEffect(() => {
    if (authToken || document.cookie.includes('auth_token')) {
      loadData();
    }
  }, [authToken, filterProfessionalId, filterStatus]);

  async function loadData() {
    setLoading(true);
    setActionError(null);
    try {
      const [catData, bookData, availData] = await Promise.all([
        fetchCatalog(),
        fetchAdminBookings(authToken, {
          professionalId: filterProfessionalId || undefined,
          status: filterStatus !== 'ALL' ? filterStatus : undefined
        }),
        fetchAdminAvailability(filterProfessionalId || undefined, authToken).catch(() => ({ availabilities: [] }))
      ]);
      setCatalog(catData);
      setBookings(bookData.bookings || []);
      setAvailabilities(availData.availabilities || []);
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes('401') || err.message?.includes('No autorizado')) {
        router.push('/admin/login');
      }
    } finally {
      setLoading(false);
    }
  }

  // 3. Polling en tiempo real: sincroniza citas cada 15 segundos y dispara alerta sonora ante nuevas reservas
  useEffect(() => {
    if (!authToken && !document.cookie.includes('auth_token')) return;
    if (!isOnline) return;

    const interval = setInterval(async () => {
      try {
        const bookData = await fetchAdminBookings(authToken, {
          professionalId: filterProfessionalId || undefined,
          status: filterStatus !== 'ALL' ? filterStatus : undefined
        });

        if (bookData?.bookings) {
          const newPendingCount = bookData.bookings.filter((b: any) => b.status === 'PENDING').length;
          setBookings((prev) => {
            const currentPendingCount = prev.filter((b: any) => b.status === 'PENDING').length;
            if (newPendingCount > currentPendingCount && currentPendingCount >= 0) {
              playNotificationSound();
              showBrowserNotification('¡Nueva Cita en el Salón!', {
                body: `Hay ${newPendingCount} solicitud(es) pendiente(s) por revisar o asignar.`
              });
              setActionSuccess('¡Nueva cita recibida en el salón!');
            }
            return bookData.bookings;
          });
        }
      } catch (_) {
        // Silenciar errores transitorios en polling secundario
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [authToken, isOnline, filterProfessionalId, filterStatus]);

  // Activar audio y notificaciones push
  async function handleEnableNotifications() {
    playNotificationSound();
    const granted = await requestNotificationPermission();
    setNotifGranted(granted);
    if (granted) {
      showBrowserNotification('Notificaciones Activas', {
        body: 'Alertas sonoras y notificaciones habilitadas para Caño Negro Pretty.'
      });
      setActionSuccess('Alertas de audio y notificaciones push activadas.');
    } else {
      setActionSuccess('Tono de prueba reproducido.');
    }
  }

  // Asignar cita a una especialista (con sonido y notificación push)
  async function handleAssignBooking(bookingId: string, profId: string) {
    if (!isOnline) {
      setActionError('Estás sin conexión. No se pueden asignar citas sin sincronizar.');
      return;
    }
    setActionError(null);
    setActionSuccess(null);

    try {
      const res = await assignBookingApi(bookingId, profId, undefined, authToken);
      const targetBooking = bookings.find((b) => b.id === bookingId);
      const profName = catalog?.professionals?.find((p: any) => p.id === profId)?.name || 'Especialista';

      // Disparar audio chime cristalino y notificación push
      showBrowserNotification(`Trabajo asignado a ${profName}`, {
        body: `Cita #${targetBooking?.referenceCode || ''} para ${targetBooking?.clientName || 'Cliente'} asignada a ${profName}. Pendiente de confirmación.`
      });

      setActionSuccess(`Esteticista asignada (${profName}). La cita permanece pendiente y ya puedes confirmarla.`);
      loadData();
    } catch (err: any) {
      setActionError(err.message || 'Error al asignar la cita');
    }
  }

  // Acciones sobre estado de reservas (confirmar, rechazar, completar, cancelar)
  async function handleStatusChange(bookingId: string, newStatus: string) {
    if (!isOnline) {
      setActionError('Estás sin conexión. No se pueden confirmar citas sin sincronizar.');
      return;
    }
    setActionError(null);
    setActionSuccess(null);

    try {
      const targetB = bookings.find((b) => b.id === bookingId);
      const assignedProfId = targetB?.professionalId || targetB?.professional?.id;
      if (newStatus === 'CONFIRMED' && !assignedProfId) {
        setActionError('Debes asignar una esteticista antes de poder confirmar la cita.');
        return;
      }

      await updateBookingStatusApi(bookingId, newStatus, undefined, authToken);
      setActionSuccess(`Reserva actualizada a estado: ${newStatus}`);
      
      // Si se confirmó, abrir automáticamente el modal de WhatsApp con la plantilla de confirmación
      if (newStatus === 'CONFIRMED') {
        const confirmedBooking = bookings.find((b) => b.id === bookingId);
        if (confirmedBooking) {
          setSelectedBookingForWa({ ...confirmedBooking, status: 'CONFIRMED' });
          setWaInitialTemplate('confirmation');
          setPreviousScheduleForWa(undefined);
          setIsWaOpen(true);
        }
      }

      // Si se canceló o rechazó, abrir automáticamente el modal de WhatsApp con la plantilla de cancelación
      if (newStatus === 'CANCELLED' || newStatus === 'REJECTED') {
        const targetBooking = bookings.find((b) => b.id === bookingId);
        if (targetBooking) {
          setSelectedBookingForWa({ ...targetBooking, status: newStatus });
          setWaInitialTemplate('cancellation');
          setPreviousScheduleForWa(undefined);
          setIsWaOpen(true);
        }
      }

      loadData();
    } catch (err: any) {
      setActionError(err.message || 'Error al actualizar reserva');
    }
  }

  async function handleLogout() {
    try {
      if (authToken) {
        await unsubscribeUserFromPush(authToken);
      }
    } catch (_) {}
    localStorage.removeItem('cnp_auth_token');
    localStorage.removeItem('cnp_auth_user');
    router.push('/admin/login');
  }

  function handleInstallPwa() {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(() => setDeferredPrompt(null));
    } else {
      setIsInstallModalOpen(true);
    }
  }

  // Reservas pendientes (pool general + asignadas pendientes)
  const pendingBookings = useMemo(() => {
    return bookings.filter((b) => b.status === 'PENDING');
  }, [bookings]);

  // Citas agrupadas por fecha para el Calendario Visual (en hora de Costa Rica)
  const bookingsByDate = useMemo(() => {
    const map = new Map<string, any[]>();
    const dtf = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Costa_Rica' });
    for (const b of bookings) {
      const dateKey = dtf.format(new Date(b.startTime));
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)!.push(b);
    }
    return map;
  }, [bookings]);

  // Citas para la fecha seleccionada en Vista Calendario
  const calendarDayBookings = useMemo(() => {
    return (bookingsByDate.get(filterDate) || []).sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );
  }, [bookingsByDate, filterDate]);

  // Citas filtradas para la Vista Lista por Rango
  const listRangeBookings = useMemo(() => {
    return bookings.filter((b) => {
      const bTime = new Date(b.startTime).getTime();
      const sTime = new Date(`${rangeStartDate}T00:00:00Z`).getTime();
      const eTime = new Date(`${rangeEndDate}T23:59:59Z`).getTime();
      
      const inRange = bTime >= sTime && bTime <= eTime;
      if (!inRange) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = b.clientName?.toLowerCase().includes(q);
        const matchesPhone = b.clientPhone?.includes(q);
        const matchesService = b.serviceName?.toLowerCase().includes(q);
        const matchesRef = b.referenceCode?.toLowerCase().includes(q);
        const matchesProf = b.professional?.name?.toLowerCase().includes(q);
        if (!matchesName && !matchesPhone && !matchesService && !matchesRef && !matchesProf) return false;
      }

      return true;
    }).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }, [bookings, rangeStartDate, rangeEndDate, searchQuery]);

  return (
    <div className="min-h-screen flex flex-col bg-pretty-cream-50 text-pretty-wine-900 pb-20">
      
      {/* Barra de Aviso Offline */}
      {!isOnline && (
        <div className="bg-amber-600 text-white px-4 py-2 text-xs font-semibold flex items-center justify-center space-x-2 shadow-sm">
          <WifiOff className="w-4 h-4" />
          <span>Sin conexión: Las confirmaciones atómicas están pausadas para evitar solapamientos.</span>
        </div>
      )}

      {/* Cabecera Backoffice Mobile-First con Logo y Menú Integrado */}
      <header className="sticky top-0 z-30 glass-panel border-b border-white/60">
        <div className="max-w-5xl mx-auto px-3 sm:px-4 h-14 sm:h-16 flex items-center justify-between">
          {/* Logo y Marca que NUNCA se desborda ni se trunca */}
          <Link href="/" className="flex items-center space-x-2 min-w-0 mr-2 group">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-pretty-wine-900 to-pretty-pink-500 text-white flex items-center justify-center font-serif font-bold text-xs shadow-sm flex-shrink-0 group-hover:scale-105 transition-transform">
              CN
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-serif text-sm sm:text-base font-bold text-pretty-wine-900 truncate">
                Caño Negro Pretty
              </span>
              <span className="text-[9px] sm:text-[10px] font-semibold text-pretty-wine-700/80 uppercase tracking-wider truncate">
                {currentUser?.role === 'OWNER' ? 'Propietaria' : 'Esteticista'} • {currentUser?.name || 'Personal'}
              </span>
            </div>
          </Link>

          {/* Acciones principales: Cita Rápida + Menú Hamburger */}
          <div className="flex items-center space-x-1.5 sm:space-x-2 flex-shrink-0">
            {/* Botón Nueva Cita Manual */}
            <button
              onClick={() => setIsManualBookingOpen(true)}
              className="inline-flex items-center space-x-1 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-bold text-white bg-pretty-wine-900 hover:bg-pretty-pink-600 transition-all shadow-sm active:scale-95"
              title="Ingresar cita manual"
            >
              <PlusCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="hidden sm:inline">Nueva Cita</span>
              <span className="sm:hidden text-[11px]">Cita</span>
            </button>

            {/* Botón de Menú Hamburger */}
            <button
              onClick={() => setIsMenuOpen(true)}
              className="p-1.5 sm:p-2 rounded-full bg-white/80 hover:bg-white text-pretty-wine-900 border border-white shadow-sm flex items-center space-x-1.5 transition-all"
              title="Menú de opciones, perfil y servicios"
            >
              <Menu className="w-4 h-4 sm:w-5 sm:h-5 text-pretty-wine-900" />
              <span className="hidden sm:inline text-xs font-semibold">Menú</span>
            </button>
          </div>
        </div>

        {/* Pestañas de navegación de bandeja */}
        <div className="max-w-5xl mx-auto px-3 sm:px-4 flex border-t border-pretty-pink-200/40">
          <button
            onClick={() => {
              setActiveTab('pending');
              setFilterStatus('PENDING');
            }}
            className={`flex-1 py-2 sm:py-3 text-[11px] sm:text-xs font-bold text-center border-b-2 transition-all flex items-center justify-center space-x-1 sm:space-x-2 ${
              activeTab === 'pending'
                ? 'border-pretty-wine-900 text-pretty-wine-900'
                : 'border-transparent text-pretty-wine-700/70 hover:text-pretty-wine-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Solicitudes</span>
            {pendingBookings.length > 0 && (
              <span className="bg-pretty-wine-900 text-white text-[10px] px-1.5 py-0.2 rounded-full">
                {pendingBookings.length}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setActiveTab('agenda');
              setFilterStatus('ALL');
            }}
            className={`flex-1 py-2 sm:py-3 text-[11px] sm:text-xs font-bold text-center border-b-2 transition-all flex items-center justify-center space-x-1 sm:space-x-2 ${
              activeTab === 'agenda'
                ? 'border-pretty-wine-900 text-pretty-wine-900'
                : 'border-transparent text-pretty-wine-700/70 hover:text-pretty-wine-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Agenda & Calendario</span>
            <span className="sm:hidden">Agenda</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('availability');
            }}
            className={`flex-1 py-2 sm:py-3 text-[11px] sm:text-xs font-bold text-center border-b-2 transition-all flex items-center justify-center space-x-1 sm:space-x-2 ${
              activeTab === 'availability'
                ? 'border-pretty-wine-900 text-pretty-wine-900'
                : 'border-transparent text-pretty-wine-700/70 hover:text-pretty-wine-900'
            }`}
          >
            <Unlock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Apertura de Agenda</span>
            <span className="sm:hidden">Apertura</span>
          </button>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="max-w-5xl mx-auto px-3 sm:px-4 pt-4 flex-1 w-full">
        
        {/* Mensajes de Alerta / Éxito */}
        {actionError && (
          <div className="mb-4 p-3 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-center space-x-2 shadow-sm">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 text-red-600" />
            <span className="font-medium">{actionError}</span>
          </div>
        )}

        {actionSuccess && (
          <div className="mb-4 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center space-x-2 shadow-sm">
            <Check className="w-4 h-4 flex-shrink-0 text-emerald-600" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {/* TAB 1: BANDEJA DE PENDIENTES & SOLICITUDES */}
        {activeTab === 'pending' && (
          <div className="space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="font-serif text-lg sm:text-xl font-bold text-pretty-wine-900">
                  Bandeja de Solicitudes y Asignación
                </h2>
                <p className="text-xs text-pretty-wine-800/80">
                  Las citas nuevas llegan a la bandeja de todo el equipo. Puedes autoasignártela o asignarla a una compañera con espacio libre.
                </p>
              </div>

              <button
                onClick={() => setIsManualBookingOpen(true)}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-white bg-pretty-wine-900 hover:bg-pretty-pink-600 transition-all self-start sm:self-auto shadow-sm"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Ingresar Cita Manual</span>
              </button>
            </div>

            {/* Filtro Dropdown por Estilista para la Propietaria */}
            {currentUser?.role === 'OWNER' && (
              <div className="flex items-center justify-between gap-2 p-2 rounded-2xl bg-white/70 border border-white/90 relative z-20">
                <div className="flex items-center space-x-2">
                  <span className="text-[11px] font-bold text-pretty-wine-700/80 flex items-center space-x-1 pl-1">
                    <User className="w-3.5 h-3.5 text-pretty-pink-500" />
                    <span>Filtrar bandeja:</span>
                  </span>

                  <StylistDropdown
                    value={filterProfessionalId}
                    onChange={setFilterProfessionalId}
                    professionals={catalog?.professionals || []}
                    allLabel="Todas las solicitudes"
                    allSublabel="Bandeja general completa"
                    unassignedLabel="Sin asignar"
                    unassignedSublabel="Pendientes de asignación"
                    headerTitle="Filtrar Solicitudes"
                    title="Filtrar solicitudes por estilista"
                    align="left"
                  />
                </div>

                <div className="text-[11px] text-pretty-wine-700/70 font-semibold px-2">
                  {pendingBookings.length} {pendingBookings.length === 1 ? 'pendiente' : 'pendientes'}
                </div>
              </div>
            )}

            {loading ? (
              <div className="py-12 text-center text-xs text-pretty-wine-800/80">
                Consultando solicitudes...
              </div>
            ) : pendingBookings.length === 0 ? (
              <div className="glass-panel rounded-3xl p-6 sm:p-8 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <h4 className="font-serif text-lg font-bold text-pretty-wine-900">
                  ¡Bandeja al día!
                </h4>
                <p className="text-xs text-pretty-wine-800/80">
                  No tienes solicitudes pendientes por asignar o confirmar en este momento.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingBookings.map((b) => {
                  const isUnassigned = !b.professional;
                  const assignedProfId = b.professionalId || b.professional?.id;
                  const canSelfAssign = currentUser?.professional?.id && (isUnassigned || b.professional?.id !== currentUser.professional.id);

                  return (
                    <div
                      key={b.id}
                      className={`glass-panel rounded-2xl p-3.5 sm:p-5 transition-all border ${
                        b.hasConflict
                          ? 'border-amber-400/80 bg-amber-50/50'
                          : isUnassigned
                          ? 'border-pretty-pink-300 bg-white/90 shadow-sm'
                          : 'border-white/80'
                      }`}
                    >
                      {/* Alerta de Conflicto de Concurrencia */}
                      {b.hasConflict && (
                        <div className="mb-3 p-2.5 rounded-xl bg-amber-100/90 border border-amber-300 text-xs text-amber-900 flex items-start space-x-2">
                          <AlertTriangle className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
                          <div>
                            <strong className="font-bold">Advertencia de Conflicto: </strong>
                            {b.conflictMessage || 'Existen dos solicitudes en la misma franja horaria.'}
                          </div>
                        </div>
                      )}

                      {/* Header de la tarjeta */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-pretty-pink-100">
                        <div>
                          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                            <span className="font-mono text-xs font-bold text-pretty-wine-700 bg-white/80 px-2 py-0.5 rounded-md border border-pretty-pink-200">
                              #{b.referenceCode}
                            </span>
                            <h4 className="font-serif text-sm sm:text-base font-bold text-pretty-wine-900">
                              {b.clientName}
                            </h4>
                            {isUnassigned ? (
                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                <Users className="w-3 h-3 text-amber-600" />
                                <span>Bandeja General (Sin asignar)</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-pretty-pink-100 text-pretty-wine-900 border border-pretty-pink-200">
                                <User className="w-3 h-3 text-pretty-pink-600" />
                                <span>Asignada a: {b.professional?.name || 'Esteticista'} (Pendiente de aceptar)</span>
                              </span>
                            )}
                          </div>
                          
                          <div className="text-xs text-pretty-wine-800/80 flex items-center space-x-3 mt-1.5 flex-wrap gap-y-1">
                            <span className="flex items-center space-x-1">
                              <Phone className="w-3 h-3 text-pretty-pink-500" />
                              <a href={`tel:${b.clientPhone}`} className="hover:underline font-semibold font-mono">
                                {b.clientPhone}
                              </a>
                            </span>
                          </div>
                        </div>

                        <div className="sm:text-right">
                          <span className="font-serif text-sm sm:text-base font-bold text-pretty-wine-900">
                            {formatCRC(b.totalCRC)}
                          </span>
                          <span className="text-[10px] sm:text-[11px] text-pretty-wine-700/70 block">
                            {b.modality === 'HOME_VISIT' ? `A domicilio (${b.locationName || 'Caño Negro'})` : 'En estación'}
                          </span>
                        </div>
                      </div>

                      {/* Detalles de la cita */}
                      <div className="py-2.5 text-xs text-pretty-wine-800/90 space-y-1">
                        <div>
                          <strong>Servicio:</strong> {b.serviceName} ({b.durationMinutes} min)
                        </div>
                        <div>
                          <strong>Fecha y hora solicitada:</strong> {new Date(b.startTime).toLocaleString('es-CR', {
                            weekday: 'short',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                        {b.customAddress && (
                          <div>
                            <strong>Señas de domicilio:</strong> {b.customAddress}
                          </div>
                        )}
                        {b.clientNotes && (
                          <div className="italic text-pretty-wine-700/80">
                            <strong>Nota clienta:</strong> "{b.clientNotes}"
                          </div>
                        )}
                      </div>

                      {/* Asignación y Acciones */}
                      <div className="pt-3 border-t border-pretty-pink-100 flex flex-wrap items-center justify-between gap-2">
                        
                        {/* Selector de Asignación */}
                        <div className="flex items-center space-x-1.5 flex-wrap gap-y-1.5">
                          {canSelfAssign && (
                            <button
                              onClick={() => handleAssignBooking(b.id, currentUser.professional.id)}
                              className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-full text-xs font-bold text-white bg-pretty-pink-600 hover:bg-pretty-wine-900 transition-all shadow-sm active:scale-95"
                            >
                              <User className="w-3.5 h-3.5" />
                              <span>Asignarme a mí</span>
                            </button>
                          )}

                          <select
                            value=""
                            onChange={(e) => {
                              if (e.target.value) {
                                handleAssignBooking(b.id, e.target.value);
                              }
                            }}
                            className="px-2.5 py-1.5 rounded-xl border border-pretty-pink-200 bg-white text-xs font-semibold text-pretty-wine-900 focus:outline-none focus:ring-2 focus:ring-pretty-pink-400"
                          >
                            <option value="" disabled>
                              {isUnassigned ? 'Asignar a especialista...' : 'Reasignar a...'}
                            </option>
                            {catalog?.professionals?.map((p: any) => {
                              // Verificar si esta profesional ya tiene una cita confirmada en este intervalo
                              const hasConflict = bookings.some((other) => {
                                if (other.id === b.id || other.status !== 'CONFIRMED') return false;
                                const otherProfId = other.professionalId || other.professional?.id;
                                if (otherProfId !== p.id) return false;
                                return (
                                  new Date(b.startTime) < new Date(other.endTime) &&
                                  new Date(b.endTime) > new Date(other.startTime)
                                );
                              });

                              const isCurrentAssigned = (b.professionalId || b.professional?.id) === p.id;

                              return (
                                <option key={p.id} value={p.id} disabled={hasConflict}>
                                  {p.name} {hasConflict ? '(Ocupada en este horario)' : isCurrentAssigned ? '(Asignada actual)' : ''}
                                </option>
                              );
                            })}
                          </select>
                        </div>

                        {/* Botones de Cambiar Horario / WhatsApp / Rechazar / Confirmar */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedBookingForReschedule(b);
                              setIsRescheduleOpen(true);
                            }}
                            className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-full text-xs font-semibold bg-white hover:bg-pretty-pink-50 text-pretty-wine-900 border border-pretty-pink-200 shadow-sm transition-all"
                            title="Cambiar fecha u hora de la cita"
                          >
                            <CalendarClock className="w-3.5 h-3.5 text-pretty-pink-500" />
                            <span>Cambiar horario</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedBookingForWa(b);
                              setWaInitialTemplate('confirmation');
                              setPreviousScheduleForWa(undefined);
                              setIsWaOpen(true);
                            }}
                            className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-full text-xs font-semibold bg-white hover:bg-pretty-pink-50 text-pretty-wine-900 border border-pretty-pink-200 shadow-sm"
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                            <span>WhatsApp</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`¿Deseas rechazar la solicitud de cita #${b.referenceCode}? Se abrirá WhatsApp para notificar a la clienta.`)) {
                                handleStatusChange(b.id, 'REJECTED');
                              }
                            }}
                            className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-full text-xs font-semibold text-rose-700 hover:bg-rose-50 border border-rose-200 transition-all"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Rechazar</span>
                          </button>

                          <button
                            disabled={isUnassigned}
                            onClick={() => {
                              if (isUnassigned) {
                                setActionError('Debes asignar una esteticista antes de poder confirmar la cita.');
                                return;
                              }
                              handleStatusChange(b.id, 'CONFIRMED');
                            }}
                            title={isUnassigned ? 'Asigna primero una esteticista para habilitar la confirmación' : 'Confirmar Cita'}
                            className={`inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm ${
                              isUnassigned
                                ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed opacity-75'
                                : 'text-white bg-pretty-wine-900 hover:bg-pretty-pink-600 active:scale-95'
                            }`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>
                              {isUnassigned
                                ? 'Requiere Asignar'
                                : currentUser?.professional?.id === assignedProfId
                                ? 'Aceptar y Confirmar Cita'
                                : 'Confirmar Cita'}
                            </span>
                          </button>
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: AGENDA Y CALENDARIO DUAL (CALENDARIO VISUAL VS LISTA POR RANGO) */}
        {activeTab === 'agenda' && (
          <div className="space-y-4">
            
            {/* Barra de Controles y Selector de Modo de Vista */}
            <div className="glass-panel rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-20">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-serif text-base sm:text-lg font-bold text-pretty-wine-900">
                    Agenda del Salón
                  </h3>
                  {currentUser?.role === 'OWNER' && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pretty-pink-200/80 text-pretty-wine-900">
                      Propietaria (Todas las citas)
                    </span>
                  )}
                </div>
                <p className="text-xs text-pretty-wine-800/80">
                  {currentUser?.role === 'OWNER'
                    ? 'Monitorea todas las citas del salón o filtra por estilista específica.'
                    : 'Explora las citas en el calendario visual interactivo o en el listado por rango de fechas.'}
                </p>
              </div>

              <div className="flex items-center justify-between gap-1.5 w-full sm:w-auto">
                {/* Selector Elegante de Estilista para la Propietaria (Custom Pretty Dropdown) */}
                {currentUser?.role === 'OWNER' && (
                  <StylistDropdown
                    value={filterProfessionalId}
                    onChange={setFilterProfessionalId}
                    professionals={catalog?.professionals || []}
                    allLabel="Todas las Estilistas"
                    allSublabel="Agenda completa del salón"
                    unassignedLabel="Sin asignar"
                    unassignedSublabel="Citas pendientes de asignación"
                    headerTitle="Filtrar Citas del Salón"
                    title="Filtrar agenda por estilista"
                    align="left"
                  />
                )}

                {/* Toggle de Subvista */}
                <div className="flex items-center space-x-0.5 p-1 rounded-2xl bg-pretty-pink-100/70 border border-pretty-pink-200/60 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setAgendaViewMode('calendar')}
                    className={`inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      agendaViewMode === 'calendar'
                        ? 'bg-pretty-wine-900 text-white shadow-sm'
                        : 'text-pretty-wine-900 hover:bg-white/60'
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Calendario<span className="hidden md:inline"> Visual</span></span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAgendaViewMode('list')}
                    className={`inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      agendaViewMode === 'list'
                        ? 'bg-pretty-wine-900 text-white shadow-sm'
                        : 'text-pretty-wine-900 hover:bg-white/60'
                    }`}
                  >
                    <ListFilter className="w-3.5 h-3.5" />
                    <span>Lista<span className="hidden md:inline"> por Rango</span></span>
                  </button>
                </div>
              </div>
            </div>

            {/* SUBVISTA 1: CALENDARIO VISUAL INTERACTIVO */}
            {agendaViewMode === 'calendar' && (
              <div className="space-y-4">
                
                {/* Cuadrícula Mensual del Calendario */}
                <div className="glass-panel rounded-3xl p-4 sm:p-5 shadow-glass space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-pretty-pink-500" />
                      <span className="font-serif text-base font-bold text-pretty-wine-900 capitalize">
                        {agendaCalendarMonth.toLocaleDateString('es-CR', { month: 'long', year: 'numeric' })}
                      </span>
                    </div>

                    <div className="flex items-center space-x-1">
                      <button
                        type="button"
                        onClick={() => {
                          const prev = new Date(agendaCalendarMonth);
                          prev.setMonth(prev.getMonth() - 1);
                          setAgendaCalendarMonth(prev);
                        }}
                        className="p-1.5 rounded-lg bg-white/80 hover:bg-white text-pretty-wine-900 shadow-sm"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const next = new Date(agendaCalendarMonth);
                          next.setMonth(next.getMonth() + 1);
                          setAgendaCalendarMonth(next);
                        }}
                        className="p-1.5 rounded-lg bg-white/80 hover:bg-white text-pretty-wine-900 shadow-sm"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Cabecera de días de la semana */}
                  <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase text-pretty-wine-700/70 py-1">
                    <span>Dom</span>
                    <span>Lun</span>
                    <span>Mar</span>
                    <span>Mié</span>
                    <span>Jue</span>
                    <span>Vie</span>
                    <span>Sáb</span>
                  </div>

                  {/* Celdas de días del mes */}
                  <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
                    {/* Espacios vacíos antes del primer día */}
                    {Array.from({ length: new Date(agendaCalendarMonth.getFullYear(), agendaCalendarMonth.getMonth(), 1).getDay() }).map((_, i) => (
                      <div key={`empty-${i}`} className="h-11 sm:h-16 rounded-xl bg-white/20" />
                    ))}

                    {/* Días del mes */}
                    {Array.from({ length: new Date(agendaCalendarMonth.getFullYear(), agendaCalendarMonth.getMonth() + 1, 0).getDate() }).map((_, i) => {
                      const dayNum = i + 1;
                      const dateStr = `${agendaCalendarMonth.getFullYear()}-${String(agendaCalendarMonth.getMonth() + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                      const dayBookings = bookingsByDate.get(dateStr) || [];
                      const count = dayBookings.length;
                      const isSelected = filterDate === dateStr;

                      const hasConfirmed = dayBookings.some((b) => b.status === 'CONFIRMED');
                      const hasPending = dayBookings.some((b) => b.status === 'PENDING');
                      const hasCompleted = dayBookings.some((b) => b.status === 'COMPLETED');

                      return (
                        <button
                          key={dateStr}
                          type="button"
                          onClick={() => setFilterDate(dateStr)}
                          className={`h-11 sm:h-16 rounded-xl p-1 text-left flex flex-col justify-between transition-all border min-w-0 ${
                            isSelected
                              ? 'bg-pretty-pink-100/90 border-pretty-wine-900 ring-2 ring-pretty-wine-900/20 shadow-sm'
                              : count > 0
                              ? 'bg-white/90 border-pretty-pink-200/80 hover:bg-white'
                              : 'bg-white/50 border-white/60 hover:bg-white/80'
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <span className={`text-xs font-bold ${isSelected ? 'text-pretty-wine-900' : 'text-pretty-wine-800'}`}>
                              {dayNum}
                            </span>
                            {count > 0 && (
                              <span className="text-[9px] font-mono font-bold bg-pretty-wine-900 text-white px-1 rounded-full">
                                {count}
                              </span>
                            )}
                          </div>

                          {/* Puntos / indicadores de estado */}
                          <div className="flex items-center space-x-1 mt-auto">
                            {hasConfirmed && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Confirmadas" />}
                            {hasPending && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" title="Pendientes" />}
                            {hasCompleted && <span className="w-1.5 h-1.5 rounded-full bg-pretty-pink-500" title="Completadas" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Listado de Citas para el Día Seleccionado */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-serif text-base font-bold text-pretty-wine-900 flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-pretty-pink-500" />
                      <span>Citas del {filterDate}: ({calendarDayBookings.length})</span>
                    </h4>

                    <button
                      onClick={() => setIsManualBookingOpen(true)}
                      className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-semibold bg-white hover:bg-pretty-pink-50 text-pretty-wine-900 border border-pretty-pink-200 shadow-sm"
                    >
                      <PlusCircle className="w-3.5 h-3.5 text-pretty-pink-500" />
                      <span>Añadir a este día</span>
                    </button>
                  </div>

                  {calendarDayBookings.length === 0 ? (
                    <div className="glass-panel rounded-2xl p-6 text-center text-xs text-pretty-wine-800/80">
                      No hay citas programadas para el {filterDate}.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {calendarDayBookings.map((b) => {
                        const startTimeStr = new Date(b.startTime).toLocaleTimeString('es-CR', {
                          hour: '2-digit',
                          minute: '2-digit'
                        });
                        const endTimeStr = new Date(b.endTime).toLocaleTimeString('es-CR', {
                          hour: '2-digit',
                          minute: '2-digit'
                        });

                        return (
                          <div
                            key={b.id}
                            className="glass-panel rounded-2xl p-3.5 sm:p-4 border border-white/80 space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <span className="font-serif text-sm font-bold text-pretty-wine-900">
                                  {startTimeStr} – {endTimeStr}
                                </span>
                                <span className="text-[11px] text-pretty-wine-700/80">
                                  ({b.durationMinutes} min)
                                </span>
                              </div>

                              {/* Estado */}
                              {b.status === 'CONFIRMED' && (
                                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  <span>Confirmada</span>
                                </span>
                              )}
                              {b.status === 'PENDING' && (
                                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                  <Clock className="w-3 h-3 text-amber-600" />
                                  <span>Pendiente</span>
                                </span>
                              )}
                              {b.status === 'COMPLETED' && (
                                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-pretty-pink-100 text-pretty-wine-900 border border-pretty-pink-300">
                                  <Sparkles className="w-3 h-3 text-pretty-pink-600" />
                                  <span>Completada</span>
                                </span>
                              )}
                              {b.status === 'CANCELLED' && (
                                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700 border border-gray-200">
                                  <Ban className="w-3 h-3 text-gray-500" />
                                  <span>Cancelada</span>
                                </span>
                              )}
                              {b.status === 'REJECTED' && (
                                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                  <XCircle className="w-3 h-3 text-rose-600" />
                                  <span>Rechazada</span>
                                </span>
                              )}
                            </div>

                            <div className="flex flex-col sm:flex-row justify-between text-xs text-pretty-wine-800/90 gap-1 pt-1 border-t border-pretty-pink-100">
                              <div>
                                <strong className="text-pretty-wine-950 font-serif text-sm block">
                                  {b.clientName}
                                </strong>
                                <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                  <span>{b.serviceName}</span>
                                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-pretty-pink-100 text-pretty-wine-900 border border-pretty-pink-200">
                                    <User className="w-2.5 h-2.5 text-pretty-pink-600" />
                                    <span>{b.professional?.name || 'Sin asignar'}</span>
                                  </span>
                                </div>
                              </div>
                              <div className="sm:text-right">
                                <span className="font-bold text-pretty-wine-900">{formatCRC(b.totalCRC)}</span>
                                <span className="text-[10px] text-pretty-wine-700/80 block">
                                  {b.modality === 'HOME_VISIT' ? `A domicilio (${b.locationName || 'Caño Negro'})` : 'En estación'}
                                </span>
                              </div>
                            </div>

                            {/* Acciones */}
                            <div className="pt-2 flex flex-wrap items-center justify-end gap-1.5 border-t border-pretty-pink-100">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedBookingForReschedule(b);
                                  setIsRescheduleOpen(true);
                                }}
                                className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-white hover:bg-pretty-pink-50 text-pretty-wine-900 border border-pretty-pink-200 transition-all"
                                title="Cambiar fecha u hora de la cita"
                              >
                                <CalendarClock className="w-3 h-3 text-pretty-pink-500" />
                                <span>Cambiar horario</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedBookingForWa(b);
                                  setWaInitialTemplate('confirmation');
                                  setPreviousScheduleForWa(undefined);
                                  setIsWaOpen(true);
                                }}
                                className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-white hover:bg-pretty-pink-50 text-pretty-wine-900 border border-pretty-pink-200"
                              >
                                <MessageSquare className="w-3 h-3 text-emerald-600" />
                                <span>WhatsApp</span>
                              </button>

                              {b.status === 'CONFIRMED' && (
                                <>
                                  <button
                                    onClick={() => handleStatusChange(b.id, 'COMPLETED')}
                                    className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold text-pretty-wine-900 bg-pretty-pink-100 hover:bg-pretty-pink-200"
                                  >
                                    <Sparkles className="w-3 h-3" />
                                    <span>Completar</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (window.confirm(`¿Estás segura de cancelar la cita #${b.referenceCode}? Se abrirá WhatsApp con el mensaje de cancelación listo para la clienta.`)) {
                                        handleStatusChange(b.id, 'CANCELLED');
                                      }
                                    }}
                                    className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all"
                                  >
                                    <Ban className="w-3 h-3 text-rose-600" />
                                    <span>Cancelar</span>
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SUBVISTA 2: LISTA POR RANGO DE FECHAS */}
            {agendaViewMode === 'list' && (
              <div className="space-y-3.5">
                
                {/* Filtros de la Vista en Lista con dimensiones idénticas en iOS */}
                <div className={`glass-panel rounded-2xl p-3 sm:p-4 grid gap-2.5 ${
                  currentUser?.role === 'OWNER'
                    ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-5'
                    : 'grid-cols-1 sm:grid-cols-4'
                }`}>
                  <div className="min-w-0">
                    <label className="block text-[11px] font-semibold text-pretty-wine-800 mb-1">
                      Fecha Inicio:
                    </label>
                    <input
                      type="date"
                      value={rangeStartDate}
                      onChange={(e) => setRangeStartDate(e.target.value)}
                      className="w-full max-w-full h-10 px-3 py-2 rounded-xl border border-pretty-pink-200 bg-white text-xs font-medium min-w-0 box-border text-pretty-wine-900 focus:outline-none focus:ring-1 focus:ring-pretty-pink-400 appearance-none"
                    />
                  </div>

                  <div className="min-w-0">
                    <label className="block text-[11px] font-semibold text-pretty-wine-800 mb-1">
                      Fecha Fin:
                    </label>
                    <input
                      type="date"
                      value={rangeEndDate}
                      onChange={(e) => setRangeEndDate(e.target.value)}
                      className="w-full max-w-full h-10 px-3 py-2 rounded-xl border border-pretty-pink-200 bg-white text-xs font-medium min-w-0 box-border text-pretty-wine-900 focus:outline-none focus:ring-1 focus:ring-pretty-pink-400 appearance-none"
                    />
                  </div>

                  {currentUser?.role === 'OWNER' && (
                    <div className="min-w-0">
                      <label className="block text-[11px] font-semibold text-pretty-wine-800 mb-1">
                        Estilista:
                      </label>
                      <div className="relative">
                        <select
                          value={filterProfessionalId}
                          onChange={(e) => setFilterProfessionalId(e.target.value)}
                          className="w-full h-10 pl-3 pr-8 py-2 rounded-xl border border-pretty-pink-200 bg-white text-xs font-medium min-w-0 box-border text-pretty-wine-900 focus:outline-none focus:ring-1 focus:ring-pretty-pink-400 appearance-none"
                        >
                          <option value="">Todas las estilistas</option>
                          {catalog?.professionals?.map((p: any) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                          <option value="UNASSIGNED">Sin asignar</option>
                        </select>
                        <ChevronDown className="w-4 h-4 absolute right-3 top-3 text-pretty-wine-700 pointer-events-none" />
                      </div>
                    </div>
                  )}

                  <div className="min-w-0">
                    <label className="block text-[11px] font-semibold text-pretty-wine-800 mb-1">
                      Estado:
                    </label>
                    <div className="relative">
                      <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="w-full h-10 pl-3 pr-8 py-2 rounded-xl border border-pretty-pink-200 bg-white text-xs font-medium min-w-0 box-border text-pretty-wine-900 focus:outline-none focus:ring-1 focus:ring-pretty-pink-400 appearance-none"
                      >
                        <option value="ALL">Todos los estados</option>
                        <option value="CONFIRMED">Confirmadas</option>
                        <option value="PENDING">Pendientes</option>
                        <option value="COMPLETED">Completadas</option>
                        <option value="CANCELLED">Canceladas</option>
                        <option value="REJECTED">Rechazadas</option>
                      </select>
                      <ChevronDown className="w-4 h-4 absolute right-3 top-3 text-pretty-wine-700 pointer-events-none" />
                    </div>
                  </div>

                  <div className="min-w-0">
                    <label className="block text-[11px] font-semibold text-pretty-wine-800 mb-1">
                      Buscar:
                    </label>
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-pretty-wine-600/60" />
                      <input
                        type="text"
                        placeholder="Clienta o servicio..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full h-10 pl-9 pr-3 py-2 rounded-xl border border-pretty-pink-200 bg-white text-xs font-medium min-w-0 box-border text-pretty-wine-900 focus:outline-none focus:ring-1 focus:ring-pretty-pink-400"
                      />
                    </div>
                  </div>
                </div>

                {/* Listado de citas coincidentes */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-semibold text-pretty-wine-800/80">
                      Mostrando {listRangeBookings.length} reservas en el rango:
                    </span>
                  </div>

                  {listRangeBookings.length === 0 ? (
                    <div className="glass-panel rounded-2xl p-6 text-center text-xs text-pretty-wine-800/80">
                      No hay citas para el rango y filtros seleccionados.
                    </div>
                  ) : (
                    listRangeBookings.map((b) => (
                      <div
                        key={b.id}
                        className="glass-panel rounded-2xl p-3 sm:p-4 border border-white/80 space-y-2"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-mono text-xs font-bold text-pretty-wine-700 bg-white px-1.5 py-0.5 rounded border border-pretty-pink-200">
                                #{b.referenceCode}
                              </span>
                              <span className="font-serif text-sm font-bold text-pretty-wine-900">
                                {b.clientName}
                              </span>
                              <span className="text-xs text-pretty-wine-700/80 font-mono">
                                ({b.clientPhone})
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5 text-xs text-pretty-wine-800/80 mt-0.5">
                              <span>
                                {new Date(b.startTime).toLocaleString('es-CR', {
                                  weekday: 'short',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })} · {b.serviceName}
                              </span>
                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-pretty-pink-100 text-pretty-wine-900 border border-pretty-pink-200">
                                <User className="w-2.5 h-2.5 text-pretty-pink-600" />
                                <span>{b.professional?.name || 'Sin asignar'}</span>
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2 justify-between sm:justify-end">
                            <span className="font-bold text-xs text-pretty-wine-900">
                              {formatCRC(b.totalCRC)}
                            </span>

                            {b.status === 'CONFIRMED' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                Confirmada
                              </span>
                            )}
                            {b.status === 'PENDING' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                Pendiente
                              </span>
                            )}
                            {b.status === 'COMPLETED' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-pretty-pink-100 text-pretty-wine-900 border border-pretty-pink-300">
                                Completada
                              </span>
                            )}
                            {b.status === 'CANCELLED' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700">
                                Cancelada
                              </span>
                            )}
                            {b.status === 'REJECTED' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                                Rechazada
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Acciones */}
                        <div className="pt-2 flex flex-wrap items-center justify-end gap-1.5 border-t border-pretty-pink-100">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedBookingForReschedule(b);
                              setIsRescheduleOpen(true);
                            }}
                            className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-white hover:bg-pretty-pink-50 text-pretty-wine-900 border border-pretty-pink-200 transition-all"
                            title="Cambiar fecha u hora de la cita"
                          >
                            <CalendarClock className="w-3 h-3 text-pretty-pink-500" />
                            <span>Cambiar horario</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedBookingForWa(b);
                              setWaInitialTemplate('confirmation');
                              setPreviousScheduleForWa(undefined);
                              setIsWaOpen(true);
                            }}
                            className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-white hover:bg-pretty-pink-50 text-pretty-wine-900 border border-pretty-pink-200"
                          >
                            <MessageSquare className="w-3 h-3 text-emerald-600" />
                            <span>WhatsApp</span>
                          </button>

                          {b.status === 'CONFIRMED' && (
                            <>
                              <button
                                onClick={() => handleStatusChange(b.id, 'COMPLETED')}
                                className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold text-pretty-wine-900 bg-pretty-pink-100 hover:bg-pretty-pink-200"
                              >
                                <Sparkles className="w-3 h-3" />
                                <span>Completar</span>
                              </button>

                               <button
                                type="button"
                                onClick={() => {
                                  if (window.confirm(`¿Estás segura de cancelar la cita #${b.referenceCode}? Se abrirá WhatsApp con el mensaje de cancelación listo para la clienta.`)) {
                                    handleStatusChange(b.id, 'CANCELLED');
                                  }
                                }}
                                className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all"
                              >
                                <Ban className="w-3 h-3 text-rose-600" />
                                <span>Cancelar</span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>

              </div>
            )}

          </div>
        )}

        {/* TAB 3: APERTURA DE AGENDA Y DESBLOQUEO DE FECHAS */}
        {activeTab === 'availability' && (
          <div className="space-y-4">
            <div className="glass-panel rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-20">
              <div>
                <h3 className="font-serif text-base sm:text-lg font-bold text-pretty-wine-900">
                  Apertura y Desbloqueo de Citas a Futuro
                </h3>
                <p className="text-xs text-pretty-wine-800/80">
                  Las clientas solo pueden agendar en los días y horarios que tú desbloquees aquí.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                {currentUser?.role === 'OWNER' && (
                  <StylistDropdown
                    value={filterProfessionalId}
                    onChange={setFilterProfessionalId}
                    professionals={catalog?.professionals || []}
                    allLabel="Todas las estilistas"
                    allSublabel="Horarios globales del salón"
                    showUnassigned={false}
                    headerTitle="Filtrar Apertura"
                    title="Filtrar horarios por estilista"
                    searchPlaceholder="Buscar estilista..."
                    align="left"
                  />
                )}

                <button
                  onClick={() => {
                    setSelectedDateForAvail(undefined);
                    setIsDayAvailOpen(true);
                  }}
                  className="inline-flex items-center space-x-1 px-3.5 py-1.5 rounded-full text-xs font-bold text-white bg-pretty-wine-900 hover:bg-pretty-pink-600 transition-all shadow-sm flex-shrink-0"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  <span>Apertura de Días</span>
                </button>
              </div>
            </div>

            {/* Listado de fechas próximas (próximos 21 días) */}
            <div className="space-y-2">
              {Array.from({ length: 21 }).map((_, i) => {
                const d = new Date();
                d.setDate(d.getDate() + i);
                const dateStr = d.toISOString().split('T')[0];
                const avail = availabilities.find(
                  (a) =>
                    a.date === dateStr &&
                    (!filterProfessionalId || a.professionalId === filterProfessionalId)
                );
                const isOpen = avail?.isOpen === true;

                const dayLabel = d.toLocaleDateString('es-CR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                });

                return (
                  <div
                    key={dateStr}
                    className={`glass-panel rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border transition-all ${
                      isOpen
                        ? 'border-pretty-pink-300 bg-white/80'
                        : 'border-white/60 bg-white/40 opacity-70'
                    }`}
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-serif text-xs sm:text-sm font-bold text-pretty-wine-900 capitalize">
                          {dayLabel}
                        </span>
                        {isOpen ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex-shrink-0">
                            <Unlock className="w-3 h-3 text-emerald-600" />
                            <span>Desbloqueado ({avail.startTime} – {avail.endTime})</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600 border border-gray-200 flex-shrink-0">
                            <Lock className="w-3 h-3 text-gray-500" />
                            <span>Bloqueado</span>
                          </span>
                        )}
                      </div>
                      {avail?.customNote && (
                        <p className="text-[11px] text-pretty-wine-700/80 mt-0.5">
                          Nota: {avail.customNote}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center space-x-2 justify-end">
                      <button
                        onClick={() => {
                          setSelectedDateForAvail(dateStr);
                          setIsDayAvailOpen(true);
                        }}
                        className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-white hover:bg-pretty-pink-50 text-pretty-wine-900 border border-pretty-pink-200 shadow-sm"
                      >
                        <Settings2 className="w-3.5 h-3.5 text-pretty-pink-500" />
                        <span>{isOpen ? 'Modificar Horario' : 'Desbloquear'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        )}

      </main>

      {/* Modal de Cita Manual */}
      <ManualBookingModal
        isOpen={isManualBookingOpen}
        onClose={() => setIsManualBookingOpen(false)}
        catalog={catalog}
        token={authToken}
        activeTab={activeTab}
        onSuccess={() => {
          loadData();
          setActionSuccess('Cita manual registrada. Si fue asignada a una compañera, aparecerá como pendiente hasta que ella la acepte y confirme.');
        }}
      />

      {/* Modal de WhatsApp */}
      <WhatsAppModal
        isOpen={isWaOpen}
        onClose={() => setIsWaOpen(false)}
        booking={selectedBookingForWa}
        initialTemplate={waInitialTemplate}
        previousSchedule={previousScheduleForWa}
      />

      {/* Modal de Cambio de Horario / Reprogramación */}
      <RescheduleModal
        isOpen={isRescheduleOpen}
        onClose={() => setIsRescheduleOpen(false)}
        booking={selectedBookingForReschedule}
        professionals={catalog?.professionals || []}
        token={authToken}
        onSuccess={(updatedBooking, previousSchedule) => {
          loadData();
          setActionSuccess(`Cita #${updatedBooking.referenceCode} reprogramada con éxito.`);
          // Abrir modal de WhatsApp con la plantilla de cambio de horario lista para enviar
          setSelectedBookingForWa(updatedBooking);
          setWaInitialTemplate('reschedule');
          setPreviousScheduleForWa(previousSchedule);
          setIsWaOpen(true);
        }}
      />

      {/* Modal de Bloqueo de Tiempo */}
      <BlockTimeModal
        isOpen={isBlockTimeOpen}
        onClose={() => setIsBlockTimeOpen(false)}
        professionals={catalog?.professionals || []}
        token={authToken}
        onSuccess={loadData}
      />

      {/* Modal de Apertura y Desbloqueo de Días */}
      <DayAvailabilityModal
        isOpen={isDayAvailOpen}
        onClose={() => setIsDayAvailOpen(false)}
        professionalId={filterProfessionalId || catalog?.professionals[0]?.id || 'prof_elena'}
        professionalName={
          catalog?.professionals.find((p: any) => p.id === (filterProfessionalId || catalog?.professionals[0]?.id))?.name || 'Esteticista'
        }
        initialDate={selectedDateForAvail}
        token={authToken}
        onSuccess={loadData}
      />

      {/* Modal de Instrucciones de Instalación PWA */}
      <InstallPwaModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
      />

      {/* Modal Mi Cuenta / Perfil */}
      <AdminProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        currentUser={currentUser}
        token={authToken}
        onProfileUpdated={(updated) => {
          setCurrentUser(updated);
          localStorage.setItem('cnp_auth_user', JSON.stringify(updated));
        }}
      />

      {/* Modal Gestión de Servicios del Salón */}
      <AdminServicesModal
        isOpen={isServicesOpen}
        onClose={() => setIsServicesOpen(false)}
        token={authToken}
        catalog={catalog}
        onServicesUpdated={() => {
          loadData();
        }}
      />

      {/* Modal Tarifas y Ubicaciones de Domicilio */}
      <AdminLocationsModal
        isOpen={isLocationsOpen}
        onClose={() => setIsLocationsOpen(false)}
        token={authToken}
        onLocationsUpdated={() => {
          loadData();
        }}
      />

      {/* Modal Centro de Notificaciones & Web Push */}
      <PushNotificationModal
        isOpen={isPushModalOpen}
        onClose={() => setIsPushModalOpen(false)}
        token={authToken}
        onStatusChange={(granted) => setNotifGranted(granted)}
      />

      {/* Drawer Menú Administrativo Slide-over Dinámico (Renderizado vía Portal en document.body) */}
      <AdminMenuDrawer
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        currentUser={currentUser}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        setFilterStatus={setFilterStatus}
        pendingCount={pendingBookings.length}
        notifGranted={notifGranted}
        onOpenManualBooking={() => setIsManualBookingOpen(true)}
        onOpenBlockTime={() => setIsBlockTimeOpen(true)}
        onOpenDayAvail={() => {
          setSelectedDateForAvail(undefined);
          setIsDayAvailOpen(true);
        }}
        onOpenServices={() => setIsServicesOpen(true)}
        onOpenLocations={() => setIsLocationsOpen(true)}
        onOpenProfile={() => setIsProfileOpen(true)}
        onOpenPushModal={() => setIsPushModalOpen(true)}
        onInstallPwa={handleInstallPwa}
        onShareCatalog={() => {
          const url = typeof window !== 'undefined' ? `${window.location.origin}/#catalogo` : 'https://canonegropretty.com/#catalogo';
          navigator.clipboard.writeText(url);
          setActionSuccess('¡Enlace del catálogo (#catalogo) copiado!');
        }}
        onLogout={handleLogout}
      />

    </div>
  );
}
