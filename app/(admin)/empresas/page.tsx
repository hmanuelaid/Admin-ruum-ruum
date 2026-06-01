'use client'
import { useCallback, useEffect, useState } from 'react'
import { Chip } from '@/components/ui/Chip'
import { useAppStore } from '@/lib/store'

type CompanyStatus = 'activo' | 'suspendido'
type CompanyType = 'agencia' | 'lote' | 'arrendadora' | 'flotilla' | 'taller' | 'aseguradora' | 'otro'

type CompanyRow = {
  id: string
  name: string
  business_name: string
  rfc: string
  contact_name: string
  phone: string | null
  email: string
  type: CompanyType
  status: CompanyStatus
  trips_count: number
  created_at: string
  updated_at: string
}

type CompanyForm = {
  name: string
  businessName: string
  rfc: string
  contactName: string
  phone: string
  email: string
  type: CompanyType
  status: CompanyStatus
}

type CompaniesSummary = {
  total: number
  activas: number
  suspendidas: number
  viajesTotal: number
}

type CompaniesPayload = {
  companies?: CompanyRow[]
  summary?: CompaniesSummary
  total?: number
  page?: number
  pageSize?: number
  error?: string
}

const PAGE_SIZE = 25

const TYPE_LABELS: Record<CompanyType, string> = {
  agencia: 'Agencia automotriz',
  lote: 'Lote de autos',
  arrendadora: 'Arrendadora',
  flotilla: 'Flotilla',
  taller: 'Taller',
  aseguradora: 'Aseguradora',
  otro: 'Otro',
}

const EMPTY_FORM: CompanyForm = {
  name: '',
  businessName: '',
  rfc: '',
  contactName: '',
  phone: '',
  email: '',
  type: 'agencia',
  status: 'activo',
}

async function requestJson(path: string, init?: RequestInit) {
  const response = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })
  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(typeof data.error === 'string' ? data.error : 'No se pudo completar la operación')
  }

  return data
}

function toForm(company: CompanyRow): CompanyForm {
  return {
    name: company.name,
    businessName: company.business_name,
    rfc: company.rfc,
    contactName: company.contact_name,
    phone: company.phone ?? '',
    email: company.email,
    type: company.type,
    status: company.status,
  }
}

