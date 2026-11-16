'use client';

import { useState, useEffect } from 'react';
import {
  X,
  Bell,
  Volume2,
  Smartphone,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Sparkles,
  Send,
  HelpCircle
} from 'lucide-react';
import {
  getDeviceEnvironment,
  DevicePushStatus,
  playNotificationSound,
  subscribeUserToPush,
  triggerPushTest
} from '../lib/sound';

interface PushNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  token?: string;
  onStatusChange?: (granted: boolean) => void;
}

export function PushNotificationModal({
  isOpen,
  onClose,
  token,
  onStatusChange
}: PushNotificationModalProps) {
  const [deviceStatus, setDeviceStatus] = useState<DevicePushStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [feedbackType, setFeedbackType] = useState<'success' | 'error' | 'info' | null>(null);

  useEffect(() => {
    if (isOpen) {
      setDeviceStatus(getDeviceEnvironment());
      setFeedbackMessage(null);
      setFeedbackType(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  async function handleTestChime() {
    playNotificationSound();
    setFeedbackType('info');
    setFeedbackMessage('Tono cristalino de bienvenida reproducido.');
  }

  async function handleSubscribe() {
    setLoading(true);
    setFeedbackMessage(null);
    try {
      playNotificationSound();
      const res = await subscribeUserToPush(token || '');
      const updatedStatus = getDeviceEnvironment();
      setDeviceStatus(updatedStatus);

      if (res.success) {
        setFeedbackType('success');
        setFeedbackMessage('¡Notificaciones Push activadas exitosamente en tu dispositivo!');
        onStatusChange?.(true);
      } else {
        setFeedbackType('error');
        setFeedbackMessage(res.error || 'No se pudieron activar las notificaciones.');
      }
    } catch (e: any) {
      setFeedbackType('error');
      setFeedbackMessage(e.message || 'Error al solicitar notificaciones');
    } finally {
      setLoading(false);
    }
  }

  async function handleSendTestPush() {
    setLoading(true);
    setFeedbackMessage(null);
    try {
      const ok = await triggerPushTest(token || '');
      if (ok) {
        setFeedbackType('success');
        setFeedbackMessage('Push de prueba enviado. Tu iPhone o pantalla debería mostrar el banner.');
      } else {
        setFeedbackType('error');
        setFeedbackMessage('No se pudo enviar el push de prueba desde el servidor.');
      }
    } catch (e: any) {
      setFeedbackType('error');
      setFeedbackMessage(e.message || 'Error al emitir push de prueba');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-pretty-wine-950/40 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg glass-panel rounded-3xl p-5 sm:p-7 shadow-2xl border border-white/80 my-auto text-pretty-wine-900">
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/70 hover:bg-white text-pretty-wine-800 transition-colors shadow-sm"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="mb-4 pr-8">
          <div className="flex items-center space-x-1.5 text-xs font-semibold text-pretty-pink-600 uppercase tracking-wider mb-1">
            <Bell className="w-3.5 h-3.5" />
            <span>Alertas & Notificaciones Push</span>
          </div>
          <h3 className="font-serif text-xl sm:text-2xl font-bold text-pretty-wine-900">
            Diagnóstico de Notificaciones
          </h3>
          <p className="text-xs text-pretty-wine-800/80 mt-0.5">
            Configuración y estado del motor de notificaciones en tu teléfono o computadora.
          </p>
        </div>

        {/* Diagnóstico del Entorno del Dispositivo */}
        {deviceStatus && (
          <div className="space-y-2 mb-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              
              {/* 1. Protocolo HTTPS */}
              <div className="p-2.5 rounded-2xl bg-white/70 border border-white flex flex-col justify-between">
                <span className="text-[10px] text-pretty-wine-700/70 font-semibold block">Protocolo</span>
                <div className="flex items-center space-x-1.5 mt-1">
                  {deviceStatus.isSecure ? (
                    <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  ) : (
                    <ShieldAlert className="w-4 h-4 text-red-600 flex-shrink-0" />
                  )}
                  <span className={`text-xs font-bold ${deviceStatus.isSecure ? 'text-emerald-900' : 'text-red-800'}`}>
                    {deviceStatus.isSecure ? 'HTTPS Seguro' : 'HTTP (Inseguro)'}
                  </span>
                </div>
              </div>

              {/* 2. Modo Pantalla de Inicio (PWA) */}
              <div className="p-2.5 rounded-2xl bg-white/70 border border-white flex flex-col justify-between">
                <span className="text-[10px] text-pretty-wine-700/70 font-semibold block">Modo de App</span>
                <div className="flex items-center space-x-1.5 mt-1">
                  {deviceStatus.isStandalone ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  ) : (
                    <Smartphone className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  )}
                  <span className={`text-xs font-bold ${deviceStatus.isStandalone ? 'text-emerald-900' : 'text-amber-800'}`}>
                    {deviceStatus.isStandalone ? 'Pantalla de Inicio' : 'Pestaña Safari/Web'}
                  </span>
                </div>
              </div>

              {/* 3. Permiso en el Sistema */}
              <div className="p-2.5 rounded-2xl bg-white/70 border border-white flex flex-col justify-between">
                <span className="text-[10px] text-pretty-wine-700/70 font-semibold block">Permiso Push</span>
                <div className="flex items-center space-x-1.5 mt-1">
                  {deviceStatus.permission === 'granted' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  ) : deviceStatus.permission === 'denied' ? (
                    <ShieldAlert className="w-4 h-4 text-red-600 flex-shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-pretty-wine-600 flex-shrink-0" />
                  )}
                  <span className={`text-xs font-bold ${
                    deviceStatus.permission === 'granted'
                      ? 'text-emerald-900'
                      : deviceStatus.permission === 'denied'
                      ? 'text-red-800'
                      : 'text-pretty-wine-800'
                  }`}>
                    {deviceStatus.permission === 'granted'
                      ? 'Concedido'
                      : deviceStatus.permission === 'denied'
                      ? 'Bloqueado'
                      : 'Pendiente'}
                  </span>
                </div>
              </div>

            </div>

            {/* Alerta explicativa si está en red local sobre HTTP */}
            {!deviceStatus.isSecure && (
              <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-red-900 text-xs space-y-1.5">
                <div className="flex items-center space-x-2 font-bold text-red-800">
                  <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                  <span>¿Por qué no se activan en iPhone a través de la red local?</span>
                </div>
                <p className="text-[11px] leading-relaxed text-red-800/90">
                  Apple WebKit (iOS) tiene una política de seguridad estricta: <strong>bloquea el motor de Notificaciones Push sobre conexiones HTTP locales (como <code>http://192.168.x.x</code>)</strong>. En una red local sin HTTPS, Safari ni siquiera muestra la ventana para permitir notificaciones.
                </p>
                <div className="pt-1.5 border-t border-red-200/60 font-semibold text-[11px] text-red-950">
                  Para probar notificaciones push reales en tu iPhone en desarrollo local:
                  <ol className="list-decimal list-inside font-normal mt-1 space-y-1 text-red-900">
                    <li>Genera un túnel HTTPS temporal en la computadora: <code className="bg-white/80 px-1 py-0.5 rounded font-mono text-[10px]">npx untun@latest tunnel http://localhost:3001</code></li>
                    <li>Abre el enlace <code className="bg-white/80 px-1 py-0.5 rounded font-mono text-[10px]">https://...</code> en <strong>Safari</strong> en tu iPhone.</li>
                    <li>Toca <strong>Compartir</strong> &rarr; <strong>«Agregar a la pantalla de inicio»</strong>.</li>
                    <li>Abre la app desde tu pantalla de inicio y toca «Activar Notificaciones».</li>
                  </ol>
                </div>
              </div>
            )}

            {/* Alerta explicativa si es iOS pero no está en pantalla de inicio */}
            {deviceStatus.isIOS && deviceStatus.isSecure && !deviceStatus.isStandalone && (
              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1">
                <div className="flex items-center space-x-2 font-bold text-amber-800">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>Requisito obligatorio de Apple para iPhone (iOS 16.4+)</span>
                </div>
                <p className="text-[11px] leading-relaxed text-amber-800/90">
                  Safari en pestañas de navegador no permite Web Push. Debes pulsar <strong>Compartir &rarr; «Agregar a la pantalla de inicio»</strong> y abrir la app desde tu inicio.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Mensaje de retroalimentación de la acción */}
        {feedbackMessage && (
          <div className={`p-3 rounded-2xl mb-4 text-xs font-medium flex items-start space-x-2 ${
            feedbackType === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
              : feedbackType === 'error'
              ? 'bg-red-50 border border-red-200 text-red-900'
              : 'bg-pretty-pink-50 border border-pretty-pink-200 text-pretty-wine-900'
          }`}>
            {feedbackType === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            ) : feedbackType === 'error' ? (
              <ShieldAlert className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            ) : (
              <Sparkles className="w-4 h-4 text-pretty-pink-600 flex-shrink-0 mt-0.5" />
            )}
            <span className="leading-relaxed">{feedbackMessage}</span>
          </div>
        )}

        {/* Botones de Acción */}
        <div className="space-y-2 pt-2 border-t border-pretty-pink-200/50 text-xs">
          
          {/* Botón 1: Activar Notificaciones Push */}
          <button
            onClick={handleSubscribe}
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-2xl bg-pretty-wine-900 hover:bg-pretty-pink-600 text-white font-bold transition-all shadow-sm flex items-center justify-center space-x-2"
          >
            <Bell className="w-4 h-4" />
            <span>{loading ? 'Conectando...' : 'Activar / Vincular Notificaciones Push'}</span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            {/* Botón 2: Probar Tono Cristalino */}
            <button
              onClick={handleTestChime}
              type="button"
              className="py-2.5 px-3 rounded-2xl bg-white hover:bg-pretty-pink-50 text-pretty-wine-900 font-semibold border border-pretty-pink-200 transition-all flex items-center justify-center space-x-1.5"
            >
              <Volume2 className="w-4 h-4 text-pretty-pink-600" />
              <span>Probar Tono</span>
            </button>

            {/* Botón 3: Enviar Push de Prueba */}
            <button
              onClick={handleSendTestPush}
              disabled={loading || deviceStatus?.permission !== 'granted'}
              type="button"
              className={`py-2.5 px-3 rounded-2xl font-semibold border transition-all flex items-center justify-center space-x-1.5 ${
                deviceStatus?.permission === 'granted'
                  ? 'bg-white hover:bg-emerald-50 text-emerald-900 border-emerald-200'
                  : 'opacity-50 bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed'
              }`}
            >
              <Send className="w-4 h-4" />
              <span>Push de Prueba</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
