'use client';

import { useState, useRef, useEffect } from 'react';
import {
  MoreVertical,
  ChevronDown,
  Sparkles,
  MessageSquare,
  CalendarClock,
  CheckCircle2,
  Ban,
  UserCheck,
  XCircle,
  Check
} from 'lucide-react';

export type WhatsAppTemplateType = 'confirmation' | 'reschedule' | 'reminder' | 'cancellation' | 'completed';

interface BookingActionMenuProps {
  booking: any;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onReschedule?: (booking: any) => void;
  onWhatsApp?: (booking: any, template?: WhatsAppTemplateType) => void;
  onStatusChange?: (bookingId: string, newStatus: string) => void | Promise<void>;
  onAssign?: (booking: any) => void;
  align?: 'left' | 'right';
  className?: string;
}

export function BookingActionMenu({
  booking,
  isOpen: isOpenProp,
  onOpenChange,
  onReschedule,
  onWhatsApp,
  onStatusChange,
  onAssign,
  align = 'right',
  className = ''
}: BookingActionMenuProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isControlled = typeof isOpenProp === 'boolean';
  const isOpen = isControlled ? isOpenProp : internalIsOpen;

  const [placement, setPlacement] = useState<'top' | 'bottom'>('bottom');
  const containerRef = useRef<HTMLDivElement>(null);

  const calculatePlacement = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      // Si hay menos de 250px hacia abajo y suficiente espacio arriba, desplegar hacia arriba
      if (spaceBelow < 250 && rect.top > 250) {
        setPlacement('top');
      } else {
        setPlacement('bottom');
      }
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      calculatePlacement();
    }
    if (!isControlled) {
      setInternalIsOpen(nextOpen);
    }
    onOpenChange?.(nextOpen);
  };

  useEffect(() => {
    if (isOpen) {
      calculatePlacement();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleUpdate = () => {
      calculatePlacement();
    };

    window.addEventListener('resize', handleUpdate);
    window.addEventListener('scroll', handleUpdate, true);
    return () => {
      window.removeEventListener('resize', handleUpdate);
      window.removeEventListener('scroll', handleUpdate, true);
    };
  }, [isOpen]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent | TouchEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        handleOpenChange(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        handleOpenChange(false);
      }
    }
    if (isOpen) {
      document.addEventListener('pointerdown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('pointerdown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  if (!booking) return null;

  const status = booking.status;
  const isPending = status === 'PENDING';
  const isConfirmed = status === 'CONFIRMED';
  const isCompleted = status === 'COMPLETED';
  const isCancelled = status === 'CANCELLED';
  const isRejected = status === 'REJECTED';
  const isUnassigned = !booking.professionalId && !booking.professional?.id;

  function closeMenu() {
    handleOpenChange(false);
  }

  return (
    <div className={`relative inline-flex items-center gap-1.5 ${isOpen ? 'z-40' : 'z-auto'} ${className}`} ref={containerRef}>
      {/* ===================================================================== */}
      {/* 1. BOTÓN DE ACCIÓN PRIMARIA DIRECTA (Acceso Rápido de 1 Toque) */}
      {/* ===================================================================== */}

      {/* CASO PENDIENTE: Asignar (si falta) o Confirmar (si ya tiene asignada) */}
      {isPending && (
        isUnassigned ? (
          <button
            type="button"
            onClick={() => onAssign?.(booking)}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-100/90 hover:bg-amber-200 text-amber-900 border border-amber-300 transition-all shadow-xs active:scale-95"
            title="Asignar esteticista a la cita"
          >
            <UserCheck className="w-3.5 h-3.5 text-amber-700" />
            <span>Asignar esteticista</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onStatusChange?.(booking.id, 'CONFIRMED')}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-pretty-wine-900 hover:bg-pretty-pink-600 text-white transition-all shadow-xs active:scale-95"
            title="Confirmar la cita en la agenda"
          >
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            <span>Confirmar Cita</span>
          </button>
        )
      )}

      {/* CASO CONFIRMADA: Botón directo "Completar" */}
      {isConfirmed && (
        <button
          type="button"
          onClick={() => onStatusChange?.(booking.id, 'COMPLETED')}
          className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-bold text-pretty-wine-900 bg-pretty-pink-100/90 hover:bg-pretty-pink-200 border border-pretty-pink-300/80 transition-all shadow-xs active:scale-95"
          title="Marcar cita como completada y abrir mensaje de agradecimiento"
        >
          <Sparkles className="w-3.5 h-3.5 text-pretty-pink-600" />
          <span>Completar</span>
        </button>
      )}

      {/* CASO COMPLETADA: Botón directo "Agradecimiento" */}
      {isCompleted && (
        <button
          type="button"
          onClick={() => onWhatsApp?.(booking, 'completed')}
          className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-bold text-pretty-wine-900 bg-pretty-pink-100/90 hover:bg-pretty-pink-200 border border-pretty-pink-300 transition-all shadow-xs active:scale-95"
          title="Enviar mensaje de agradecimiento a la clienta por WhatsApp"
        >
          <Sparkles className="w-3.5 h-3.5 text-pretty-pink-600" />
          <span>Agradecimiento</span>
        </button>
      )}

      {/* CASO CANCELADA / RECHAZADA: Botón directo WhatsApp Cancelación */}
      {(isCancelled || isRejected) && (
        <button
          type="button"
          onClick={() => onWhatsApp?.(booking, 'cancellation')}
          className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-semibold text-pretty-wine-900 bg-white hover:bg-pretty-pink-50 border border-pretty-pink-200 transition-all shadow-xs"
          title="Abrir WhatsApp con plantilla de cancelación"
        >
          <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
          <span>WhatsApp</span>
        </button>
      )}

      {/* ===================================================================== */}
      {/* 2. BOTÓN DISPARADOR DEL DROPDOWN DE ACCIONES Y OPCIONES */}
      {/* ===================================================================== */}
      {/* Para citas activas (Pendientes y Confirmadas) o cuando hay opciones adicionales */}
      {(!isCompleted && !isCancelled && !isRejected) ? (
        <button
          type="button"
          onClick={() => handleOpenChange(!isOpen)}
          className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all shadow-xs ${
            isOpen
              ? 'bg-pretty-pink-100 text-pretty-wine-950 border-pretty-pink-300 ring-2 ring-pretty-pink-300/40'
              : 'bg-white hover:bg-pretty-pink-50 text-pretty-wine-900 border-pretty-pink-200'
          }`}
          title="Ver más opciones de la cita"
        >
          <span>Opciones</span>
          <ChevronDown className={`w-3 h-3 text-pretty-pink-600 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      ) : isCompleted ? (
        // En citas completadas, un menú sutil de 3 puntos por si desea WhatsApp regular u otras consultas
        <button
          type="button"
          onClick={() => handleOpenChange(!isOpen)}
          className={`p-1.5 rounded-full text-xs border transition-all ${
            isOpen
              ? 'bg-pretty-pink-100 text-pretty-wine-950 border-pretty-pink-300'
              : 'bg-white hover:bg-pretty-pink-50 text-pretty-wine-800 border-pretty-pink-200'
          }`}
          title="Opciones de la cita completada"
        >
          <MoreVertical className="w-3.5 h-3.5 text-pretty-pink-600" />
        </button>
      ) : null}

      {/* ===================================================================== */}
      {/* 3. MENÚ FLOTANTE DEL DROPDOWN (Solo muestra opciones válidas según estado) */}
      {/* ===================================================================== */}
      {isOpen && (
        <div
          className={`absolute ${
            placement === 'top' ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
          } ${
            align === 'right' ? 'right-0' : 'left-0'
          } z-50 w-56 p-1.5 rounded-2xl bg-white shadow-2xl border border-pretty-pink-300 ring-1 ring-pretty-wine-900/10 text-pretty-wine-900`}
          style={{ backgroundColor: '#ffffff', opacity: 1 }}
        >
          {/* Encabezado informativo del menú */}
          <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-pretty-wine-700/70 border-b border-pretty-pink-100 mb-1">
            Cita #{booking.referenceCode} · {booking.clientName}
          </div>

          <div className="space-y-0.5">
            {/* OPCIÓN 1: Asignar / Reasignar Esteticista (Solo en Pendientes o Confirmadas) */}
            {(isPending || isConfirmed) && onAssign && (
              <button
                type="button"
                onClick={() => {
                  closeMenu();
                  onAssign(booking);
                }}
                className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-xl text-xs font-semibold hover:bg-pretty-pink-50 text-pretty-wine-900 transition-colors text-left"
              >
                <UserCheck className="w-3.5 h-3.5 text-pretty-pink-500 flex-shrink-0" />
                <span>
                  {isUnassigned
                    ? 'Asignar esteticista...'
                    : `Reasignar (${booking.professional?.name || 'Esteticista'})`}
                </span>
              </button>
            )}

            {/* OPCIÓN 2: Cambiar Fecha y Hora */}
            {/* Oculto explícitamente cuando está COMPLETADA, CANCELADA o RECHAZADA */}
            {!isCompleted && !isCancelled && !isRejected && onReschedule && (
              <button
                type="button"
                onClick={() => {
                  closeMenu();
                  onReschedule(booking);
                }}
                className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-xl text-xs font-semibold hover:bg-pretty-pink-50 text-pretty-wine-900 transition-colors text-left"
              >
                <CalendarClock className="w-3.5 h-3.5 text-pretty-pink-500 flex-shrink-0" />
                <span>Cambiar fecha y hora</span>
              </button>
            )}

            {/* OPCIÓN 3: Enviar WhatsApp */}
            {onWhatsApp && (
              <button
                type="button"
                onClick={() => {
                  closeMenu();
                  const targetTemplate: WhatsAppTemplateType = isCompleted
                    ? 'completed'
                    : isCancelled || isRejected
                    ? 'cancellation'
                    : 'confirmation';
                  onWhatsApp(booking, targetTemplate);
                }}
                className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-xl text-xs font-semibold hover:bg-pretty-pink-50 text-pretty-wine-900 transition-colors text-left"
              >
                <MessageSquare className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                <span>
                  {isCompleted
                    ? 'Agradecimiento WhatsApp'
                    : isCancelled || isRejected
                    ? 'Notificar cancelación'
                    : 'Enviar WhatsApp'}
                </span>
              </button>
            )}

            {/* OPCIÓN 4: Completar cita (Solo en CONFIRMED) */}
            {isConfirmed && onStatusChange && (
              <button
                type="button"
                onClick={() => {
                  closeMenu();
                  onStatusChange(booking.id, 'COMPLETED');
                }}
                className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-xl text-xs font-semibold hover:bg-pretty-pink-50 text-pretty-wine-900 transition-colors text-left"
              >
                <Sparkles className="w-3.5 h-3.5 text-pretty-pink-600 flex-shrink-0" />
                <span>Marcar como completada</span>
              </button>
            )}

            {/* NOTA PARA CITAS COMPLETADAS: Indicar que el historial está sellado */}
            {isCompleted && (
              <div className="px-2.5 py-1.5 text-[11px] text-pretty-wine-700/80 bg-pretty-pink-50/50 rounded-xl">
                Cita atendida y completada. Horario protegido contra modificaciones.
              </div>
            )}

            {/* SEPARADOR ANTES DE ACCIONES CRÍTICAS */}
            {(isPending || isConfirmed) && onStatusChange && (
              <div className="border-t border-pretty-pink-100 my-1" />
            )}

            {/* OPCIÓN 5: Rechazar (en Pendientes) o Cancelar (en Confirmadas) */}
            {isPending && onStatusChange && (
              <button
                type="button"
                onClick={() => {
                  closeMenu();
                  if (
                    window.confirm(
                      `¿Deseas rechazar la solicitud de cita #${booking.referenceCode}? Se abrirá WhatsApp para notificar a la clienta.`
                    )
                  ) {
                    onStatusChange(booking.id, 'REJECTED');
                  }
                }}
                className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-xl text-xs font-semibold hover:bg-rose-50 text-rose-700 transition-colors text-left"
              >
                <XCircle className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />
                <span>Rechazar solicitud</span>
              </button>
            )}

            {isConfirmed && onStatusChange && (
              <button
                type="button"
                onClick={() => {
                  closeMenu();
                  if (
                    window.confirm(
                      `¿Estás segura de cancelar la cita #${booking.referenceCode}? Se abrirá WhatsApp con el mensaje de cancelación listo para la clienta.`
                    )
                  ) {
                    onStatusChange(booking.id, 'CANCELLED');
                  }
                }}
                className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-xl text-xs font-semibold hover:bg-rose-50 text-rose-700 transition-colors text-left"
              >
                <Ban className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />
                <span>Cancelar cita</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
