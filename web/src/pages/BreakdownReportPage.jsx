import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/AuthContext'
import OptionalPhotoUpload from '../components/OptionalPhotoUpload'

export default function BreakdownReportPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
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
    supabase
      .from('equipment')
      .select('id, name')
      .eq('is_active', true)
      .order('name')
      .then(({ data }) => setEquipmentList(data || []))
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
      await supabase.from('breakdown_records').insert({
        equipment_id: form.equipmentId,
        reported_by: user?.id,
        breakdown_type: 'اتفاقی',
        failure_datetime: new Date().toISOString(),
        cause: form.cause,
        corrective_action: form.correctiveAction || null,
        spare_parts_used: form.sparePartsUsed || null,
        photo_url: form.photoUrl,
        status: 'باز',
      })

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
