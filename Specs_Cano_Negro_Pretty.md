# Caño Negro Pretty — Especificación del MVP

Documento para Claude · Nombre provisional · Extensión orientativa: dos páginas.

## 1. Objetivo y experiencia visual

Construir una web de reservas para un pequeño salón de belleza de Caño Negro, con varias esteticistas dentro del mismo negocio. Las clientas reservan sin crear cuenta; el personal recibe solicitudes y las confirma desde un backoffice móvil instalable como PWA. Interfaz y mensajes en español, moneda CRC y zona horaria `America/Costa_Rica`.

La identidad debe sentirse cozy, femenina y cercana: rosa suave, crema y vino, logotipo tipográfico de estilo clásico, títulos serif elegantes y texto fácil de leer. Usar tarjetas redondeadas, fotografías de servicios alojadas en Cloudinary, espacios amplios y animaciones sutiles. El calendario debe ser cute y práctico, con iconos y etiquetas para cada estado; nunca depender únicamente del color. Priorizar uso con una mano, botones cómodos y contraste legible.

## 2. Web pública y solicitud de reserva

Inicio con presentación del negocio, servicios con imagen, precio y duración, y CTA «Reservar mi cita». Flujo: seleccionar servicio o paquete → esteticista disponible → modalidad → fecha y hora → datos personales → revisar resumen y enviar solicitud. El calendario público muestra únicamente disponibilidad, sin nombres ni información de otras clientas.

Formulario obligatorio:

- Nombre de la clienta.
- Teléfono con teclado numérico, validado en frontend y backend. Tratarlo como texto, normalizarlo a formato internacional y usar Costa Rica (`+506`, ocho dígitos nacionales) por defecto; admitir espacios y guiones al escribir.
- Modalidad: «A domicilio» o «En estación de trabajo», es decir, casa de la esteticista.
- Para domicilio: dropdown con **San Antonio, Caño Negro, Precario, Chompipera, Nueva Esperanza y Aguas Negras**, más dirección o señas obligatorias.
- Servicio, esteticista, fecha y hora. Notas opcionales y aceptación de uso de datos para gestionar la cita.

Antes del envío, mostrar duración, inicio/fin, modalidad, lugar, precio base, descuento y total. Tras enviar: «Solicitud recibida; pendiente de confirmación», con referencia. Evitar envíos duplicados. No incluir pagos ni cuentas de clientas en este MVP.

## 3. Agenda y reglas de disponibilidad

Cada esteticista tiene agenda propia, servicios habilitados, horario semanal, descansos, días libres y bloqueos manuales. Los inicios se ofrecen cada 15 minutos; todas las duraciones son múltiplos de 15: 60 minutos = 4 bloques, 90 minutos = 6. Solo ofrecer un inicio cuando quepa el servicio completo dentro del horario y sin solapamientos. Admitir margen configurable antes/después para traslado o preparación, especialmente a domicilio.

Estados de reserva: `PENDING`, `CONFIRMED`, `REJECTED`, `CANCELLED` y `COMPLETED`. Representarlos con reloj, check, cruz, cancelación y estrella/check final, junto con texto. Las solicitudes pendientes aparecen en la agenda privada, pero no bloquean disponibilidad pública hasta confirmarse: pueden coexistir solicitudes para el mismo intervalo. Advertir al personal cuando exista ese conflicto.

Confirmar debe bloquear **todos** los bloques ocupados y márgenes de esa esteticista. Otras profesionales pueden trabajar simultáneamente. Resolver confirmaciones concurrentes mediante transacción y restricción de no solapamiento en PostgreSQL; una comprobación previa en código no basta. Si otro turno ya fue confirmado, rechazar la operación con conflicto y permitir proponer otra hora por WhatsApp. Cancelar libera el intervalo; reprogramar vuelve a validar disponibilidad atómicamente. Guardar instantes en UTC y presentarlos en hora local; prohibir reservas en el pasado.

## 4. Backoffice, WhatsApp y notificaciones

Acceso autenticado. La propietaria administra negocio, equipo, servicios, descuentos y todas las agendas. Cada esteticista gestiona su agenda y solicitudes. Todas las consultas y acciones deben comprobar pertenencia al negocio y permisos.

