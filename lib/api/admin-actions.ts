import { NextResponse } from 'next/server'
import { canPerformAdminAction, type AdminAction } from '@/lib/auth/permissions'
import { getVerifiedAdmin } from '@/lib/auth/server'

export async function authorizeAdminAction(action: AdminAction) {
  const admin = await getVerifiedAdmin()

  if (!admin) {
    return {
      admin: null,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  if (!canPerformAdminAction(admin.role, action)) {
    return {
      admin: null,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    }
  }

  return { admin, response: null }
}

export function rpcErrorResponse(message: string) {
  const status =
    /not found/i.test(message) ? 404 :
    /not authorized|forbidden/i.test(message) ? 403 :
    /changed|already|not pending|not available|valid state|invalid state|not in a valid state/i.test(message) ? 409 :
    /invalid|required/i.test(message) ? 400 :
    500

  return NextResponse.json({ error: message }, { status })
}
