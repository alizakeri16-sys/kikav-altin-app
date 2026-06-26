import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../lib/apiClient'
import { todayShamsiString, shamsiStringToIsoDate } from '../lib/jalaliDate'
import InspectionItemRow from '../components/maintenance/InspectionItemRow'
import ShamsiDatePicker from '../components/ShamsiDatePicker'
import ConfirmSubmitDialog from '../components/ConfirmSubmitDialog'

export default function InspectionFormPage() {
  const { frequency, equipmentId } = useParams()
  const navigate = useNavigate()

  const [equipment, setEquipment] = useState(null)
  const [items, setItems] = useState([])
  const [values, setValues] = useState({})
  const [inspectionDateShamsi, setInspectionDateShamsi] = useState(todayShamsiString())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)

  useEffect(() => {
    loadData()
  }, [equipmentId])

  async function loadData() {
    setLoading(true)
    const data = await api.get(`/maintenance/equipment/${equipmentId}`)
    setEquipment(data.equipment)
    setItems(data.items)

    const initialValues = {}
    data.items.forEach((item) => {
      initialValues[item.id] = { status: null, numericValue: '', note: '', photoUrl: null }
    })
    setValues(initialValues)
    setLoading(false)
  }

  function updateValue(itemId, newValue) {
    setValues((prev) => ({ ...prev, [itemId]: newValue }))
  }

  const completedCount = Object.values(values).filter((v) => v.status).length

  function handleSubmit() {
    if (completedCount < items.length) {
      setMessage(`${items.length - completedCount} مورد هنوز بررسی نشده است`)
      return
    }
    setShowConfirm(true)
  }

  async function confirmAndSubmit() {
    setShowConfirm(false)
    setSaving(true)
    try {
      const results = items.map((item) => ({
        checklistItemId: item.id,
        status: values[item.id].status,
        numericValue: values[item.id].numericValue || null,
        note: values[item.id].note || null,
        photoUrl: values[item.id].photoUrl || null,
      }))

      await api.post('/maintenance/inspections', {
        equipmentId,
        dateIso: shamsiStringToIsoDate(inspectionDateShamsi),
        dateShamsi: inspectionDateShamsi,
        results,
      })

      setMessage('بازرسی با موفقیت ثبت شد')
      setTimeout(() => navigate(`/maintenance/inspection/${frequency}`), 1000)
    } catch (err) {
      console.error(err)
      setMessage(err.message || 'ثبت بازرسی با خطا مواجه شد')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p style={{ textAlign: 'center', padding: 40 }}>در حال بارگذاری...</p>

  let lastCategory = null

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: 16 }}>
      <div style={{ marginBottom: 10 }}>
        <button className="btn-secondary" onClick={() => navigate(`/maintenance/inspection/${frequency}`)}>
          ← بازگشت
        </button>
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <ShamsiDatePicker label="تاریخ بازرسی" value={inspectionDateShamsi} onChange={setInspectionDateShamsi} />
      </div>

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

      <ConfirmSubmitDialog
        open={showConfirm}
        onConfirm={confirmAndSubmit}
        onCancel={() => setShowConfirm(false)}
        message="آیا از ثبت نهایی این بازرسی مطمئن هستید؟ پس از ثبت، امکان ویرایش توسط شما وجود نخواهد داشت."
      />
    </div>
  )
}
