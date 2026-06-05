// ─── lib/types.ts ─────────────────────────────────────────────────────────────
import type { TripStatus } from '@ruum/types'
export type { TripStatus } from '@ruum/types'

export type DriverStatus =
  | 'pendiente_validacion' | 'activo' | 'disponible' | 'no_disponible'
  | 'en_viaje' | 'suspendido' | 'bloqueado' | 'documentacion_vencida'

export type UserType =
  | 'personal' | 'empresarial' | 'agencia' | 'lote'
  | 'flotilla' | 'arrendadora' | 'taller' | 'aseguradora'

export type ServiceType =
  | 'personal' | 'empresarial' | 'agencia' | 'lote'
  | 'flotilla' | 'entrega_cliente' | 'recuperacion' | 'especial'

export type DocStatus =
  | 'pendiente_carga' | 'en_revision' | 'aprobado'
  | 'rechazado' | 'vencido' | 'requiere_actualizacion'

export type PaymentStatus =
  | 'pendiente' | 'en_revision' | 'aprobado'
  | 'rechazado' | 'pagado' | 'revocado' | 'ajustado'

export type IncidentStatus =
  | 'nueva' | 'en_revision' | 'requiere_informacion'
  | 'en_seguimiento' | 'resuelta' | 'cerrada' | 'escalada'

export type IncidentType =
  | 'dano_reportado' | 'retraso' | 'falta_evidencia' | 'contacto_no_disponible'
  | 'problema_documentacion' | 'problema_pago' | 'cancelacion'
  | 'diferencia_kilometraje' | 'diferencia_combustible'
  | 'problema_conductor' | 'problema_usuario' | 'otro'

export type AdminRole =
  | 'super_admin' | 'admin_operativo' | 'finanzas'
  | 'soporte' | 'validador' | 'comercial'

export interface AdminUser {
  id: string
  name: string
  email: string
  role: AdminRole
  avatarUrl?: string
}

export interface Driver {
  id: string
  name: string
  phone: string
  email: string
  state: string
  status: DriverStatus
  certified: boolean
  rating: number
  tripsCompleted: number
  earnings: number
  photoUrl?: string
  bankAccount?: string
  createdAt: string
}

export interface AppUser {
  id: string
  name: string
  email: string
  phone: string
  type: UserType
  status: 'activo' | 'suspendido'
  tripsCount: number
  createdAt: string
  company?: string
}

export interface Vehicle {
  id: string
  alias: string
  brand: string
  model: string
  year: number
  color: string
  plates: string
  vin?: string
  type: string
  transmission: 'automatica' | 'manual'
  condition: string
}

export interface Location {
  address: string
  reference?: string
}

export interface Contact {
  name: string
  phone: string
}

export interface TripTimeline {
  step: number
  label: string
  timestamp?: string
  done: boolean
  active: boolean
}

export interface Evidence {
  type: 'inicial' | 'durante' | 'final'
  photos: string[]
  kmReading?: number
  fuelLevel?: number
  notes?: string
  timestamp?: string
  status?: DocStatus
}

export interface Trip {
  id: string
  status: TripStatus
  serviceType: ServiceType
  vehicle: Vehicle
  user: AppUser
  driver?: Driver
  origin: Location
  destination: Location
  originContact: Contact
  destinationContact: Contact
  scheduledAt?: string
  distanceKm: number
  clientPriceMXN: number
  driverPayMXN: number
  timeline: TripTimeline[]
  evidence: Evidence[]
  incidents: Incident[]
  internalNotes?: string
  createdAt: string
}

export interface Incident {
  id: string
  tripId: string
  type: IncidentType
  status: IncidentStatus
  description: string
  assignedTo?: string
  resolution?: string
  createdAt: string
}

export interface Document {
  id: string
  ownerId: string
  ownerType: 'driver' | 'user' | 'company'
  ownerName: string
  type: string
  status: DocStatus
  uploadedAt?: string
  expiresAt?: string
  notes?: string
}

export interface Payment {
  id: string
  tripId: string
  type: 'cobro_usuario' | 'pago_conductor' | 'gasto'
  amount: number
  status: PaymentStatus
  method?: string
  date?: string
  concept: string
}

export interface Company {
  id: string
  razonSocial: string
  nombre: string
  rfc: string
  contactName: string
  phone: string
  email: string
  type: string
  tripsCount: number
  status: 'activo' | 'suspendido'
  createdAt: string
}

export interface Tariff {
  id: string
  name: string
  baseFare: number
  perKm: number
  minFare: number
  foraneaSurcharge: number
  driverBase: number
  driverPerKm: number
  active: boolean
}
