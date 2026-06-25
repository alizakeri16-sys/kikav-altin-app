import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'

export default function HomePage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div style={{ maxWidth: 420, margin: '0 auto', padding: 16 }}>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', margin: 0 }}>شرکت کی‌کاو آلتین</p>
        <p style={{ fontSize: 18, fontWeight: 600, margin: '4px 0 0' }}>خوش آمدید، {user?.full_name}</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button className="card" style={{ width: '100%', padding: 18, textAlign: 'center' }} onClick={() => navigate('/daily-report')}>
          <p style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>ثبت گزارش روزانه</p>
        </button>

        <button className="card" style={{ width: '100%', padding: 18, textAlign: 'center' }} onClick={() => navigate('/maintenance')}>
          <p style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>تعمیر و نگهداشت تجهیزات</p>
        </button>

        {user?.role === 'admin' && (
          <>
            <div style={{ borderTop: '1px solid var(--color-border)', margin: '8px 0' }} />
            <button className="card" style={{ width: '100%', padding: 18, textAlign: 'center' }} onClick={() => navigate('/dashboard')}>
              <p style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>داشبورد گزارش روزانه</p>
            </button>
            <button className="card" style={{ width: '100%', padding: 18, textAlign: 'center' }} onClick={() => navigate('/maintenance/dashboard')}>
              <p style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>داشبورد تعمیر و نگهداشت</p>
            </button>
          </>
        )}
      </div>

      <button className="btn-secondary" style={{ width: '100%', marginTop: 24 }} onClick={handleLogout}>
        خروج از حساب
      </button>
    </div>
  )
}
