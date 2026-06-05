import { readFileSync, existsSync } from 'node:fs'
import { isAbsolute, join } from 'node:path'

const root = process.cwd()
const migrationsRoot = join(root, '..', 'ruum-ruum-database', 'supabase', 'migrations')

function read(path) {
  return readFileSync(isAbsolute(path) ? path : join(root, path), 'utf8')
}

function exists(path) {
  return existsSync(isAbsolute(path) ? path : join(root, path))
}

const dashboard = read(join('app', '(admin)', 'dashboard', 'page.tsx'))
const documentos = read(join('app', '(admin)', 'documentos', 'page.tsx'))
const pagos = read(join('app', '(admin)', 'pagos', 'page.tsx'))
const permissions = read(join('lib', 'auth', 'permissions.ts'))
const migration = read(join(migrationsRoot, '20260601040000_admin_performance_pagination.sql'))
const dashboardRoute = read(join('app', 'api', 'admin', 'dashboard', 'route.ts'))
const documentsRoute = read(join('app', 'api', 'admin', 'documents', 'route.ts'))
const paymentsRoute = read(join('app', 'api', 'admin', 'payments', 'route.ts'))

const checks = [
  ['performance migration exists in central database repo', exists(join(migrationsRoot, '20260601040000_admin_performance_pagination.sql'))],
  ['dashboard summary RPC exists', /create or replace function public\.get_admin_dashboard_summary/.test(migration)],
  ['document pagination RPCs exist', /get_admin_documents_page/.test(migration) && /get_admin_documents_total/.test(migration)],
  ['payment pagination RPCs exist', /get_admin_payments_page/.test(migration) && /get_admin_payments_total/.test(migration)],
  ['payment pagination does not assume optional payer columns', !/p\.driver_id|p\.user_id|p\.notes|left join public\.drivers d|left join public\.app_users u/.test(migration)],
  ['supporting indexes exist', /trips_status_updated_at_idx/.test(migration) && /documents_status_uploaded_at_idx/.test(migration) && /payments_status_created_at_idx/.test(migration)],
  ['search indexes exist', /pg_trgm/.test(migration) && /documents_owner_name_trgm_idx/.test(migration) && /payments_concept_trgm_idx/.test(migration)],
  ['dashboard API route uses summary RPC', dashboardRoute.includes("authorizeAdminAction('dashboard.read')") && dashboardRoute.includes('get_admin_dashboard_summary')],
  ['documents API route uses paginated RPCs', documentsRoute.includes("authorizeAdminAction('documents.read')") && documentsRoute.includes('get_admin_documents_page')],
  ['payments API route uses paginated RPCs', paymentsRoute.includes("authorizeAdminAction('payments.read')") && paymentsRoute.includes('get_admin_payments_page')],
  ['permissions include read actions', permissions.includes("'dashboard.read'") && permissions.includes("'documents.read'") && permissions.includes("'payments.read'")],
  ['dashboard consumes API instead of direct aggregate queries', dashboard.includes('/api/admin/dashboard') && !/Promise\.all\(\[[\s\S]*activeTripsRes/.test(dashboard)],
  ['dashboard realtime is debounced', dashboard.includes('scheduleRefresh') && dashboard.includes('setTimeout') && !dashboard.includes('() => void loadDashboard(false)')],
  ['documents consume paginated API', documentos.includes('/api/admin/documents') && documentos.includes('pageSize') && !documentos.includes(".from('documents')")],
  ['documents no longer filter full table in memory', !/docs\.filter\(/.test(documentos)],
  ['documents realtime is coalesced', documentos.includes('scheduleDocumentsReload') && documentos.includes('setTimeout')],
  ['payments consume paginated API', pagos.includes('/api/admin/payments') && pagos.includes('pageSize') && !pagos.includes(".from('payments')")],
  ['payments no longer filter full table in memory', !/payments\.filter\(p => \{[\s\S]*matchSearch/.test(pagos)],
  ['payments realtime is coalesced', pagos.includes('schedulePaymentsReload') && pagos.includes('setTimeout')],
]

const failures = checks.filter(([, ok]) => !ok)

if (failures.length > 0) {
  console.error('Admin performance checks failed:')
  for (const [label] of failures) console.error(`- ${label}`)
  process.exit(1)
}

console.log('Admin performance checks passed.')
