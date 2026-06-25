const FIELDS = [
  { key: 'extractionLocation', label: 'محل استخراج', type: 'text' },
  { key: 'extractionTonnage', label: 'تناژ استخراج از بستر (تن)', type: 'number' },
  { key: 'dumpLocation', label: 'محل دپو', type: 'text' },
  { key: 'dumpCumulativeTonnage', label: 'تناژ تجمعی دپو (تن)', type: 'number' },
]

export default function ExtractionSection({ extraction, onChange, errors }) {
  function update(key, value) {
    onChange({ ...extraction, [key]: value })
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
      {FIELDS.map((field) => (
        <div key={field.key} className={errors?.[field.key] ? 'field-error' : ''}>
          <span className="label label-required">{field.label}</span>
          <input
            type={field.type}
            value={extraction[field.key]}
            onChange={(e) => update(field.key, e.target.value)}
          />
          {errors?.[field.key] && <p className="error-text">این فیلد اجباری است</p>}
        </div>
      ))}
    </div>
  )
}
