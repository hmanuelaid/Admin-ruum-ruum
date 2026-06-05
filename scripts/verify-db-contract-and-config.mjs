import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { isAbsolute, join, relative } from 'node:path'

const root = process.cwd()
const databaseRoot = join(root, '..', 'ruum-ruum-database')
const migrationsRoot = join(databaseRoot, 'supabase', 'migrations')

function read(path) {
  return readFileSync(isAbsolute(path) ? path : join(root, path), 'utf8')
}

function exists(path) {
  return existsSync(isAbsolute(path) ? path : join(root, path))
}

function walk(dir) {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name)
    const stat = statSync(path)
    if (stat.isDirectory()) return walk(path)
    return /\.(ts|tsx|js|mjs)$/.test(path) ? [path] : []
  })
}

const sourceFiles = [
  ...walk(join(root, 'app')),
  ...walk(join(root, 'components')),
  ...walk(join(root, 'lib')),
]

const implicitSelectFiles = sourceFiles.filter(path => {
  const source = readFileSync(path, 'utf8')
  return /\.select\(\s*(['"])\*\1\s*\)/.test(source) || /\.select\(\s*\)/.test(source)
})
const packageJson = JSON.parse(read('package.json'))
const configPage = read(join('app', '(admin)', 'configuracion', 'page.tsx'))
const configRoute = read(join('app', 'api', 'admin', 'system-config', 'route.ts'))
const permissions = read(join('lib', 'auth', 'permissions.ts'))
const configContract = read(join('lib', 'config', 'system-config.ts'))
const migration = read(join(migrationsRoot, '20260601060000_secure_system_config_validation.sql'))

const checks = [
  ['Supabase generated types are versioned', exists(join('lib', 'database.types.ts'))],
  ['Supabase type generation script exists', packageJson.scripts?.['types:supabase']?.includes('supabase gen types typescript')],
  ['no implicit select all remains in app/components/lib', implicitSelectFiles.length === 0],
  ['config contract module defines validation metadata', configContract.includes('CONFIG_DEFINITIONS') && configContract.includes('validateSystemConfigValue')],
  ['system config API route exists', exists(join('app', 'api', 'admin', 'system-config', 'route.ts'))],
  ['system config API authorizes server reads and writes', configRoute.includes("authorizeAdminAction('config.read')") && configRoute.includes("authorizeAdminAction('config.write')")],
  ['system config API uses explicit select', configRoute.includes(".select('id, key, value')")],
  ['system config API calls validated RPC for writes', configRoute.includes('validateSystemConfigValue') && configRoute.includes('upsert_system_config_values')],
  ['permissions include config actions', permissions.includes("'config.read'") && permissions.includes("'config.write'")],
  ['config page no longer creates Supabase client directly', !configPage.includes("from '@/lib/supabase'") && !configPage.includes(".from('system_config')")],
  ['config page uses server API', configPage.includes('/api/admin/system-config')],
  ['config page blocks saving when source is unavailable', configPage.includes('sourceAvailable') && configPage.includes('!sourceAvailable')],
  ['config page renders operational source error', configPage.includes('configError') && configPage.includes('Configuración no disponible para edición')],
  ['config validation migration exists in central database repo', exists(join(migrationsRoot, '20260601060000_secure_system_config_validation.sql'))],
  ['config validation function exists', /create or replace function public\.is_valid_system_config_value/.test(migration)],
  ['config check constraint exists', /system_config_known_key_value_check/.test(migration) && /not valid/i.test(migration)],
  ['config write RPC exists', /create or replace function public\.upsert_system_config_values/.test(migration)],
  ['config write RPC restricts super_admin', /v_admin_role <> 'super_admin'/.test(migration)],
  ['config write RPC audits in same transaction', /insert into public\.admin_activity_log/.test(migration) && /'config'/.test(migration)],
]

const failures = checks.filter(([, ok]) => !ok)

if (failures.length > 0) {
  console.error('DB contract and system config checks failed:')
  for (const [label] of failures) console.error(`- ${label}`)
  if (implicitSelectFiles.length > 0) {
    console.error('implicit select all files:')
    for (const file of implicitSelectFiles) console.error(`- ${relative(root, file)}`)
  }
  process.exit(1)
}

console.log('DB contract and system config checks passed.')
