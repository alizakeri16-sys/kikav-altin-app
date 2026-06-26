import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/apiClient'
import OptionalPhotoUpload from '../components/OptionalPhotoUpload'

export default function BreakdownReportPage() {
  const navigate = useNavigate()
  const [equipmentList, setEquipmentList] = useState([])
  const [form, setForm] = useState({
    equipmentId: '',
    cause: '',
    correctiveAction: '',
    sparePartsUsed: '',
    photoUrl: null,
  })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    api.get('/maintenance/equipment?frequency=daily').then((daily) => {
      api.get('/maintenance/equipment?frequency=weekly').then((weekly) => {
        setEquipmentList([...daily, ...weekly].sort((a, b) => a.name.localeCompare(b.name)))
      })
    })
  }, [])

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit() {
    if (!form.equipmentId || !form.cause) {
      setMessage('لطفاً تجهیز و علت خرابی را وارد کنید')
      return
    }

    setSaving(true)
    try {
      await api.post('/maintenance/breakdown', form)
      setMessage('خرابی با موفقیت ثبت شد')
      setTimeout(() => navigate('/maintenance'), 1000)
    } catch (err) {
      console.error(err)
      setMessage('ثبت خرابی با خطا مواجه شد')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: '0 auto', padding: 16 }}>
      <div style={{ marginBottom: 10 }}>
        <button className="btn-secondary" onClick={() => navigate('/maintenance')}>
          ← بازگشت
        </button>
      </div>
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <p style={{ fontSize: 18, fontWeight: 600, margin: 0, color: 'var(--color-danger-text)' }}>ثبت خرابی فوری</p>
      </div>

      <div className="card">
        <div style={{ marginBottom: 12 }}>
          <span className="label label-required">تجهیز</span>
          <select value={form.equipmentId} onChange={(e) => update('equipmentId', e.target.value)}>
            <option value="">انتخاب کنید...</option>
            {equipmentList.map((eq) => (
              <option key={eq.id} value={eq.id}>{eq.name}</option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: 12 }}>
          <span className="label label-required">علت خرابی</span>
          <textarea rows={3} value={form.cause} onChange={(e) => update('cause', e.target.value)} />
        </div>

        <div style={{ marginBottom: 12 }}>
          <span className="label">اقدام انجام‌شده (اختیاری)</span>
          <textarea rows={2} value={form.correctiveAction} onChange={(e) => update('correctiveAction', e.target.value)} />
        </div>

        <div style={{ marginBottom: 12 }}>
          <span className="label">قطعات مصرفی (اختیاری)</span>
          <input value={form.sparePartsUsed} onChange={(e) => update('sparePartsUsed', e.target.value)} />
        </div>

        <OptionalPhotoUpload value={form.photoUrl} onChange={(url) => update('photoUrl', url)} />
      </div>

      <button
        className="btn-primary"
        style={{ width: '100%', marginTop: 16, background: 'var(--color-danger-text)' }}
        disabled={saving}
        onClick={handleSubmit}
      >
        {saving ? 'در حال ثبت...' : 'ثبت خرابی'}
      </button>
      {message && <p style={{ textAlign: 'center', marginTop: 10 }}>{message}</p>}
    </div>
  )
}
