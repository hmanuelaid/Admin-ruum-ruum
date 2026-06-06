import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
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
  console.error('lib/database.types.ts no existe. Genera los tipos antes de embedir el hash.')
  process.exit(1)
}

if (!existsSync(migrationsDir)) {
  console.log('Sin directorio de migraciones, tipos generados sin hash.')
  process.exit(0)
}

const currentHash = getMigrationsHash()
const content = readFileSync(typesFile, 'utf8')
const cleaned = content.replace(/^\/\/ migrations-hash: [a-f0-9]+\r?\n/, '')

writeFileSync(typesFile, `// migrations-hash: ${currentHash}\n${cleaned}`)
console.log(`Hash embebido en database.types.ts: ${currentHash}`)
