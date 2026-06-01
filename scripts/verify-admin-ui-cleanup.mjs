import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const root = process.cwd()

function read(path) {
  return readFileSync(join(root, path), 'utf8')
}

function exists(path) {
  return existsSync(join(root, path))
}

function walk(dir) {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name)
    const stat = statSync(path)
    if (stat.isDirectory()) return walk(path)
    return /\.(ts|tsx|js|mjs|css|json)$/.test(path) ? [path] : []
  })
}

const topbar = read(join('components', 'layout', 'TopBar.tsx'))
const sidebar = read(join('components', 'layout', 'SideBar.tsx'))
const mobileNav = read(join('components', 'layout', 'MobileAdminNav.tsx'))
const permissions = read(join('lib', 'auth', 'permissions.ts'))
const css = read(join('app', 'globals.css'))
const packageJson = read('package.json')
const packageLock = read('package-lock.json')
const envLocal = exists('.env.local') ? read('.env.local') : ''
const sourceFiles = [
  ...walk(join(root, 'app')),
  ...walk(join(root, 'components')),
  ...walk(join(root, 'lib')),
]
const sourceText = sourceFiles.map(path => readFileSync(path, 'utf8')).join('\n')

const btnIconWithoutName = sourceFiles.flatMap(path => {
  const lines = readFileSync(path, 'utf8').split('\n')
  return lines.flatMap((line, index) => {
    const isBtnIconButton = line.includes('<button') && line.includes('btn-icon')
    return isBtnIconButton && !line.includes('aria-label')
      ? [`${relative(root, path)}:${index + 1}`]
      : []
  })
})

const cloudinaryEnvKeys = /^(CLOUDINARY_|NEXT_PUBLIC_CLOUDINARY_)/m.test(envLocal)

const checks = [
  ['topbar search control was removed', !topbar.includes('search-box') && !topbar.includes('Buscar viaje')],
  ['topbar notification dot badge was removed', !topbar.includes('dot-badge') && !css.includes('dot-badge')],
  ['sidebar no longer renders nav badges', !sidebar.includes('nav-badge') && !permissions.includes('badge?:') && !permissions.includes('visibleItem.badge')],
  ['mobile nav more button has accessible name', mobileNav.includes('aria-label="Abrir más opciones de navegación"')],
  ['icon-only buttons include aria labels', btnIconWithoutName.length === 0],
  ['global focus-visible styles exist', css.includes(':where(a, button, input, select, textarea):focus-visible')],
  ['Cloudinary dependency was removed', !packageJson.includes('cloudinary') && !packageLock.includes('node_modules/cloudinary')],
  ['Cloudinary runtime references were removed', !/cloudinary|CLOUDINARY|NEXT_PUBLIC_CLOUDINARY/.test(sourceText)],
  ['Cloudinary local env keys were removed', !cloudinaryEnvKeys],
]

const failures = checks.filter(([, ok]) => !ok)

if (failures.length > 0) {
  console.error('Admin UI cleanup checks failed:')
  for (const [label] of failures) console.error(`- ${label}`)
  if (btnIconWithoutName.length > 0) {
    console.error(`btn-icon buttons without aria-label: ${btnIconWithoutName.join(', ')}`)
  }
  if (cloudinaryEnvKeys) {
    console.error(`Cloudinary env keys still exist in ${relative(root, join(root, '.env.local'))}`)
  }
  process.exit(1)
}

console.log('Admin UI cleanup checks passed.')