export default function EmpresasPage() {
  const { showToast } = useAppStore()
  const [companies, setCompanies] = useState<CompanyRow[]>([])
  const [summary, setSummary] = useState<CompaniesSummary>({ total: 0, activas: 0, suspendidas: 0, viajesTotal: 0 })
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [editing, setEditing] = useState<CompanyRow | null>(null)
  const [form, setForm] = useState<CompanyForm>(EMPTY_FORM)

  const loadCompanies = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true)

    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(PAGE_SIZE),
    })
    if (search.trim()) params.set('search', search.trim())
    if (typeFilter) params.set('type', typeFilter)
    if (statusFilter) params.set('status', statusFilter)

    try {
      const data = await requestJson(`/api/admin/companies?${params.toString()}`) as CompaniesPayload
      setCompanies(data.companies ?? [])
      setSummary(data.summary ?? { total: 0, activas: 0, suspendidas: 0, viajesTotal: 0 })
      setTotal(data.total ?? 0)
    } catch (error) {
      showToast(`No se pudieron cargar empresas: ${error instanceof Error ? error.message : 'operación fallida'}`)
    } finally {
      if (showLoading) setLoading(false)
    }
  }, [page, search, showToast, statusFilter, typeFilter])

  useEffect(() => {
    const timeout = setTimeout(() => void loadCompanies(), 250)
    return () => clearTimeout(timeout)
  }, [loadCompanies])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const modalOpen = editing !== null || form !== EMPTY_FORM

  function updateForm<K extends keyof CompanyForm>(key: K, value: CompanyForm[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  function resetFilters() {
    setSearch('')
    setTypeFilter('')
    setStatusFilter('')
    setPage(1)
  }

  function openCreate() {
    setEditing(null)
    setForm({ ...EMPTY_FORM })
  }

  function openEdit(company: CompanyRow) {
    setEditing(company)
    setForm(toForm(company))
  }

  function closeModal() {
    setEditing(null)
    setForm(EMPTY_FORM)
  }

  async function handleSave() {
    setSaving(true)
    try {
      if (editing) {
        await requestJson(`/api/admin/companies/${editing.id}`, {
          method: 'PATCH',
          body: JSON.stringify(form),
        })
        showToast('Empresa actualizada')
      } else {
        await requestJson('/api/admin/companies', {
          method: 'POST',
          body: JSON.stringify(form),
        })
        showToast('Empresa creada')
      }
      closeModal()
      void loadCompanies(false)
    } catch (error) {
      showToast(`No se pudo guardar: ${error instanceof Error ? error.message : 'operación fallida'}`)
    } finally {
      setSaving(false)
    }
  }

  async function handleStatusToggle(company: CompanyRow) {
    const nextStatus = company.status === 'activo' ? 'suspendido' : 'activo'
    try {
      await requestJson(`/api/admin/companies/${company.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      })
      setCompanies(prev => prev.map(item => item.id === company.id ? { ...item, status: nextStatus } : item))
      showToast(nextStatus === 'activo' ? 'Empresa activada' : 'Empresa suspendida')
      void loadCompanies(false)
    } catch (error) {
      showToast(`No se pudo cambiar estatus: ${error instanceof Error ? error.message : 'operación fallida'}`)
    }
  }

  async function handleDelete(company: CompanyRow) {
    if (!window.confirm(`Eliminar ${company.name}? Esta acción no se puede deshacer.`)) return

    try {
      await requestJson(`/api/admin/companies/${company.id}`, { method: 'DELETE' })
      setCompanies(prev => prev.filter(item => item.id !== company.id))
      showToast('Empresa eliminada')
      void loadCompanies(false)
    } catch (error) {
      showToast(`No se pudo eliminar: ${error instanceof Error ? error.message : 'operación fallida'}`)
    }
  }

  function handleFilterChange(setter: (value: string) => void, value: string) {
    setter(value)
    setPage(1)
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Empresas</h1>
          <p className="page-sub">{loading ? 'Cargando…' : `${total} empresas en el listado · ${summary.total} registradas`}</p>
        </div>
        <button className="btn-primary" onClick={openCreate}>
          + Nueva empresa
        </button>
      </div>

      <div className="metrics-grid">
        {[
          { label: 'Total', value: summary.total, icon: '🏢', color: 'var(--primary-dim)' },
          { label: 'Activas', value: summary.activas, icon: '✓', color: 'rgba(34,197,94,.12)' },
          { label: 'Suspendidas', value: summary.suspendidas, icon: '!', color: 'rgba(239,68,68,.12)' },
          { label: 'Viajes total', value: summary.viajesTotal, icon: '→', color: 'rgba(56,189,248,.12)' },
        ].map(metric => (
          <div key={metric.label} className="metric-card">
            <div className="icon" style={{ background: metric.color }}>{metric.icon}</div>
            <p className="value">{metric.value}</p>
            <p className="label">{metric.label}</p>
          </div>
        ))}
      </div>

      <div className="filters-bar">
        <div className="filter-search">
          <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            placeholder="Buscar por nombre, RFC, contacto o correo…"
            value={search}
            onChange={event => handleFilterChange(setSearch, event.target.value)}
          />
        </div>
        <select className="filter-select" value={typeFilter} onChange={event => handleFilterChange(setTypeFilter, event.target.value)}>
          <option value="">Cualquier tipo</option>
          {Object.entries(TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <select className="filter-select" value={statusFilter} onChange={event => handleFilterChange(setStatusFilter, event.target.value)}>
          <option value="">Cualquier estatus</option>
          <option value="activo">Activa</option>
          <option value="suspendido">Suspendida</option>
        </select>
        {(search || typeFilter || statusFilter) && (
          <button className="btn-secondary" onClick={resetFilters}>Limpiar filtros</button>
        )}
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Empresa</th><th>RFC</th><th>Tipo</th><th>Contacto</th>
              <th>Viajes</th><th>Registro</th><th>Estatus</th><th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8}><div className="empty-state"><p className="muted">Cargando empresas…</p></div></td></tr>
            ) : companies.length === 0 ? (
              <tr><td colSpan={8}>
                <div className="empty-state">
                  <span className="icon">🏢</span>
                  <p style={{ fontWeight: 600 }}>Sin empresas</p>
                  <p className="muted">No hay registros que coincidan con los filtros.</p>
                </div>
              </td></tr>
            ) : companies.map(company => (
              <tr key={company.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--primary-dim)', display: 'grid', placeItems: 'center', flexShrink: 0, fontSize: '1rem' }}>
                      🏢
                    </div>
                    <div>
                      <p className="td-bold">{company.name}</p>
                      <p className="td-muted">{company.business_name}</p>
                    </div>
                  </div>
                </td>
                <td className="mono" style={{ fontSize: 12 }}>{company.rfc}</td>
                <td><Chip variant="primary">{TYPE_LABELS[company.type] ?? company.type}</Chip></td>
                <td>
                  <p style={{ fontSize: 13 }}>{company.contact_name}</p>
                  <p className="td-muted">{company.email}</p>
                  {company.phone && <p className="td-muted">{company.phone}</p>}
                </td>
                <td className="td-bold">{company.trips_count}</td>
                <td className="td-muted">{new Date(company.created_at).toLocaleDateString('es-MX')}</td>
                <td>
                  <Chip status={company.status}>
                    {company.status === 'activo' ? 'Activa' : 'Suspendida'}
                  </Chip>
                </td>
                <td>
                  <div className="td-actions">
                    <button className="btn-secondary" style={{ fontSize: 12, padding: '4px 10px' }}
                      onClick={() => openEdit(company)}>Editar</button>
                    <button className="btn-secondary" style={{ fontSize: 12, padding: '4px 10px' }}
                      onClick={() => handleStatusToggle(company)}>
                      {company.status === 'activo' ? 'Suspender' : 'Activar'}
                    </button>
                    <button className="btn-danger" style={{ fontSize: 12, padding: '4px 10px' }}
                      onClick={() => handleDelete(company)}>Eliminar</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 2px' }}>
        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          {total} resultado{total !== 1 ? 's' : ''} · página {page} de {totalPages}
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-secondary" style={{ fontSize: 12 }}
            disabled={page <= 1 || loading}
            onClick={() => setPage(prev => Math.max(1, prev - 1))}>
            Anterior
          </button>
          <button className="btn-secondary" style={{ fontSize: 12 }}
            disabled={page >= totalPages || loading}
            onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}>
            Siguiente
          </button>
        </div>
      </div>

      {modalOpen && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.62)', zIndex: 250,
          display: 'grid', placeItems: 'center', padding: 16,
        }}>
          <div style={{
            width: 'min(620px, 100%)', maxHeight: 'calc(100dvh - 32px)', overflowY: 'auto',
            background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
            padding: 20, display: 'flex', flexDirection: 'column', gap: 16,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
              <div>
                <p className="kicker">{editing ? 'Editar empresa' : 'Nueva empresa'}</p>
                <h2 style={{ fontSize: 18, marginTop: 2 }}>{editing ? editing.name : 'Alta de cliente empresarial'}</h2>
              </div>
              <button className="btn-icon" onClick={closeModal} aria-label="Cerrar">×</button>
            </div>

            <div className="form-section">
              <div className="form-row">
                <label className="field-group">
                  <span className="field-label">Nombre comercial</span>
                  <input className="field-input" value={form.name} onChange={event => updateForm('name', event.target.value)} />
                </label>
                <label className="field-group">
                  <span className="field-label">Razón social</span>
                  <input className="field-input" value={form.businessName} onChange={event => updateForm('businessName', event.target.value)} />
                </label>
              </div>

              <div className="form-row">
                <label className="field-group">
                  <span className="field-label">RFC</span>
                  <input className="field-input" value={form.rfc} onChange={event => updateForm('rfc', event.target.value.toUpperCase())} maxLength={13} />
                </label>
                <label className="field-group">
                  <span className="field-label">Tipo</span>
                  <select className="field-select" value={form.type} onChange={event => updateForm('type', event.target.value as CompanyType)}>
                    {Object.entries(TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </label>
              </div>

              <div className="form-row">
                <label className="field-group">
                  <span className="field-label">Contacto principal</span>
                  <input className="field-input" value={form.contactName} onChange={event => updateForm('contactName', event.target.value)} />
                </label>
                <label className="field-group">
                  <span className="field-label">Teléfono</span>
                  <input className="field-input" value={form.phone} onChange={event => updateForm('phone', event.target.value)} />
                </label>
              </div>

              <div className="form-row">
                <label className="field-group">
                  <span className="field-label">Correo</span>
                  <input className="field-input" type="email" value={form.email} onChange={event => updateForm('email', event.target.value)} />
                </label>
                <label className="field-group">
                  <span className="field-label">Estatus</span>
                  <select className="field-select" value={form.status} onChange={event => updateForm('status', event.target.value as CompanyStatus)}>
                    <option value="activo">Activa</option>
                    <option value="suspendido">Suspendida</option>
                  </select>
                </label>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
              <button className="btn-secondary" onClick={closeModal} disabled={saving}>Cancelar</button>
              <button className="btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear empresa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
