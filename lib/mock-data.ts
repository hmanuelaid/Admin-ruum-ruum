// ─── lib/mock-data.ts ─────────────────────────────────────────────────────────
import type {
  Trip, Driver, AppUser, Document, Payment,
  Company, Tariff, Incident
} from './types'

export const mockDrivers: Driver[] = [
  { id: 'drv_001', name: 'Roberto Sánchez', phone: '+52 55 9876 5432', email: 'roberto@mail.com', state: 'CDMX', status: 'en_viaje', certified: true, rating: 4.9, tripsCompleted: 142, earnings: 68400, createdAt: '2024-01-10' },
  { id: 'drv_002', name: 'Miguel Ángel Flores', phone: '+52 33 1111 2222', email: 'miguel@mail.com', state: 'Jalisco', status: 'disponible', certified: true, rating: 4.8, tripsCompleted: 98, earnings: 47200, createdAt: '2024-02-05' },
  { id: 'drv_003', name: 'Carlos Jiménez', phone: '+52 81 3333 4444', email: 'carlos.j@mail.com', state: 'Nuevo León', status: 'disponible', certified: true, rating: 4.7, tripsCompleted: 74, earnings: 35600, createdAt: '2024-03-12' },
  { id: 'drv_004', name: 'Ana Patricia Ruiz', phone: '+52 55 5555 6666', email: 'ana@mail.com', state: 'CDMX', status: 'pendiente_validacion', certified: false, rating: 0, tripsCompleted: 0, earnings: 0, createdAt: '2024-06-01' },
  { id: 'drv_005', name: 'Luis Torres', phone: '+52 998 765 4321', email: 'luis@mail.com', state: 'Quintana Roo', status: 'suspendido', certified: true, rating: 4.2, tripsCompleted: 31, earnings: 14900, createdAt: '2024-04-18' },
]

export const mockUsers: AppUser[] = [
  { id: 'usr_001', name: 'Carlos Mendoza', email: 'carlos@ejemplo.com', phone: '+52 55 1234 5678', type: 'personal', status: 'activo', tripsCount: 4, createdAt: '2024-03-01' },
  { id: 'usr_002', name: 'Grupo AutoMax', email: 'ops@automax.mx', phone: '+52 55 8888 9999', type: 'agencia', status: 'activo', tripsCount: 28, createdAt: '2024-01-15', company: 'AutoMax SA de CV' },
  { id: 'usr_003', name: 'Fernanda López', email: 'fer@mail.com', phone: '+52 33 2222 3333', type: 'personal', status: 'activo', tripsCount: 2, createdAt: '2024-05-20' },
  { id: 'usr_004', name: 'Lote Premier', email: 'admin@lotepremier.mx', phone: '+52 81 4444 5555', type: 'lote', status: 'suspendido', tripsCount: 11, createdAt: '2024-02-28', company: 'Lote Premier SA' },
]

export const mockVehicle = {
  id: 'veh_001', alias: 'Mi camioneta',
  brand: 'Toyota', model: 'Hilux', year: 2022,
  color: 'Blanco', plates: 'ABC-123',
  type: 'pickup', transmission: 'automatica' as const, condition: 'Bueno',
}

const TIMELINE_STEPS = [
  'Solicitud creada', 'Viaje revisado', 'Conductor asignado',
  'Conductor aceptó', 'Llegada al origen', 'Evidencia inicial',
  'Traslado iniciado', 'En ruta', 'Llegada a destino',
  'Evidencia final', 'Entrega confirmada', 'Viaje cerrado',
]

