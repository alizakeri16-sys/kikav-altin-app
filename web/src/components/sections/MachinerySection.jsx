import { MACHINE_TYPES } from '../../lib/dailyReportConstants'

function newMachineRow() {
  return { machineType: MACHINE_TYPES[0], totalCount: '', activeCount: '', inactiveCount: '', underRepairCount: '' }
}

export default function MachinerySection({ machinery, onChange }) {
  function updateRow(index, key, value) {
    onChange(machinery.map((m, i) => (i === index ? { ...m, [key]: value } : m)))
  }

  function addRow() {
    onChange([...machinery, newMachineRow()])
  }

  function removeRow(index) {
    onChange(machinery.filter((_, i) => i !== index))
  }

  return (
    <div style={{ marginTop: 18 }}>
      <p className="section-title" style={{ fontSize: 14 }}>ماشین‌آلات</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {machinery.map((row, index) => (
          <div key={index} className="card" style={{ background: 'var(--color-surface-alt)', padding: 10 }}>
            <select value={row.machineType} onChange={(e) => updateRow(index, 'machineType', e.target.value)}>
              {MACHINE_TYPES.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 8 }}>
              <div>
                <span className="label">فعال</span>
                <input type="number" value={row.activeCount} onChange={(e) => updateRow(index, 'activeCount', e.target.value)} />
              </div>
              <div>
                <span className="label">غیرفعال</span>
                <input type="number" value={row.inactiveCount} onChange={(e) => updateRow(index, 'inactiveCount', e.target.value)} />
              </div>
              <div>
                <span className="label">تحت تعمیر</span>
                <input type="number" value={row.underRepairCount} onChange={(e) => updateRow(index, 'underRepairCount', e.target.value)} />
              </div>
            </div>
            <button type="button" className="btn-secondary" style={{ marginTop: 8, fontSize: 12 }} onClick={() => removeRow(index)}>
              حذف
            </button>
          </div>
        ))}
        <button type="button" className="btn-secondary" onClick={addRow}>
          + افزودن نوع ماشین
        </button>
      </div>
    </div>
  )
}
