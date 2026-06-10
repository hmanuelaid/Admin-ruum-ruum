import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import {
  canAccessAdminPath,
  getRequiredAdminRoles,
  isAdminRole,
} from '@/lib/auth/permissions'
import type { AdminRole } from '@/lib/types'

type AdminRow = {
  role: string | null
}

function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return { url, anonKey }
}

function createSupabaseProxyClient(request: NextRequest) {
  const { url, anonKey } = getSupabaseEnv()
  let response = NextResponse.next({ request })

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      // FIX: setAll solo acepta un parámetro según SetAllCookies de @supabase/ssr@^0.10.x
      // El segundo param `headers` no existe en el tipo y causaba error de build
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options)
        })
      },
    },
  })

  return {
    supabase,
    getResponse() {
      response.headers.set('Cache-Control', 'private, no-store')
      return response
    },
  }
}

function copyAuthResponse(target: NextResponse, source: NextResponse) {
  source.cookies.getAll().forEach(({ name, value, ...options }) => {
    target.cookies.set(name, value, options)
  })

  source.headers.forEach((value, key) => {
    const lowerKey = key.toLowerCase()
    if (lowerKey !== 'location' && lowerKey !== 'x-middleware-next') {
      target.headers.set(key, value)
    }
  })

  target.headers.set('Cache-Control', 'private, no-store')
  return target
}

function redirectWithAuthCookies(url: URL, authResponse: NextResponse) {
  return copyAuthResponse(NextResponse.redirect(url), authResponse)
}

async function getActiveAdminRole(
  supabase: ReturnType<typeof createServerClient>
): Promise<AdminRole | null> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) return null

  const { data, error } = await supabase
    .from('admin_users')
    .select('role')
    .eq('auth_id', user.id)
    .eq('active', true)
    .maybeSingle()

  const admin = data as AdminRow | null
  if (error || !admin || !isAdminRole(admin.role)) return null

  return admin.role
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const requiredRoles = getRequiredAdminRoles(pathname)
  const isLoginPath = pathname === '/login'

  if (!requiredRoles && !isLoginPath) {
    return NextResponse.next()
  }

  const { supabase, getResponse } = createSupabaseProxyClient(request)
  const adminRole = await getActiveAdminRole(supabase)
  const authResponse = getResponse()

  if (!adminRole) {
    if (!requiredRoles) return authResponse

    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', `${pathname}${request.nextUrl.search}`)
    return redirectWithAuthCookies(loginUrl, authResponse)
  }

  if (isLoginPath) {
    return redirectWithAuthCookies(new URL('/dashboard', request.url), authResponse)
  }

  if (!canAccessAdminPath(adminRole, pathname)) {
    const fallbackUrl = new URL('/dashboard', request.url)
    fallbackUrl.searchParams.set('unauthorized', '1')
    return redirectWithAuthCookies(fallbackUrl, authResponse)
  }

  return authResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}