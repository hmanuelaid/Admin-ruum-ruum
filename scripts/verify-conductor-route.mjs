import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const pagePath = join(root, 'app', '(admin)', 'conductores', '[id]', 'page.tsx')
const notFoundPath = join(root, 'app', '(admin)', 'conductores', '[id]', 'not-found.tsx')
const page = readFileSync(pagePath, 'utf8')
const notFound = existsSync(notFoundPath) ? readFileSync(notFoundPath, 'utf8') : ''

const checks = [
  ['exports ConductorDetailPage', /export default async function ConductorDetailPage/.test(page)],
  ['loads driver data', /\.from\('drivers'\)/.test(page)],
  ['loads route documents', /\.from\('documents'\)/.test(page)],
  ['loads route trips', /\.from\('trips'\)/.test(page)],
  ['uses notFound for missing drivers', /notFound\(\)/.test(page)],
  ['has conductor not-found state', /Conductor no encontrado/.test(notFound)],
  ['does not export Sidebar as route page', !/export default function Sidebar/.test(page)],
  ['does not render sidebar shell in route page', !/<aside\s+className="sidebar"/.test(page)],
]

const failures = checks.filter(([, ok]) => !ok)

if (failures.length > 0) {
  console.error('Conductor route regression checks failed:')
  for (const [label] of failures) console.error(`- ${label}`)
  process.exit(1)
}

console.log('Conductor route regression checks passed.')
