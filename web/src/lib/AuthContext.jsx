import { createContext, useContext, useState, useEffect } from 'react'
import { api } from './apiClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = sessionStorage.getItem('kikav_user')
    if (stored) {
      setUser(JSON.parse(stored).user)
    }
    setLoading(false)
  }, [])

  async function login(username, password) {
    const data = await api.post('/auth/login', { username, password })
    setUser(data.user)
    sessionStorage.setItem('kikav_user', JSON.stringify({ user: data.user, token: data.token }))
    return data.user
  }

  function logout() {
    setUser(null)
    sessionStorage.removeItem('kikav_user')
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}

