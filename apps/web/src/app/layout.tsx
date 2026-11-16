import type { Metadata } from 'next';
import { Playfair_Display, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { ServiceWorkerRegister } from '../components/ServiceWorkerRegister';

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Caño Negro Pretty | Salón de Belleza & Cuidado Personal',
  description: 'Reserva tu cita de uñas, pestañas y peinados en Caño Negro, Costa Rica. Atención en estación y a domicilio.',
  manifest: '/manifest.json',
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
};

export const viewport = {
  themeColor: '#4A0E17',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning className={`${playfair.variable} ${jakarta.variable}`}>
      <head>
        {/* Auto-recuperación de Service Worker: purga workers obsoletos con interceptores fetch de versiones previas */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
                  var purgeKey = 'cano_sw_v4_purged';
                  if (!sessionStorage.getItem(purgeKey)) {
                    navigator.serviceWorker.getRegistrations().then(function(regs) {
                      if (regs && regs.length > 0) {
                        regs.forEach(function(r) { r.unregister(); });
                      }
                      if ('caches' in window) {
                        caches.keys().then(function(keys) {
                          keys.forEach(function(k) { caches.delete(k); });
                        });
                      }
                      sessionStorage.setItem(purgeKey, '1');
                    }).catch(function() {
                      sessionStorage.setItem(purgeKey, '1');
                    });
                  }
                }
              })();
            `
          }}
        />
      </head>
      <body suppressHydrationWarning className="min-h-screen flex flex-col antialiased selection:bg-pretty-pink-200 selection:text-pretty-wine-900">
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
