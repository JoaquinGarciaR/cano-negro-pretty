'use client';

import { useState, useEffect } from 'react';
import { Navbar } from '../components/Navbar';
import { Hero } from '../components/Hero';
import { CatalogSection } from '../components/CatalogSection';
import { BookingWizardModal } from '../components/BookingWizardModal';
import { InstallPwaModal } from '../components/InstallPwaModal';
import { Footer } from '../components/Footer';
import { fetchCatalog } from '../lib/api';

export default function HomePage() {
  const [catalog, setCatalog] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isBookingOpen, setIsBookingOpen] = useState<boolean>(false);
  const [isInstallOpen, setIsInstallOpen] = useState<boolean>(false);
  const [selectedService, setSelectedService] = useState<any | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<any | null>(null);

  useEffect(() => {
    async function initCatalog() {
      try {
        const data = await fetchCatalog();
        setCatalog(data);
      } catch (e) {
        console.error('Error cargando catálogo:', e);
      } finally {
        setLoading(false);
      }
    }
    initCatalog();
  }, []);

  // Desplazamiento automático al catálogo si la URL contiene #catalogo o ?catalogo
  useEffect(() => {
    if (!loading && typeof window !== 'undefined') {
      const hash = window.location.hash;
      const search = window.location.search;
      if (hash === '#catalogo' || search.includes('catalogo')) {
        setTimeout(() => {
          const el = document.getElementById('catalogo');
          if (el) {
            el.scrollIntoView({ behavior: 'smooth' });
          }
        }, 150);
      }
    }
  }, [loading]);

  function handleOpenBooking() {
    setSelectedService(null);
    setSelectedPackage(null);
    setIsBookingOpen(true);
  }

  function handleSelectService(service: any) {
    setSelectedService(service);
    setSelectedPackage(null);
    setIsBookingOpen(true);
  }

  function handleSelectPackage(pkg: any) {
    setSelectedPackage(pkg);
    setSelectedService(null);
    setIsBookingOpen(true);
  }

  function handleExploreServices() {
    const el = document.getElementById('catalogo');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  }

  return (
    <div className="flex-1 flex flex-col">
      <Navbar
        onOpenBooking={handleOpenBooking}
        onOpenInstall={() => setIsInstallOpen(true)}
      />
      
      <main className="flex-1">
        <Hero
          onOpenBooking={handleOpenBooking}
          onExploreServices={handleExploreServices}
        />

        {loading ? (
          <div className="py-16 text-center text-sm font-medium text-pretty-wine-800/70">
            Cargando la magia de Caño Negro Pretty...
          </div>
        ) : (
          <CatalogSection
            services={catalog?.services || []}
            packages={catalog?.packages || []}
            onSelectService={handleSelectService}
            onSelectPackage={handleSelectPackage}
          />
        )}
      </main>

      <Footer />

      <BookingWizardModal
        isOpen={isBookingOpen}
        onClose={() => setIsBookingOpen(false)}
        catalog={catalog}
        initialSelectedService={selectedService}
        initialSelectedPackage={selectedPackage}
      />

      <InstallPwaModal
        isOpen={isInstallOpen}
        onClose={() => setIsInstallOpen(false)}
      />
    </div>
  );
}
