import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../lib/apiClient'
import { todayShamsiString } from '../lib/jalaliDate'

export default function EquipmentListPage() {
  const { frequency } = useParams() // 'daily' | 'weekly'
  const navigate = useNavigate()
  const [equipmentList, setEquipmentList] = useState([])
  const [inspectedMap, setInspectedMap] = useState({})
  const [loading, setLoading] = useState(true)

  const title = frequency === 'daily' ? 'بازرسی روزانه' : 'بازرسی هفتگی'

  useEffect(() => {
    loadData()
  }, [frequency])

  async function loadData() {
    setLoading(true)
    const equipment = await api.get(`/maintenance/equipment?frequency=${frequency}`)
    const today = todayShamsiString()
    const statusRows = await api.get(`/maintenance/inspections/status?dateShamsi=${encodeURIComponent(today)}&frequency=${frequency}`)

    const map = {}
    statusRows.forEach((row) => {
      map[row.equipment_id] = row.full_name
    })

    setEquipmentList(equipment)
    setInspectedMap(map)
    setLoading(false)
  }

  if (loading) {
    return <p style={{ textAlign: 'center', padding: 40 }}>در حال بارگذاری...</p>
  }

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: 16 }}>
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', margin: 0 }}>شرکت کی‌کاو آلتین</p>
        <p style={{ fontSize: 18, fontWeight: 600, margin: '4px 0 0' }}>{title}</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {equipmentList.map((eq) => {
          const isDone = !!inspectedMap[eq.id]
          return (
            <button
              key={eq.id}
              className="card"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}
              onClick={() => navigate(`/maintenance/inspection/${frequency}/${eq.id}`)}
            >
              <span className={`badge ${isDone ? 'badge-success' : 'badge-neutral'}`}>
                {isDone ? `انجام شد${inspectedMap[eq.id] ? ' — ' + inspectedMap[eq.id] : ''}` : 'بازرسی نشده'}
              </span>
              <span style={{ fontWeight: 500 }}>{eq.name}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
