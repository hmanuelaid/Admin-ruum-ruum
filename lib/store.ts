
// ─── lib/store.ts ─────────────────────────────────────────────────────────────
'use client'
import { create } from 'zustand'
import type { AdminUser, Trip, Driver } from './types'

interface AuthState {
  admin: AdminUser | null
  setAdmin: (admin: AdminUser) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  (set) => ({
    admin: null,
    setAdmin: (admin) => set({ admin }),
    logout: () => set({ admin: null }),
  })
)

interface AppState {
  sidebarOpen: boolean
  toastMsg: string | null
  selectedTrip: Trip | null
  selectedDriver: Driver | null
  setSidebarOpen: (v: boolean) => void
  showToast: (msg: string) => void
  clearToast: () => void
  setSelectedTrip: (t: Trip | null) => void
  setSelectedDriver: (d: Driver | null) => void
}

export const useAppStore = create<AppState>()((set) => ({
  sidebarOpen: true,
  toastMsg: null,
  selectedTrip: null,
  selectedDriver: null,
  setSidebarOpen: (v) => set({ sidebarOpen: v }),
  showToast: (msg) => {
    set({ toastMsg: msg })
    setTimeout(() => set({ toastMsg: null }), 3500)
  },
  clearToast: () => set({ toastMsg: null }),
  setSelectedTrip: (t) => set({ selectedTrip: t }),
  setSelectedDriver: (d) => set({ selectedDriver: d }),
}))
