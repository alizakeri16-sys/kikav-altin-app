import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/AuthContext'
import { todayShamsiString } from '../lib/jalaliDate'
import InspectionItemRow from '../components/maintenance/InspectionItemRow'

export default function InspectionFormPage() {
  const { frequency, equipmentId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [equipment, setEquipment] = useState(null)
  const [items, setItems] = useState([])
  const [values, setValues] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    loadData()
  }, [equipmentId])

  async function loadData() {
    setLoading(true)
    const { data: eq } = await supabase.from('equipment').select('*').eq('id', equipmentId).single()
    const { data: checklistItems } = await supabase
      .from('inspection_checklist_items')
      .select('*')
      .eq('equipment_id', equipmentId)
      .eq('is_active', true)
      .order('item_order')

    setEquipment(eq)
    setItems(checklistItems || [])

    const initialValues = {}
    ;(checklistItems || []).forEach((item) => {
      initialValues[item.id] = { status: null, numericValue: '', note: '', photoUrl: null }
    })
    setValues(initialValues)
    setLoading(false)
  }

  function updateValue(itemId, newValue) {
    setValues((prev) => ({ ...prev, [itemId]: newValue }))
  }

  const completedCount = Object.values(values).filter((v) => v.status).length

  async function handleSubmit() {
    if (completedCount < items.length) {
      setMessage(`${items.length - completedCount} مورد هنوز بررسی نشده است`)
      return
    }

    setSaving(true)
    try {
      const { data: record, error: recordError } = await supabase
        .from('inspection_records')
        .insert({
          equipment_id: equipmentId,
          inspected_by: user?.id,
          inspection_date: new Date().toISOString().slice(0, 10),
          inspection_date_shamsi: todayShamsiString(),
          is_complete: true,
        })
        .select()
        .single()

      if (recordError) throw recordError

      const resultsPayload = items.map((item) => ({
        inspection_record_id: record.id,
        checklist_item_id: item.id,
        status: values[item.id].status,
        numeric_value: values[item.id].numericValue || null,
        note: values[item.id].note || null,
        photo_url: values[item.id].photoUrl || null,
      }))

      await supabase.from('inspection_results').insert(resultsPayload)

      setMessage('بازرسی با موفقیت ثبت شد')
      setTimeout(() => navigate(`/maintenance/inspection/${frequency}`), 1000)
    } catch (err) {
      console.error(err)
      setMessage('ثبت بازرسی با خطا مواجه شد')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p style={{ textAlign: 'center', padding: 40 }}>در حال بارگذاری...</p>

  let lastCategory = null

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <span className="badge badge-neutral">{completedCount} / {items.length}</span>
        <p style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>{equipment?.name}</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.map((item) => {
          const showCategoryHeader = item.category && item.category !== lastCategory
          lastCategory = item.category
          return (
            <div key={item.id}>
              {showCategoryHeader && (
                <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', margin: '8px 0 6px' }}>
                  {item.category}
                </p>
              )}
              <InspectionItemRow
                item={item}
                value={values[item.id] || {}}
                onChange={(v) => updateValue(item.id, v)}
                equipmentId={equipmentId}
                frequency={frequency}
              />
            </div>
          )
        })}
      </div>

      <button className="btn-primary" style={{ width: '100%', marginTop: 16 }} disabled={saving} onClick={handleSubmit}>
        {saving ? 'در حال ثبت...' : 'ثبت بازرسی'}
      </button>
      {message && <p style={{ textAlign: 'center', marginTop: 10 }}>{message}</p>}
    </div>
  )
}
