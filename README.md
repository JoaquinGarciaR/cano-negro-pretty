# Caño Negro Pretty — Sistema de Reservas & Backoffice PWA

Sistema integral de reservas web para clientas y backoffice PWA mobile-first para esteticistas y administración, desarrollado para el salón de belleza **Caño Negro Pretty** en Caño Negro, Alajuela, Costa Rica.

---

## Identidad y Diseño: Girly & Glass
- **Estilo:** Transparencias tipo cristal (*glassmorphism* con `backdrop-blur`), paleta femenina cozy (rosa suave `#FCE7F0`, crema `#FFFDF9` y vino profundo `#4A0E17`).
- **Iconografía:** 100% libre de emojis; uso riguroso de la librería SVG `lucide-react` para estados, indicadores y acciones.
- **Zona Horaria y Moneda:** `America/Costa_Rica` (UTC-6) y Colones Costarricenses (`CRC` / `₡`).
- **Normalización Telefónica:** Validador y formateador para Costa Rica (+506) con soporte para 8 dígitos y guiones.
- **Apertura de Agenda bajo Demanda:** Los días en el calendario inician bloqueados por defecto; el personal va abriendo y configurando jornadas específicas para fechas a futuro, desbloqueándolas dinámicamente en el calendario de las clientas.

---

## Estructura del Monorepo

```
SalonBelleza/
├── apps/
│   ├── api/                 # Servidor Express + Prisma ORM + Motor de Disponibilidad
│   └── web/                 # Aplicación Next.js 14 (Web Pública + PWA /admin)
├── packages/
│   └── shared/              # Tipos TypeScript, esquemas Zod y helpers de WhatsApp
├── config/
│   └── services.json        # Catálogo maestro de servicios, combos, localidades y profesionales
├── docker-compose.yml       # Base de datos PostgreSQL local en contenedor Docker
└── package.json             # Scripts y gestión con pnpm workspaces
```

---

## Inicio Rápido en Desarrollo Local

### 1. Requisitos
- Node.js 18+ (o 20+)
- pnpm 9+ o 12+
- Docker & Docker Compose

### 2. Levantar la Base de Datos Local en Docker
El contenedor ya viene configurado para correr en el puerto local `5433` (evitando conflictos con otros servicios locales):

```bash
docker compose up -d postgres
```

### 3. Sincronizar Base de Datos y Semilla Inicial
```bash
# Aplicar esquema a PostgreSQL
pnpm db:push

# Cargar catálogo de servicios, paquetes, localidades y usuarios
pnpm db:seed
```

### 4. Iniciar Servidores en Desarrollo
En terminales separadas o usando concurrently:

```bash
# Iniciar API Backend (http://localhost:4000)
pnpm dev:api

# Iniciar Frontend Web & Admin (http://localhost:3001)
pnpm dev:web
```

---

## Credenciales por Defecto (Seed)

| Rol | Usuario | Contraseña |
| :--- | :--- | :--- |
| **Propietaria (Admin)** | `admin@canonegropretty.com` | `admin123` |
| **Esteticista Elena** | `elena@canonegropretty.com` | `pretty123` |
| **Esteticista Sofía** | `sofia@canonegropretty.com` | `pretty123` |

---

## Guía de Migración a Supabase o Railway

Cuando decidas llevar el sistema a la nube, migrar es directo:

1. Crea tu proyecto en **Supabase** o **Railway** y copia la variable de conexión `DATABASE_URL` (PostgreSQL URI).
2. Edita `.env` y `apps/api/.env`:
   ```env
   DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/[DB_NAME]?sslmode=require"
   ```
3. Ejecuta la migración y el seed en tu base de datos remota:
   ```bash
   pnpm db:push
   pnpm db:seed
   ```
4. ¡Listo! La base de datos en la nube quedará poblada con los mismos servicios, localidades de Caño Negro y reglas de negocio.

---

## Pruebas de Concurrencia y Disponibilidad

Para ejecutar la suite de pruebas que valida la prevención atómica de dobles reservas y la doble voz de WhatsApp:

```bash
pnpm --filter @cano/api exec tsx test/concurrency.ts
```
