import HasRecordToggle from '../HasRecordToggle'
import OptionalPhotoUpload from '../OptionalPhotoUpload'

function newBreakdownRow() {
  return { partName: '', partSpecifications: '', relatedEquipment: '', cause: '', correctiveAction: '', delayMinutes: '', photoUrl: null }
}

export default function BreakdownSection({ hasBreakdown, breakdowns, onChangeHasBreakdown, onChangeBreakdowns }) {
  function handleToggle(value) {
    onChangeHasBreakdown(value)
    if (value && breakdowns.length === 0) {
      onChangeBreakdowns([newBreakdownRow()])
    }
  }

  function updateRow(index, key, value) {
    onChangeBreakdowns(breakdowns.map((b, i) => (i === index ? { ...b, [key]: value } : b)))
  }

  function addRow() {
    onChangeBreakdowns([...breakdowns, newBreakdownRow()])
  }

  function removeRow(index) {
    onChangeBreakdowns(breakdowns.filter((_, i) => i !== index))
  }

  return (
    <div style={{ marginTop: 18 }}>
      <HasRecordToggle label="آیا خرابی قطعه‌ای رخ داد؟" hasRecord={hasBreakdown} onChange={handleToggle} />
      {hasBreakdown && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {breakdowns.map((row, index) => (
            <div key={index} className="card" style={{ background: 'var(--color-surface-alt)', padding: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <span className="label label-required">نام قطعه</span>
                  <input value={row.partName} onChange={(e) => updateRow(index, 'partName', e.target.value)} />
                </div>
                <div>
                  <span className="label label-required">تجهیز مربوطه</span>
                  <input value={row.relatedEquipment} onChange={(e) => updateRow(index, 'relatedEquipment', e.target.value)} />
                </div>
              </div>
              <div style={{ marginTop: 8 }}>
                <span className="label">مشخصات قطعه (اختیاری)</span>
                <input value={row.partSpecifications} onChange={(e) => updateRow(index, 'partSpecifications', e.target.value)} />
              </div>
              <div style={{ marginTop: 8 }}>
                <span className="label label-required">علت خرابی</span>
                <textarea rows={2} value={row.cause} onChange={(e) => updateRow(index, 'cause', e.target.value)} />
              </div>
              <div style={{ marginTop: 8 }}>
                <span className="label label-required">اقدام اصلاحی</span>
                <textarea rows={2} value={row.correctiveAction} onChange={(e) => updateRow(index, 'correctiveAction', e.target.value)} />
              </div>
              <div style={{ marginTop: 8 }}>
                <span className="label label-required">میزان تأخیر ایجادشده (دقیقه)</span>
                <input type="number" value={row.delayMinutes} onChange={(e) => updateRow(index, 'delayMinutes', e.target.value)} />
              </div>

              <OptionalPhotoUpload
                value={row.photoUrl}
                onChange={(url) => updateRow(index, 'photoUrl', url)}
              />

              <button type="button" className="btn-secondary" style={{ marginTop: 10, fontSize: 12 }} onClick={() => removeRow(index)}>
                حذف این مورد
              </button>
            </div>
          ))}
          <button type="button" className="btn-secondary" onClick={addRow}>
            + افزودن خرابی دیگر
          </button>
        </div>
      )}
    </div>
  )
}
