import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

// توضیح برای آینده: چون کاربران (اپراتور/سرپرست/مدیر) با یوزرنیم ساده (نه ایمیل) وارد می‌شوند،
// از سیستم احراز هویت پیش‌فرض Supabase استفاده نمی‌کنیم، بلکه خودمان جدول users را چک می‌کنیم
// و رمز عبور را با bcrypt (در یک تابع سمت سرور / Edge Function) مقایسه می‌کنیم.
// این فایل رابط ساده‌ای برای React فراهم می‌کند.

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = sessionStorage.getItem('kikav_user')
    if (stored) {
      setUser(JSON.parse(stored))
    }
    setLoading(false)
  }, [])

  async function login(username, password) {
    // فراخوانی یک تابع لبه (Edge Function) که رمز را به‌صورت امن مقایسه می‌کند
    // و در صورت درست بودن، اطلاعات کاربر (بدون هش رمز) را برمی‌گرداند.
    const { data, error } = await supabase.functions.invoke('login', {
      body: { username, password },
    })

    if (error || !data?.user) {
      throw new Error('نام کاربری یا رمز عبور اشتباه است')
    }

    setUser(data.user)
    sessionStorage.setItem('kikav_user', JSON.stringify(data.user))
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
