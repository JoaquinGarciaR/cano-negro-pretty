'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // Limpiar cachés antiguos de versiones previas
      if ('caches' in window) {
        caches.keys().then((keys) => {
          keys.forEach((key) => caches.delete(key));
        }).catch(() => {});
      }

      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          // Forzar chequeo y activación inmediata de la nueva versión v3
          reg.update().catch(() => {});
        })
        .catch((err) => {
          console.warn('Error al registrar Service Worker PWA:', err);
        });
    }
  }, []);

  return null;
}