export const mockTrips: Trip[] = [
  {
    id: 'RR-2024-001', status: 'traslado_curso', serviceType: 'personal',
    vehicle: mockVehicle, user: mockUsers[0], driver: mockDrivers[0],
    origin: { address: 'Av. Insurgentes Sur 1234, CDMX', reference: 'Torre azul' },
    destination: { address: 'Blvd. Kukulcán Km 12, Cancún', reference: 'Hotel Marriott' },
    originContact: { name: 'Carlos Mendoza', phone: '+52 55 1234 5678' },
    destinationContact: { name: 'Ana Ruiz', phone: '+52 998 765 4321' },
    scheduledAt: '2024-06-10T09:00:00',
    distanceKm: 1680, clientPriceMXN: 32200, driverPayMXN: 22540,
    timeline: TIMELINE_STEPS.map((label, i) => ({ step: i+1, label, done: i < 7, active: i === 7, timestamp: i < 7 ? `2024-06-10T${String(9+i).padStart(2,'0')}:00:00` : undefined })),
    evidence: [{ type: 'inicial', photos: [], kmReading: 45200, fuelLevel: 80, notes: 'Sin daños visibles', timestamp: '2024-06-10T09:30:00', status: 'aprobado' }],
    incidents: [], createdAt: '2024-06-09T18:00:00',
  },
  {
    id: 'RR-2024-002', status: 'pendiente_asignacion', serviceType: 'agencia',
    vehicle: { ...mockVehicle, id: 'veh_002', alias: 'Unidad 07', brand: 'Nissan', model: 'Versa', plates: 'XYZ-789' },
    user: mockUsers[1], driver: undefined,
    origin: { address: 'Periferico Sur 4000, CDMX' },
    destination: { address: 'Av. López Mateos 800, Guadalajara' },
    originContact: { name: 'Jorge Reyes', phone: '+52 55 7777 8888' },
    destinationContact: { name: 'Marco Silva', phone: '+52 33 9999 0000' },
    distanceKm: 480, clientPriceMXN: 11060, driverPayMXN: 7742,
    timeline: TIMELINE_STEPS.map((label, i) => ({ step: i+1, label, done: i < 2, active: i === 2 })),
    evidence: [], incidents: [], createdAt: '2024-06-10T08:00:00',
  },
  {
    id: 'RR-2024-003', status: 'finalizado', serviceType: 'empresarial',
    vehicle: { ...mockVehicle, id: 'veh_003', alias: 'Flotilla A1', brand: 'Chevrolet', model: 'Tahoe', plates: 'DEF-456' },
    user: mockUsers[1], driver: mockDrivers[1],
    origin: { address: 'Blvd. Manuel Ávila Camacho 32, CDMX' },
    destination: { address: 'Av. Constitución 100, Monterrey' },
    originContact: { name: 'AutoMax Ops', phone: '+52 55 8888 9999' },
    destinationContact: { name: 'Sucursal MTY', phone: '+52 81 1111 2222' },
    distanceKm: 920, clientPriceMXN: 22140, driverPayMXN: 15498,
    timeline: TIMELINE_STEPS.map((label, i) => ({ step: i+1, label, done: true, active: false, timestamp: `2024-05-20T${String(8+i).padStart(2,'0')}:00:00` })),
    evidence: [
      { type: 'inicial', photos: [], kmReading: 32100, fuelLevel: 70, timestamp: '2024-05-20T08:30:00', status: 'aprobado' },
      { type: 'final',   photos: [], kmReading: 33020, fuelLevel: 40, notes: 'Entrega sin novedad', timestamp: '2024-05-20T22:00:00', status: 'aprobado' },
    ],
    incidents: [], createdAt: '2024-05-19T14:00:00',
  },
  {
    id: 'RR-2024-004', status: 'incidente', serviceType: 'personal',
    vehicle: { ...mockVehicle, id: 'veh_004', alias: 'Sentra gris', brand: 'Nissan', model: 'Sentra', plates: 'GHI-321' },
    user: mockUsers[2], driver: mockDrivers[2],
    origin: { address: 'Calle Morelos 55, Guadalajara' },
    destination: { address: 'Av. Tulum 180, Cancún' },
    originContact: { name: 'Fernanda López', phone: '+52 33 2222 3333' },
    destinationContact: { name: 'Hotel receptor', phone: '+52 998 111 2222' },
    distanceKm: 1940, clientPriceMXN: 37100, driverPayMXN: 25970,
    timeline: TIMELINE_STEPS.map((label, i) => ({ step: i+1, label, done: i < 6, active: i === 6 })),
    evidence: [{ type: 'inicial', photos: [], kmReading: 28400, fuelLevel: 90, status: 'aprobado' }],
    incidents: [{ id: 'inc_001', tripId: 'RR-2024-004', type: 'dano_reportado', status: 'en_revision', description: 'Rayón en puerta trasera derecha reportado por conductor', createdAt: '2024-06-09T14:00:00' }],
    createdAt: '2024-06-08T10:00:00',
  },
]

