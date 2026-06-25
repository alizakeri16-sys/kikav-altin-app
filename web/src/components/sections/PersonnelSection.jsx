function newPersonnelRow() {
  return { personnelName: '', positionTitle: '', isPresent: true, isOnLeave: false, note: '' }
}

export default function PersonnelSection({ personnel, onChange, errors }) {
  function updateRow(index, key, value) {
    onChange(personnel.map((p, i) => (i === index ? { ...p, [key]: value } : p)))
  }

  function addRow() {
    onChange([...personnel, newPersonnelRow()])
  }

  function removeRow(index) {
    onChange(personnel.filter((_, i) => i !== index))
  }

  return (
    <div>
      <p className="section-title" style={{ fontSize: 14 }}>نیروی انسانی</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {personnel.map((row, index) => (
          <div key={index} className="card" style={{ background: 'var(--color-surface-alt)', padding: 10 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <input
                placeholder="نام و نام‌خانوادگی"
                value={row.personnelName}
                onChange={(e) => updateRow(index, 'personnelName', e.target.value)}
              />
              <input
                placeholder="سمت"
                value={row.positionTitle}
                onChange={(e) => updateRow(index, 'positionTitle', e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button
                type="button"
                className={`btn-toggle ${row.isPresent ? 'active' : ''}`}
                style={{ flex: 1 }}
                onClick={() => updateRow(index, 'isPresent', !row.isPresent)}
              >
                حاضر
              </button>
              <button
                type="button"
                className={`btn-toggle ${row.isOnLeave ? 'active' : ''}`}
                style={{ flex: 1 }}
                onClick={() => updateRow(index, 'isOnLeave', !row.isOnLeave)}
              >
                مرخصی
              </button>
            </div>
            <button type="button" className="btn-secondary" style={{ marginTop: 8, fontSize: 12 }} onClick={() => removeRow(index)}>
              حذف
            </button>
          </div>
        ))}
        <button type="button" className="btn-secondary" onClick={addRow}>
          + افزودن نیرو
        </button>
      </div>
      {errors && errors.length > 0 && <p className="error-text">لطفاً نام و وضعیت همه افراد را وارد کنید</p>}
    </div>
  )
}
