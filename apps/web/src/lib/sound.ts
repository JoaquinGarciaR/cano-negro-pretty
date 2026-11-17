// Utilidad de Notificaciones Sonoras y Visuales para Caño Negro Pretty

export interface DevicePushStatus {
  isIOS: boolean;
  isStandalone: boolean;
  isSecure: boolean;
  hasNotification: boolean;
  hasServiceWorker: boolean;
  hasPushManager: boolean;
  permission: NotificationPermission | 'unsupported';
}

/**
 * Obtiene el diagnóstico del entorno del dispositivo para Web Push (especialmente iOS)
 */
export function getDeviceEnvironment(): DevicePushStatus {
  if (typeof window === 'undefined') {
    return {
      isIOS: false,
      isStandalone: false,
      isSecure: false,
      hasNotification: false,
      hasServiceWorker: false,
      hasPushManager: false,
      permission: 'unsupported'
    };
  }

  const ua = window.navigator.userAgent;
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true;

  const isSecure = window.isSecureContext === true;
  const hasNotification = 'Notification' in window;
  const hasServiceWorker = 'serviceWorker' in navigator;
  const hasPushManager = 'PushManager' in window;
  const permission = hasNotification ? Notification.permission : 'unsupported';

  return {
    isIOS,
    isStandalone,
    isSecure,
    hasNotification,
    hasServiceWorker,
    hasPushManager,
    permission
  };
}

/**
 * Reproduce un tono cristalino delicado y acogedor tipo salón usando Web Audio API nativo.
 * No requiere archivos externos y funciona sin conexión a internet.
 */
export function playNotificationSound() {
  if (typeof window === 'undefined') return;

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();

    // Crear dos osciladores armónicos para un tono de campanita "glass" (cozy)
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    const gain2 = ctx.createGain();

    // Notas: Mi6 (1318.5 Hz) y La6 (1760 Hz)
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(1046.5, now); // Do6
    osc1.frequency.exponentialRampToValueAtTime(1318.5, now + 0.1); // Mi6

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1567.98, now + 0.08); // Sol6
    osc2.frequency.exponentialRampToValueAtTime(2093, now + 0.25); // Do7

    // Envolvente de volumen suave (ataque rápido y decaimiento armónico)
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.25, now + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);

    gain2.gain.setValueAtTime(0, now + 0.08);
    gain2.gain.linearRampToValueAtTime(0.18, now + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.8);

    osc2.start(now + 0.08);
    osc2.stop(now + 1.2);
  } catch (err) {
    console.warn('AudioContext no inicializado o bloqueado por el navegador:', err);
  }
}

/**
 * Solicita permiso de notificaciones push de navegador si aún no se ha otorgado.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (_) {
      return false;
    }
  }

  return false;
}

/**
 * Convierte clave pública Base64 a Uint8Array requerida por PushManager
 */
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Suscribe el dispositivo al servidor Web Push mediante VAPID
 */
export async function subscribeUserToPush(token: string): Promise<{ success: boolean; error?: string }> {
  if (typeof window === 'undefined') return { success: false, error: 'Sin navegador disponible' };

  // Validación de contexto seguro (HTTPS)
  if (!window.isSecureContext) {
    return {
      success: false,
      error: 'INSECURE_CONTEXT: Apple y los navegadores modernos bloquean Web Push sobre HTTP plano (192.168.x.x en red local). Requiere HTTPS para activarse.'
    };
  }

  // Validación de soporte de Service Worker y PushManager
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return {
      success: false,
      error: 'NO_PUSH_SUPPORT: En iPhone (iOS 16.4+), debes agregar la app a la Pantalla de Inicio (A2HS) para que Apple habilite el PushManager.'
    };
  }

  try {
    const granted = await requestNotificationPermission();
    if (!granted) {
      return {
        success: false,
        error: 'PERMISSION_DENIED: Permiso de notificaciones no concedido por el usuario.'
      };
    }

    // Obtener VAPID public key
    const vapidRes = await fetch('/api/admin/push/vapid-public-key', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!vapidRes.ok) throw new Error('No se pudo obtener la clave pública VAPID');
    const { publicKey } = await vapidRes.json();
    if (!publicKey) throw new Error('Clave VAPID no configurada en el servidor');

    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });
    }

    const subJSON = subscription.toJSON();
    const saveRes = await fetch('/api/admin/push/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        endpoint: subJSON.endpoint,
        keys: subJSON.keys
      })
    });

    if (!saveRes.ok) throw new Error('Error al registrar la suscripción en el servidor');

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error al suscribir a notificaciones' };
  }
}

/**
 * Desuscribe el dispositivo del servidor Web Push al cerrar sesión o desactivar alertas
 */
export async function unsubscribeUserFromPush(token?: string): Promise<boolean> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager?.getSubscription();
    if (subscription) {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();

      if (token) {
        await fetch('/api/admin/push/unsubscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ endpoint })
        }).catch(() => {});
      }
    }
    return true;
  } catch (err) {
    console.warn('Error al desuscribir de notificaciones push:', err);
    return false;
  }
}

/**
 * Envía un push de prueba desde el servidor al usuario
 */
export async function triggerPushTest(token: string): Promise<boolean> {
  try {
    const res = await fetch('/api/admin/push/test', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
    return res.ok;
  } catch (_) {
    return false;
  }
}

/**
 * Dispara una notificación de navegador con sonido para alertar al personal.
 */
export function showBrowserNotification(title: string, options?: NotificationOptions) {
  playNotificationSound();

  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      const notificationPayload = {
        icon: '/icon.svg',
        badge: '/icon.svg',
        ...options
      };

      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready
          .then((registration) => {
            registration.showNotification(title, notificationPayload);
          })
          .catch(() => {
            try {
              new Notification(title, notificationPayload);
            } catch (_) {}
          });
      } else {
        new Notification(title, notificationPayload);
      }
    } catch (e) {
      console.warn('Error al mostrar notificación de navegador:', e);
    }
  }
}
