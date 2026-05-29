'use client'
import { useState } from 'react'
import { useAppStore } from '@/lib/store'
import { Chip } from '@/components/ui/Chip'

const ROLES = [
  { id: 'super_admin',     label: 'Super administrador', desc: 'Acceso total a la plataforma',                              color: 'var(--danger)' },
  { id: 'admin_operativo', label: 'Admin operativo',     desc: 'Viajes, conductores, evidencia e incidencias',             color: 'var(--primary)' },
  { id: 'finanzas',        label: 'Finanzas',            desc: 'Pagos, depósitos, gastos y reportes financieros',          color: 'var(--success)' },
  { id: 'soporte',         label: 'Soporte',             desc: 'Atención a usuarios, conductores e incidencias',           color: 'var(--accent)' },
  { id: 'validador',       label: 'Validador documental', desc: 'Revisión y aprobación de documentos',                    color: 'var(--warning)' },
  { id: 'comercial',       label: 'Comercial',           desc: 'Empresas, usuarios corporativos y condiciones comerciales', color: 'var(--primary)' },
]

const INTERNAL_USERS = [
  { name: 'Super Admin',    email: 'admin@moviliax.com',    role: 'super_admin',     status: 'activo' },
  { name: 'Carlos Ops',     email: 'carlos@moviliax.com',   role: 'admin_operativo', status: 'activo' },
  { name: 'María Finanzas', email: 'maria@moviliax.com',    role: 'finanzas',        status: 'activo' },
  { name: 'Pedro Soporte',  email: 'pedro@moviliax.com',    role: 'soporte',         status: 'activo' },
]

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin', admin_operativo: 'Admin Operativo',
  finanzas: 'Finanzas', soporte: 'Soporte',
  validador: 'Validador', comercial: 'Comercial',
}

type Tab = 'Roles' | 'Usuarios internos' | 'Operación' | 'Notificaciones' | 'Seguridad'

