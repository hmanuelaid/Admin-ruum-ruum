import { readFileSync, readdirSync, statSync } from 'node:fs'
import { isAbsolute, join } from 'node:path'

const root = process.cwd()
const migrationsRoot = join(root, '..', 'ruum-ruum-database', 'supabase', 'migrations')

function read(path) {
  return readFileSync(isAbsolute(path) ? path : join(root, path), 'utf8')
}

function walk(dir) {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name)
    const stat = statSync(path)
    if (stat.isDirectory()) return walk(path)
    return /\.(ts|tsx|js|mjs|sql)$/.test(path) ? [path] : []
  })
}

const storage = read(join('lib', 'storage.ts'))
const migration = read(join(migrationsRoot, '20260601030000_private_sensitive_storage.sql'))
const documentUploader = read(join('components', 'ui', 'DocumentUploader.tsx'))
const documentos = read(join('app', '(admin)', 'documentos', 'page.tsx'))
const evidence = read(join('app', '(admin)', 'evidencia', 'page.tsx'))

const sourceText = walk(join(root, 'app'))
  .concat(walk(join(root, 'components')))
  .concat(walk(join(root, 'lib')))
  .map(path => readFileSync(path, 'utf8'))
  .join('\n')

const checks = [
  ['storage helper does not create public URLs', !/getPublicUrl|publicUrl/.test(storage)],
  ['sensitive bucket migration makes documents private', /where id = 'documents'[\s\S]*public = false|public = false[\s\S]*where id = 'documents'/.test(migration)],
  ['sensitive bucket migration makes evidence private', /where id = 'evidence'[\s\S]*public = false|public = false[\s\S]*where id = 'evidence'/.test(migration)],
  ['migration drops anonymous document policies', /drop policy if exists "allow_all_reads"/.test(migration) && /drop policy if exists "allow_all_uploads"/.test(migration)],
  ['migration adds storage_path columns', /add column if not exists storage_path text/.test(migration)],
  ['document upload route exists', /api\/admin\/storage\/documents/.test(sourceText)],
  ['signed URL route exists', /api\/admin\/storage\/signed-urls/.test(sourceText)],
  ['server validates magic bytes', /validateUploadedFile/.test(sourceText) && /MIME declarado/.test(sourceText)],
  ['document uploader uses server upload helper', /uploadDocument/.test(documentUploader) && sourceText.includes('/api/admin/storage/documents')],
  ['document review page uses signed URLs', documentos.includes("getSignedStorageUrls('documents'")],
  ['evidence page uses signed URLs', evidence.includes("getSignedStorageUrls('evidence'")],
  ['no img tags remain in source', !/<img\b/.test(sourceText)],
]

const failures = checks.filter(([, ok]) => !ok)

if (failures.length > 0) {
  console.error('Sensitive storage checks failed:')
  for (const [label] of failures) console.error(`- ${label}`)
  process.exit(1)
}

console.log('Sensitive storage checks passed.')
