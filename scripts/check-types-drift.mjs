import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const migrationsDir = join(root, '..', 'ruum-ruum-database', 'supabase', 'migrations')
const typesFile = join(root, 'lib', 'database.types.ts')

function getMigrationsHash() {
  const sqlFiles = readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort()

  const hash = createHash('sha256')
  for (const file of sqlFiles) {
    hash.update(file)
    hash.update(readFileSync(join(migrationsDir, file)))
  }

  return hash.digest('hex').slice(0, 16)
}

if (!existsSync(typesFile)) {
  console.error('lib/database.types.ts no existe. Corre: npm run types:supabase')
  process.exit(1)
}

if (!existsSync(migrationsDir)) {
  console.log('Directorio de migraciones no encontrado. Saltando verificacion de drift.')
  process.exit(0)
}

const currentHash = getMigrationsHash()
const typesContent = readFileSync(typesFile, 'utf8')
const match = typesContent.match(/^\/\/ migrations-hash: ([a-f0-9]+)$/m)

if (!match) {
  console.error(
    'lib/database.types.ts no tiene hash de migraciones en el encabezado.\n' +
    'Regenera los tipos con: npm run types:supabase'
  )
  process.exit(1)
}

const embeddedHash = match[1]

if (embeddedHash !== currentHash) {
  console.error(
    'lib/database.types.ts esta desactualizado.\n' +
    `Hash en archivo:     ${embeddedHash}\n` +
    `Hash migraciones:    ${currentHash}\n\n` +
    'Las migraciones cambiaron sin regenerar los tipos.\n' +
    'Corre: npm run types:supabase'
  )
  process.exit(1)
}

console.log(`database.types.ts esta sincronizado con las migraciones (${currentHash})`)
