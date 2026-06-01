import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()

function read(path) {
  return readFileSync(join(root, path), 'utf8')
}

const viajes = read(join('app', '(admin)', 'viajes', 'page.tsx'))
const viajeDetail = read(join('app', '(admin)', 'viajes', '[id]', 'page.tsx'))
const documentos = read(join('app', '(admin)', 'documentos', 'page.tsx'))
const pagos = read(join('app', '(admin)', 'pagos', 'page.tsx'))
const migration = read(join('supabase', 'migrations', '20260601020000_atomic_admin_operations.sql'))

const requiredFiles = [
  join('app', 'api', 'admin', 'trips', 'assign-driver', 'route.ts'),
  join('app', 'api', 'admin', 'trips', 'status', 'route.ts'),
  join('app', 'api', 'admin', 'documents', 'review', 'route.ts'),
  join('app', 'api', 'admin', 'payments', 'status', 'route.ts'),
]

const checks = [
  ['assign driver RPC exists', /create or replace function public\.assign_trip_driver/.test(migration)],
  ['trip status RPC exists', /create or replace function public\.update_trip_status_atomic/.test(migration)],
  ['document review RPC exists', /create or replace function public\.review_document_atomic/.test(migration)],
  ['payment status RPC exists', /create or replace function public\.update_payment_statuses_atomic/.test(migration)],
  ['assign driver uses row locks', /from public\.trips[\s\S]*for update/.test(migration) && /from public\.drivers[\s\S]*for update/.test(migration)],
  ['payments use row locks', /from public\.payments[\s\S]*for update/.test(migration)],
  ['migration writes audit logs', (migration.match(/insert into public\.admin_activity_log/g) ?? []).length >= 4],
  ['route handlers exist', requiredFiles.every(path => existsSync(join(root, path)))],
  ['trips page uses assign endpoint', viajes.includes('/api/admin/trips/assign-driver')],
  ['trips page uses status endpoint', viajes.includes('/api/admin/trips/status')],
  ['trip detail uses assign endpoint', viajeDetail.includes('/api/admin/trips/assign-driver')],
  ['documents page uses review endpoint', documentos.includes('/api/admin/documents/review')],
  ['payments page uses payment endpoint', pagos.includes('/api/admin/payments/status')],
  ['trips page has no direct trip assignment update', !/from\('trips'\)[\s\S]{0,160}\.update\(\{[^}]*driver_id/.test(viajes)],
  ['trip detail has no direct trip assignment update', !/from\('trips'\)[\s\S]{0,160}\.update\(\{[^}]*driver_id/.test(viajeDetail)],
  ['documents page has no notification insert', !/from\('notifications'\)[\s\S]{0,120}\.insert/.test(documentos)],
  ['payments page has no direct payment status update', !/from\('payments'\)[\s\S]{0,160}\.update\(\{[^}]*status/.test(pagos)],
]

const failures = checks.filter(([, ok]) => !ok)

if (failures.length > 0) {
  console.error('Atomic admin operation checks failed:')
  for (const [label] of failures) console.error(`- ${label}`)
  process.exit(1)
}

console.log('Atomic admin operation checks passed.')
