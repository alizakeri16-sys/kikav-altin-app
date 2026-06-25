// عملکرد خط تولید برای دو شیفت - همه فیلدها اجباری (حتی صفر باید عمداً وارد شود)

const FIELDS = [
  { key: 'startTime', label: 'ساعت شروع', type: 'time' },
  { key: 'endTime', label: 'ساعت پایان', type: 'time' },
  { key: 'runCount', label: 'تعداد ران', type: 'number' },
  { key: 'nelson1RunCount', label: 'ران نلسون ۱', type: 'number' },
  { key: 'nelson2RunCount', label: 'ران نلسون ۲', type: 'number' },
  { key: 'nelsonWaterPressure', label: 'فشار آب نلسون', type: 'number' },
  { key: 'inputTonnage', label: 'بار ورودی به خط (تن)', type: 'number' },
  { key: 'nelson1Concentrate', label: 'کنسانتره نلسون ۱', type: 'number' },
  { key: 'nelson2Concentrate', label: 'کنسانتره نلسون ۲', type: 'number' },
]

export default function ProductionShiftsSection({ shifts, onChange, errors }) {
  function updateShift(index, key, value) {
    const updated = shifts.map((s, i) => (i === index ? { ...s, [key]: value } : s))
    onChange(updated)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {shifts.map((shift, index) => (
        <div key={shift.shiftNumber}>
          <p className="section-title" style={{ fontSize: 14 }}>
            شیفت {shift.shiftNumber === 1 ? 'اول' : 'دوم'}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {FIELDS.map((field) => (
              <div key={field.key} className={errors?.[index]?.[field.key] ? 'field-error' : ''}>
                <span className="label label-required">{field.label}</span>
                <input
                  type={field.type}
                  value={shift[field.key]}
                  onChange={(e) => updateShift(index, field.key, e.target.value)}
                />
                {errors?.[index]?.[field.key] && <p className="error-text">این فیلد اجباری است</p>}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