export const mockDocuments: Document[] = [
  { id: 'doc_001', ownerId: 'drv_001', ownerType: 'driver', ownerName: 'Roberto Sánchez', type: 'Licencia de conducir', status: 'aprobado', uploadedAt: '2024-01-12', expiresAt: '2026-01-12' },
  { id: 'doc_002', ownerId: 'drv_004', ownerType: 'driver', ownerName: 'Ana Patricia Ruiz', type: 'Identificación oficial', status: 'en_revision', uploadedAt: '2024-06-01' },
  { id: 'doc_003', ownerId: 'drv_004', ownerType: 'driver', ownerName: 'Ana Patricia Ruiz', type: 'Licencia de conducir', status: 'pendiente_carga' },
  { id: 'doc_004', ownerId: 'drv_005', ownerType: 'driver', ownerName: 'Luis Torres', type: 'Comprobante de domicilio', status: 'vencido', uploadedAt: '2023-05-01', expiresAt: '2024-05-01' },
  { id: 'doc_005', ownerId: 'usr_002', ownerType: 'company', ownerName: 'AutoMax SA de CV', type: 'Constancia fiscal', status: 'aprobado', uploadedAt: '2024-01-20' },
]

export const mockPayments: Payment[] = [
  { id: 'pay_001', tripId: 'RR-2024-001', type: 'cobro_usuario', amount: 32200, status: 'pendiente', concept: 'Traslado CDMX → Cancún', date: '2024-06-10' },
  { id: 'pay_002', tripId: 'RR-2024-001', type: 'pago_conductor', amount: 22540, status: 'pendiente', concept: 'Pago conductor RR-2024-001', date: '2024-06-10' },
  { id: 'pay_003', tripId: 'RR-2024-003', type: 'cobro_usuario', amount: 22140, status: 'pagado', concept: 'Traslado CDMX → Monterrey', date: '2024-05-20' },
  { id: 'pay_004', tripId: 'RR-2024-003', type: 'pago_conductor', amount: 15498, status: 'pagado', concept: 'Pago conductor RR-2024-003', date: '2024-05-22' },
  { id: 'pay_005', tripId: 'RR-2024-002', type: 'cobro_usuario', amount: 11060, status: 'en_revision', concept: 'Traslado CDMX → Guadalajara', date: '2024-06-10' },
]

export const mockCompanies: Company[] = [
  { id: 'cmp_001', razonSocial: 'AutoMax SA de CV', nombre: 'Grupo AutoMax', rfc: 'AUT123456XYZ', contactName: 'Jorge Reyes', phone: '+52 55 8888 9999', email: 'ops@automax.mx', type: 'Agencia automotriz', tripsCount: 28, status: 'activo', createdAt: '2024-01-15' },
  { id: 'cmp_002', razonSocial: 'Lote Premier SA', nombre: 'Lote Premier', rfc: 'LPR987654ABC', contactName: 'Sandra Torres', phone: '+52 81 4444 5555', email: 'admin@lotepremier.mx', type: 'Lote de autos', tripsCount: 11, status: 'suspendido', createdAt: '2024-02-28' },
]

export const mockTariffs: Tariff[] = [
  { id: 'tar_001', name: 'Estándar', baseFare: 350, perKm: 18, minFare: 500, foraneaSurcharge: 1.25, driverBase: 245, driverPerKm: 12.6, active: true },
  { id: 'tar_002', name: 'Empresarial', baseFare: 300, perKm: 16, minFare: 450, foraneaSurcharge: 1.2, driverBase: 210, driverPerKm: 11.2, active: true },
  { id: 'tar_003', name: 'Urgente', baseFare: 500, perKm: 22, minFare: 700, foraneaSurcharge: 1.3, driverBase: 350, driverPerKm: 15.4, active: false },
]