export default function ConfiguracionPage() {
  const [tab, setTab] = useState<Tab>('Roles')
  const { showToast } = useAppStore()

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Configuración</h1>
          <p className="page-sub">Administración general de la plataforma</p>
        </div>
      </div>

      <div className="tabs">
        {(['Roles','Usuarios internos','Operación','Notificaciones','Seguridad'] as Tab[]).map(t => (
          <button key={t} className={`tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {tab === 'Roles' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {ROLES.map(r => (
            <div key={r.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: r.color, flexShrink: 0 }} />
                <p style={{ fontWeight: 700, fontSize: 14 }}>{r.label}</p>
              </div>
              <p className="muted" style={{ fontSize: 13 }}>{r.desc}</p>
              <button className="btn-secondary" style={{ fontSize: 12, alignSelf: 'flex-start' }}
                onClick={() => showToast(`Editando permisos de ${r.label}`)}>
                Ver permisos →
              </button>
            </div>
          ))}
        </div>
      )}

      {tab === 'Usuarios internos' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn-primary" onClick={() => showToast('Invitar usuario interno — próximamente')}>
              + Invitar usuario
            </button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nombre</th><th>Correo</th><th>Rol</th><th>Estatus</th><th></th>
                </tr>
              </thead>
              <tbody>
                {INTERNAL_USERS.map((u, i) => (
                  <tr key={i}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--primary-dim)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                          👤
                        </div>
                        <p className="td-bold">{u.name}</p>
                      </div>
                    </td>
                    <td className="td-muted">{u.email}</td>
                    <td><Chip variant="primary">{ROLE_LABELS[u.role]}</Chip></td>
                    <td><Chip status="activo">Activo</Chip></td>
                    <td>
                      <div className="td-actions">
                        <button className="btn-secondary" style={{ fontSize: 12, padding: '4px 10px' }}
                          onClick={() => showToast(`Editando a ${u.name}`)}>Editar</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'Operación' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {[
            { title: 'Zonas de operación', desc: 'Configura las ciudades y estados donde opera Ruum Ruum', icon: '📍' },
            { title: 'Tipos de servicio',  desc: 'Define y personaliza los tipos de traslado disponibles', icon: '🔧' },
            { title: 'Tipos de vehículo',  desc: 'Administra las categorías de vehículos aceptados',       icon: '🚗' },
            { title: 'Reglas de evidencia',desc: 'Define qué fotos y datos son obligatorios por etapa',    icon: '📸' },
            { title: 'Estados de viaje',   desc: 'Configura el flujo de estatus de los traslados',         icon: '🔄' },
            { title: 'Gastos autorizados', desc: 'Define tipos de gasto que pueden reportar conductores',  icon: '💳' },
          ].map(item => (
            <div key={item.title} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: '1.5rem' }}>{item.icon}</div>
              <p style={{ fontWeight: 700, fontSize: 14 }}>{item.title}</p>
              <p className="muted" style={{ fontSize: 13 }}>{item.desc}</p>
              <button className="btn-secondary" style={{ fontSize: 12, alignSelf: 'flex-start' }}
                onClick={() => showToast(`${item.title} — próximamente`)}>
                Configurar →
              </button>
            </div>
          ))}
        </div>
      )}

      {tab === 'Notificaciones' && (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {[
            { label: 'Nuevo viaje solicitado',        desc: 'Cuando un usuario solicita un traslado',         on: true },
            { label: 'Viaje sin conductor asignado',  desc: 'Alerta cuando pasan más de 30 min sin asignar',  on: true },
            { label: 'Evidencia incompleta',          desc: 'Notificar al equipo si falta evidencia',         on: true },
            { label: 'Incidencia reportada',          desc: 'Alerta inmediata por incidente en traslado',     on: true },
            { label: 'Documento vencido',             desc: 'Recordatorio de documentos por vencer',         on: false },
            { label: 'Pago pendiente',                desc: 'Notificar pagos sin procesar después de 24h',   on: false },
            { label: 'Conductor registrado',          desc: 'Nuevo conductor pendiente de validación',       on: true },
          ].map((n, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 0', borderBottom: '1px solid var(--border)',
            }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 500 }}>{n.label}</p>
                <p className="muted" style={{ fontSize: 12 }}>{n.desc}</p>
              </div>
              <button
                onClick={() => showToast('Preferencia guardada')}
                style={{
                  width: 42, height: 24, borderRadius: 12,
                  background: n.on ? 'var(--primary)' : 'var(--border)',
                  border: 'none', cursor: 'pointer', position: 'relative',
                  transition: 'background .2s', flexShrink: 0,
                }}>
                <span style={{
                  position: 'absolute', top: 2,
                  left: n.on ? 20 : 2,
                  width: 20, height: 20, borderRadius: '50%',
                  background: '#fff', transition: 'left .2s',
                }} />
              </button>
            </div>
          ))}
        </div>
      )}

      {tab === 'Seguridad' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 560 }}>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p style={{ fontWeight: 700, fontSize: 15 }}>Seguridad de la plataforma</p>
            {[
              { label: 'Autenticación de dos factores', value: 'Activada' },
              { label: 'Sesiones activas',              value: '4 sesiones' },
              { label: 'Último acceso',                 value: 'Hoy, 10:32 AM' },
              { label: 'Intentos fallidos (7 días)',    value: '0' },
            ].map(item => (
              <div key={item.label} style={{
                display: 'flex', justifyContent: 'space-between',
                padding: '10px 0', borderBottom: '1px solid var(--border)',
              }}>
                <span style={{ fontSize: 14 }}>{item.label}</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-muted)' }}>{item.value}</span>
              </div>
            ))}
          </div>

          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ fontWeight: 700, fontSize: 15 }}>Bitácora de cambios recientes</p>
            {[
              { time: '10:32', user: 'Super Admin',  action: 'Inició sesión' },
              { time: '09:15', user: 'Carlos Ops',   action: 'Asignó conductor a RR-2024-002' },
              { time: '08:50', user: 'María Finanzas', action: 'Aprobó pago pay_003' },
              { time: 'Ayer',  user: 'Pedro Soporte', action: 'Actualizó estatus de incidencia inc_001' },
            ].map((entry, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, fontSize: 13 }}>
                <span className="td-muted" style={{ flexShrink: 0, width: 40 }}>{entry.time}</span>
                <span style={{ fontWeight: 600, flexShrink: 0 }}>{entry.user}</span>
                <span className="td-muted">{entry.action}</span>
              </div>
            ))}
          </div>

          <button className="btn-danger" style={{ alignSelf: 'flex-start' }}
            onClick={() => showToast('Cerrando todas las sesiones…')}>
            Cerrar todas las sesiones
          </button>
        </div>
      )}
    </>
  )
}