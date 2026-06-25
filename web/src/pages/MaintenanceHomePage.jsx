import { useNavigate } from 'react-router-dom'

export default function MaintenanceHomePage() {
  const navigate = useNavigate()

  return (
    <div style={{ maxWidth: 420, margin: '0 auto', padding: 16 }}>
      <div style={{ marginBottom: 10 }}>
        <a href="/" style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>← بازگشت به خانه</a>
      </div>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', margin: 0 }}>شرکت کی‌کاو آلتین</p>
        <p style={{ fontSize: 18, fontWeight: 600, margin: '4px 0 0' }}>تعمیر و نگهداشت تجهیزات</p>
      </div>

      <button
        className="btn-primary"
        style={{ width: '100%', marginBottom: 16, background: 'var(--color-danger-text)', padding: 14 }}
        onClick={() => navigate('/maintenance/breakdown')}
      >
        ثبت خرابی فوری
      </button>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button
          className="card"
          style={{ width: '100%', padding: 20, textAlign: 'center' }}
          onClick={() => navigate('/maintenance/inspection/daily')}
        >
          <p style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>بازرسی روزانه</p>
          <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', margin: '6px 0 0' }}>
            هاپر، سرند لرزان، پمپ اسلاری، نلسون، دیزل ژنراتور
          </p>
        </button>

        <button
          className="card"
          style={{ width: '100%', padding: 20, textAlign: 'center' }}
          onClick={() => navigate('/maintenance/inspection/weekly')}
        >
          <p style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>بازرسی هفتگی</p>
          <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', margin: '6px 0 0' }}>
            نوار نقاله‌ها، گریزلی، ترومل، مقسم‌ها، اسلایدباکس، اسپیرال
          </p>
        </button>
      </div>
    </div>
  )
}
