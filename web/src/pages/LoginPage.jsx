import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(username, password)
      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <form onSubmit={handleSubmit} className="card" style={{ width: 340 }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', margin: 0 }}>شرکت کی‌کاو آلتین</p>
          <p style={{ fontSize: 18, fontWeight: 600, margin: '4px 0 0' }}>ورود به سامانه</p>
        </div>

        <div style={{ marginBottom: 12 }}>
          <span className="label">نام کاربری</span>
          <input value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />
        </div>

        <div style={{ marginBottom: 16 }}>
          <span className="label">رمز عبور</span>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>

        {error && <p className="error-text" style={{ marginBottom: 12 }}>{error}</p>}

        <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={loading}>
          {loading ? 'در حال ورود...' : 'ورود'}
        </button>
      </form>
    </div>
  )
}
