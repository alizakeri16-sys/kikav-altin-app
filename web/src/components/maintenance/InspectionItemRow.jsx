import { useNavigate } from 'react-router-dom'
import OptionalPhotoUpload from '../OptionalPhotoUpload'

const NUMERIC_TYPES = ['temperature', 'amperage', 'voltage']

export default function InspectionItemRow({ item, value, onChange, equipmentId, frequency }) {
  const navigate = useNavigate()
  const isNumeric = NUMERIC_TYPES.includes(item.field_type)

  function setStatus(status) {
    onChange({ ...value, status })
  }

  function setNumericValue(numericValue) {
    onChange({ ...value, numericValue })
  }

  function setNote(note) {
    onChange({ ...value, note })
  }

  function setPhoto(photoUrl) {
    onChange({ ...value, photoUrl })
  }

  function openGuide() {
    navigate(`/maintenance/guide/${item.id}`, {
      state: { returnTo: `/maintenance/inspection/${frequency}/${equipmentId}` },
    })
  }

  return (
    <div className="card" style={{ background: 'var(--color-surface-alt)', padding: 12 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <button
          type="button"
          onClick={openGuide}
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '50%',
            width: 26,
            height: 26,
            flexShrink: 0,
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--color-text-secondary)',
          }}
          aria-label="راهنما"
        >
          ؟
        </button>
        <p style={{ fontSize: 13, fontWeight: 500, margin: 0, flex: 1, textAlign: 'right' }}>{item.item_text}</p>
      </div>

      {item.inspection_method && (
        <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', margin: '6px 0 0', textAlign: 'right' }}>
          روش: {item.inspection_method}
        </p>
      )}

      {isNumeric && (
        <div style={{ marginTop: 10 }}>
          <span className="label label-required">
            مقدار{item.unit ? ` (${item.unit})` : ''}
          </span>
          <input
            type="number"
            value={value.numericValue || ''}
            onChange={(e) => setNumericValue(e.target.value)}
            placeholder={item.threshold_text || ''}
          />
          {item.threshold_text && (
            <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', margin: '4px 0 0' }}>
              حد مجاز: {item.threshold_text}
            </p>
          )}
        </div>
      )}

      <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
        <button
          type="button"
          className={`btn-toggle ${value.status === 'سالم' ? 'active' : ''}`}
          style={{ flex: 1 }}
          onClick={() => setStatus('سالم')}
        >
          سالم
        </button>
        <button
          type="button"
          className={`btn-toggle ${value.status === 'خراب' ? 'active' : ''}`}
          style={{ flex: 1, ...(value.status === 'خراب' ? { background: 'var(--color-danger-text)', borderColor: 'var(--color-danger-text)' } : {}) }}
          onClick={() => setStatus('خراب')}
        >
          خراب
        </button>
      </div>

      {value.status === 'خراب' && (
        <div style={{ marginTop: 10 }}>
          <span className="label">توضیحات</span>
          <textarea rows={2} value={value.note || ''} onChange={(e) => setNote(e.target.value)} />
          <OptionalPhotoUpload value={value.photoUrl} onChange={setPhoto} />
        </div>
      )}
    </div>
  )
}
