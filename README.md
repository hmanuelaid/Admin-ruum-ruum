# RuumRuum Admin

Backoffice operativo de Ruum-Ruum by MoviliaX. Permite a equipos internos gestionar viajes, usuarios, conductores, documentos, evidencia, incidencias, pagos, empresas, reportes, tarifas, configuracion y bitacora.

## Stack

- Next.js App Router
- React
- Supabase Auth, Database y Storage
- RBAC granular por rol y accion
- Supabase RPCs para operaciones atomicas
- ESLint, TypeScript, pruebas estaticas de seguridad y verificadores de contrato

## Requisitos

- Node.js 22 recomendado para coincidir con CI/deployment
- npm
- Proyecto Supabase con Auth habilitado
- Supabase Storage con buckets privados:
  - `documents`
  - `evidence`
  - `trip-evidence`
- Migraciones aplicadas desde el repo central `ruum-ruum-database`

## Variables de entorno

Copia `.env.example` como `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
```

Variables:

- `NEXT_PUBLIC_SUPABASE_URL`: URL publica del proyecto Supabase.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: anon key de Supabase usada por cliente, proxy y route handlers.

Notas:

- No guardes service-role keys en variables expuestas al navegador.
- Las variables de configuracion local de Supabase CLI viven en `supabase/config.toml`, no en `.env.example` del app.

## Instalacion

```bash
npm ci
npm run dev
```

La app local corre en `http://localhost:3000`.

## Roles y permisos

Los roles estan definidos en `lib/auth/permissions.ts`:

- `super_admin`: acceso completo, incluyendo configuracion y bitacora.
- `admin_operativo`: operacion diaria; viajes, usuarios, conductores, evidencia, incidencias, pagos, documentos, tarifas, reportes y bitacora.
- `finanzas`: pagos, documentos, tarifas y reportes.
- `soporte`: dashboard, viajes, usuarios, conductores, evidencia e incidencias.
- `validador`: conductores, evidencia y documentos.
- `comercial`: empresas y reportes.

Acciones sensibles usan `authorizeAdminAction(...)` en route handlers. La navegacion visible se calcula con `getVisibleAdminNav(role)` y el proxy valida acceso por path antes de renderizar.

## Supabase y migraciones

Las migraciones ya no viven en este repo. Deben aplicarse desde:

```text
../ruum-ruum-database/supabase/migrations
```

Este Admin depende de migraciones que crean o actualizan:

- Configuracion segura del sistema y bitacora.
- Politicas de actividad administrativa.
- RPCs atomicas para asignar conductor, cambiar estatus de viaje, revisar documentos y actualizar pagos.
- Storage privado para documentos y evidencia.
- Paginacion y busqueda para dashboard, documentos y pagos.
- Empresas y resumen comercial.
- Validacion de configuracion del sistema.

Los scripts de verificacion leen esas migraciones desde el repo central.

## Comandos

```bash
npm run dev                    # servidor local
npm run lint                   # eslint sin warnings
npm run typecheck              # TypeScript sin emitir archivos
npm run types:supabase         # generar lib/database.types.ts desde Supabase
npm test                       # suite completa de verificadores
npm run test:security
npm run test:db-contract
npm run test:performance
npm run test:companies-mobile
npm run test:ui-cleanup
npm run test:routes
npm run build                  # build de produccion
npm run audit:high             # npm audit desde severidad high
```

## Seguridad

- `proxy.ts` protege rutas admin con Supabase server-side y roles activos de `admin_users`.
- `lib/auth/permissions.ts` define RBAC por ruta y por accion.
- `authorizeAdminAction(...)` valida acciones sensibles en APIs server-side.
- Operaciones criticas usan RPCs atomicas para evitar escrituras parciales desde el cliente.
- La bitacora registra acciones administrativas relevantes.
- Los documentos y evidencias usan buckets privados y signed URLs.
- Las paginas admin no deben escribir directo en tablas sensibles cuando existe API/RPC dedicada.

## Checklist antes de despliegue

- Migraciones aplicadas desde `ruum-ruum-database` en el ambiente destino.
- `lib/database.types.ts` actualizado si cambio el schema: `npm run types:supabase`.
- Buckets `documents`, `evidence` y `trip-evidence` privados.
- Variables `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` configuradas.
- Admin inicial creado en `admin_users` con rol `super_admin` y `active = true`.
- `@ruum/types` incluido desde `packages/ruum-types` en el checkout del repo.
- `npm ci` instala sin errores.
- `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` y `npm run audit:high` revisados.
- Probar login admin, dashboard, asignacion de conductor, cambio de estatus, revision de documentos, pagos y bitacora.

## Crons disponibles (agregar a vercel.json para activar)

- `/api/admin/jobs/unassigned-trips` → `*/5 * * * *`
- `/api/admin/jobs/document-expiry` → `0 8 * * *`