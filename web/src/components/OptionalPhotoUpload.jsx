import { useState } from 'react'
import { uploadPhoto } from '../lib/apiClient'

// فیلد آپلود عکس اختیاری
// عکس مستقیماً روی همان سرور (پوشه uploads) ذخیره می‌شود.

export default function OptionalPhotoUpload({ value, onChange }) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  async function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError('')

    try {
      const url = await uploadPhoto(file)
      onChange(url)
    } catch (err) {
      setError('بارگذاری عکس ناموفق بود. می‌توانید بدون عکس ادامه دهید.')
      console.error(err)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div style={{ marginTop: 10 }}>
      <span className="label">عکس (اختیاری)</span>
      {value ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img
            src={value}
            alt="عکس بارگذاری‌شده"
            style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--color-border)' }}
          />
          <button type="button" className="btn-secondary" onClick={() => onChange(null)}>
            حذف عکس
          </button>
        </div>
      ) : (
        <>
          <input type="file" accept="image/*" onChange={handleFileChange} disabled={uploading} />
          {uploading && <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>در حال بارگذاری...</p>}
        </>
      )}
      {error && <p className="error-text">{error}</p>}
    </div>
  )
}
