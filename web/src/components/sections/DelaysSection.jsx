import HasRecordToggle from '../HasRecordToggle'

function newDelayRow() {
  return { shiftNumber: 1, delayReason: '', delayDurationMinutes: '' }
}

export default function DelaysSection({ hasDelay, delays, onChangeHasDelay, onChangeDelays }) {
  function handleToggle(value) {
    onChangeHasDelay(value)
    if (value && delays.length === 0) {
      onChangeDelays([newDelayRow()])
    }
  }

  function updateRow(index, key, value) {
    onChangeDelays(delays.map((d, i) => (i === index ? { ...d, [key]: value } : d)))
  }

  function addRow() {
    onChangeDelays([...delays, newDelayRow()])
  }

  function removeRow(index) {
    onChangeDelays(delays.filter((_, i) => i !== index))
  }

  return (
    <div style={{ marginTop: 18 }}>
      <HasRecordToggle label="آیا تأخیری در ران‌ها وجود داشت؟" hasRecord={hasDelay} onChange={handleToggle} />
      {hasDelay && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {delays.map((row, index) => (
            <div key={index} className="card" style={{ background: 'var(--color-surface-alt)', padding: 10 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <select value={row.shiftNumber} onChange={(e) => updateRow(index, 'shiftNumber', Number(e.target.value))}>
                  <option value={1}>شیفت اول</option>
                  <option value={2}>شیفت دوم</option>
                </select>
                <input
                  type="number"
                  placeholder="مدت تأخیر (دقیقه)"
                  value={row.delayDurationMinutes}
                  onChange={(e) => updateRow(index, 'delayDurationMinutes', e.target.value)}
                />
              </div>
              <textarea
                rows={2}
                placeholder="دلیل تأخیر"
                value={row.delayReason}
                onChange={(e) => updateRow(index, 'delayReason', e.target.value)}
                style={{ marginTop: 8 }}
              />
              <button type="button" className="btn-secondary" style={{ marginTop: 8, fontSize: 12 }} onClick={() => removeRow(index)}>
                حذف
              </button>
            </div>
          ))}
          <button type="button" className="btn-secondary" onClick={addRow}>
            + افزودن تأخیر دیگر
          </button>
        </div>
      )}
    </div>
  )
}
