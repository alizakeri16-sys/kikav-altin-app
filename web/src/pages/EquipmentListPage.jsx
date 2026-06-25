import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { todayShamsiString } from '../lib/jalaliDate'

export default function EquipmentListPage() {
  const { frequency } = useParams() // 'daily' | 'weekly'
  const navigate = useNavigate()
  const [equipmentList, setEquipmentList] = useState([])
  const [inspectedSet, setInspectedSet] = useState(new Set())
  const [loading, setLoading] = useState(true)

  const frequencyDays = frequency === 'daily' ? 1 : 7
  const title = frequency === 'daily' ? 'بازرسی روزانه' : 'بازرسی هفتگی'

  useEffect(() => {
    loadData()
  }, [frequency])

  async function loadData() {
    setLoading(true)
    const { data: equipment } = await supabase
      .from('equipment')
      .select('id, code, name')
      .eq('inspection_frequency_days', frequencyDays)
      .eq('is_active', true)
      .order('code')

    const today = todayShamsiString()
    // برای بازرسی روزانه فقط بررسی می‌کنیم امروز انجام شده یا نه
    // برای بازرسی هفتگی، بررسی می‌کنیم در ۷ روز گذشته انجام شده یا نه (با مقایسه تاریخ میلادی)
    let query = supabase
      .from('inspection_records')
      .select('equipment_id, inspection_date')
      .eq('is_complete', true)

    if (frequency === 'daily') {
      query = query.eq('inspection_date_shamsi', today)
    } else {
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      query = query.gte('inspection_date', sevenDaysAgo.toISOString().slice(0, 10))
    }

    const { data: inspections } = await query

    setEquipmentList(equipment || [])
    setInspectedSet(new Set((inspections || []).map((r) => r.equipment_id)))
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
          const isDone = inspectedSet.has(eq.id)
          return (
            <button
              key={eq.id}
              className="card"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
              }}
              onClick={() => navigate(`/maintenance/inspection/${frequency}/${eq.id}`)}
            >
              <span className={`badge ${isDone ? 'badge-success' : 'badge-neutral'}`}>
                {isDone ? 'انجام شد' : 'بازرسی نشده'}
              </span>
              <span style={{ fontWeight: 500 }}>{eq.name}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