Panel mobile first: resumen del día, contador y bandeja de pendientes, calendario diario/semanal y detalle de reserva con datos, precios y acciones para confirmar, rechazar, cancelar, reprogramar y completar. Permitir crear citas manualmente y bloquear tiempo. Registrar quién hizo cada cambio.

Una solicitud nueva genera notificación persistente en el panel y Web Push para el personal correspondiente que haya dado permiso. Al tocarla, abrir el detalle. La PWA debe tener manifest, iconos, service worker e instrucciones de instalación; manejar permisos denegados o navegadores sin soporte. La bandeja sigue funcionando sin push. Con conexión perdida, mostrar aviso y evitar confirmar con datos desactualizados; no almacenar datos personales en caché offline.

Tras confirmar, ofrecer «Preparar WhatsApp», vista previa editable y botón «Abrir WhatsApp» mediante `https://wa.me/<telefono>?text=<mensaje_codificado>`. Incluir nombre, servicio, profesional, fecha, hora, duración, modalidad, dirección, total y referencia. Selector de voz: «Como esteticista» («Hola, soy [nombre]…») o «Como negocio» («Hola, te escribimos de Caño Negro Pretty…»). Esto cambia la redacción y firma; la cuenta emisora es la que esté abierta en WhatsApp. El envío es manual y abrir el enlace no equivale a mensaje enviado. Ofrecer copiar mensaje como alternativa.

## 5. Servicios, paquetes y datos

Catálogo inicial en `config/services.json`: uñas, pestañas, peinados y paquetes combinados. Cada servicio incluye `id`, `name`, `category`, `description`, `imageUrl` de Cloudinary, `priceCRC`, `durationBlocks`, `active` y profesionales habilitadas. Un paquete puede incluir `componentServiceIds`, `extraPriceCRC` y una duración total explícita; precio = suma de componentes + extra. La duración no debe inferirse únicamente del precio.

Importar el JSON mediante un seed/upsert con identificadores estables. Después, PostgreSQL será la fuente operativa para los cambios del panel; no sobrescribir ediciones al reiniciar. Permitir editar y desactivar servicios y paquetes, conservando el historial. Localidades y descuentos también serán configurables. **Interpretación solicitada:** cada localidad tiene un descuento fijo en colones para domicilio, inicialmente configurable en cero. Total = máximo entre cero y precio del servicio/paquete menos descuento; en estación no aplica. No inventar tarifas definitivas.

Entidades mínimas: negocio, usuario, membresía/rol, profesional, servicio/paquete, relación profesional-servicio, horario, bloqueo, localidad/descuento, reserva, notificación y suscripción push. La reserva guarda una copia del nombre del servicio, duración, precio, descuento y total al solicitarse para que cambios posteriores del catálogo no alteren citas existentes.

## 6. Arquitectura y entrega

Monorepo TypeScript con pnpm workspaces: `apps/web` (Next.js, web pública y `/admin` como PWA), `apps/api` (Express + Prisma), `packages/shared` (tipos y validaciones) y `config` (catálogo inicial). PostgreSQL pequeño, sin Redis ni microservicios adicionales. API REST para catálogo, disponibilidad, solicitudes, administración y push. Validar precios, duraciones y permisos en servidor; nunca confiar en totales enviados por el navegador.

Dockerfiles para web/API y Docker Compose con web, API y PostgreSQL, volumen persistente, healthchecks y migraciones. Incluir `.env.example`, seed demostrativo con dos profesionales, README de arranque, configuración HTTPS para producción, claves VAPID y procedimiento de respaldo/restauración. Sesiones seguras en cookies HttpOnly, contraseñas con hash, protección CSRF cuando corresponda y límites de solicitudes en endpoints públicos. No exponer teléfonos en respuestas públicas ni en el contenido de notificaciones push.

**Aceptación del MVP:** una clienta solicita sin cuenta; el personal la ve y recibe push cuando el dispositivo lo permite; confirmar bloquea el intervalo completo sin doble reserva; otra esteticista conserva su disponibilidad; los descuentos y paquetes calculan correctamente; WhatsApp abre el mensaje con ambas voces; cancelar libera agenda; el backoffice funciona desde móvil y se instala como PWA en dispositivos compatibles. Añadir pruebas de concurrencia, bloques/márgenes, precios y permisos, y un recorrido funcional de reserva → confirmación → WhatsApp.
