'use client'
import { useAppStore } from '@/lib/store'

export default function Toast() {
  const { toastMsg } = useAppStore()
  return (
    <div role="status" aria-live="polite" className={`toast${toastMsg ? ' visible' : ''}`}>
      {toastMsg}
    </div>
  )
}