import { Sparkles, Calendar, MapPin, Heart, ShieldCheck } from 'lucide-react';

interface HeroProps {
  onOpenBooking: () => void;
  onExploreServices: () => void;
}

export function Hero({ onOpenBooking, onExploreServices }: HeroProps) {
  return (
    <section className="relative overflow-hidden pt-4 sm:pt-8 pb-10 sm:pb-16 lg:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Columna Izquierda: Mensaje y CTA */}
          <div className="lg:col-span-7 space-y-4 sm:space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-white/70 border border-pretty-pink-300/60 shadow-glass text-xs font-semibold text-pretty-wine-800">
              <Sparkles className="w-3.5 h-3.5 text-pretty-pink-500" />
              <span>Tu momento de consentirte en Caño Negro</span>
            </div>

            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-pretty-wine-900 leading-[1.2]">
              Realza tu belleza en un ambiente{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-pretty-pink-600 to-pretty-wine-700">
                cálido & acogedor
              </span>
            </h1>

            <p className="text-xs sm:text-base text-pretty-wine-800/80 max-w-xl mx-auto lg:mx-0 leading-relaxed font-normal">
              Manicura rusa, diseño de pestañas pelo a pelo, lifting de nutrición profunda y peinados para tus momentos especiales. Reserva fácilmente en línea sin necesidad de registrarte.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 sm:gap-4 pt-1 sm:pt-2">
              <button
                onClick={onOpenBooking}
                className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-6 sm:px-8 py-3 sm:py-3.5 rounded-full text-sm sm:text-base font-semibold text-white bg-gradient-to-r from-pretty-wine-900 to-pretty-pink-600 hover:opacity-95 shadow-glass-hover active:scale-95 transition-all"
              >
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>Reservar mi Cita</span>
              </button>

              <button
                onClick={onExploreServices}
                className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-5 sm:px-7 py-3 sm:py-3.5 rounded-full text-sm sm:text-base font-medium text-pretty-wine-900 bg-white/80 hover:bg-white border border-white/90 shadow-glass transition-all"
              >
                <span>Explorar Catálogo</span>
              </button>
            </div>

            {/* Micro badges informativos */}
            <div className="pt-4 sm:pt-6 grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3 text-xs text-pretty-wine-800/80">
              <div className="flex items-center space-x-2 glass-panel p-2 sm:p-2.5 rounded-xl">
                <MapPin className="w-3.5 h-3.5 text-pretty-pink-500 flex-shrink-0" />
                <span>En estación o a domicilio</span>
              </div>
              <div className="flex items-center space-x-2 glass-panel p-2 sm:p-2.5 rounded-xl">
                <Heart className="w-3.5 h-3.5 text-pretty-pink-500 flex-shrink-0" />
                <span>Atención personalizada</span>
              </div>
              <div className="col-span-2 sm:col-span-1 flex items-center space-x-2 glass-panel p-2 sm:p-2.5 rounded-xl">
                <ShieldCheck className="w-3.5 h-3.5 text-pretty-pink-500 flex-shrink-0" />
                <span>Sin pagos adelantados</span>
              </div>
            </div>
          </div>

          {/* Columna Derecha: Tarjetas de Estilo Glass y Cozy */}
          <div className="lg:col-span-5 relative">
            <div className="relative mx-auto max-w-md lg:max-w-none">
              {/* Tarjeta Glass Principal */}
              <div className="glass-panel rounded-3xl p-4 sm:p-6 shadow-glass space-y-3 sm:space-y-4">
                <div className="relative h-48 sm:h-64 w-full rounded-2xl overflow-hidden shadow-sm">
                  <img
                    src="https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=800&q=80"
                    alt="Salón Caño Negro Pretty"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2.5 right-2.5 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-full text-[11px] font-semibold text-pretty-wine-900 border border-white/80 shadow-sm flex items-center space-x-1">
                    <Sparkles className="w-3 h-3 text-pretty-pink-500" />
                    <span>Experiencia Pretty</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-serif text-base sm:text-lg font-bold text-pretty-wine-900">
                      Nuestras Especialistas
                    </span>
                    <span className="text-xs font-medium text-pretty-pink-600 bg-pretty-pink-100/80 px-2 py-0.5 rounded-full">
                      Disponibles
                    </span>
                  </div>
                  <p className="text-xs text-pretty-wine-800/80 leading-relaxed">
                    Elena Mora y Sofía Vargas cuentan con horarios flexibles y traslados seguros a tu comunidad.
                  </p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
