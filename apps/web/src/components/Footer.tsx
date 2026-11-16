import { Sparkles, MapPin, Clock, Phone, Heart } from 'lucide-react';

export function Footer() {
  return (
    <footer className="mt-auto border-t border-pretty-pink-200/60 bg-white/40 backdrop-blur-md text-pretty-wine-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-serif text-2xl font-bold tracking-tight text-pretty-wine-900">
              Caño Negro Pretty
            </span>
            <Sparkles className="w-4 h-4 text-pretty-pink-500" />
          </div>
          <p className="mt-3 text-sm text-pretty-wine-800/80 leading-relaxed">
            Un espacio cálido y acogedor pensado para consentirte. Expertas en uñas, pestañas y estilismo personalizado en Caño Negro y comunidades vecinas.
          </p>
        </div>

        <div>
          <h4 className="font-serif text-base font-semibold text-pretty-wine-900 flex items-center space-x-2">
            <Clock className="w-4 h-4 text-pretty-pink-500" />
            <span>Horario de Atención</span>
          </h4>
          <p className="mt-3 text-sm text-pretty-wine-800/85">
            Lunes a Sábado: 8:00 AM – 5:00 PM<br />
            Domingos: Descanso del equipo
          </p>
          <div className="mt-3 flex items-center space-x-2 text-xs text-pretty-wine-700/80">
            <MapPin className="w-3.5 h-3.5 text-pretty-pink-500" />
            <span>Caño Negro, Los Chiles, Alajuela, Costa Rica</span>
          </div>
        </div>

        <div>
          <h4 className="font-serif text-base font-semibold text-pretty-wine-900 flex items-center space-x-2">
            <Heart className="w-4 h-4 text-pretty-pink-500" />
            <span>Modalidades de Servicio</span>
          </h4>
          <ul className="mt-3 text-sm text-pretty-wine-800/85 space-y-1.5">
            <li>• En estación de trabajo (Casa de la esteticista)</li>
            <li>• A domicilio en San Antonio, Caño Negro, Precario, Chompipera, Nueva Esperanza y Aguas Negras</li>
          </ul>
        </div>
      </div>

      <div className="max-w-7xl mx-auto mt-10 pt-6 border-t border-pretty-pink-200/40 flex flex-col sm:flex-row items-center justify-between text-xs text-pretty-wine-700/70">
        <p>© 2026 Caño Negro Pretty. Todos los derechos reservados.</p>
        <div className="mt-2 sm:mt-0 flex items-center space-x-4">
          <a href="/admin" className="hover:text-pretty-pink-600 font-semibold underline underline-offset-2">
            Acceso Personal / Backoffice
          </a>
          <span>·</span>
          <span>Hecho con dedicación para el bienestar femenino</span>
        </div>
      </div>
    </footer>
  );
}
