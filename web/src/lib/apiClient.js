// این فایل جایگزین supabaseClient.js شده است.
// به‌جای صحبت مستقیم با Supabase، حالا با سرور بک‌اند خودمان (روی همان سرور) صحبت می‌کنیم.
// از یک مسیر نسبی استفاده می‌کنیم (نه آی‌پی ثابت) تا چه از طریق آی‌پی، چه از طریق دامنه
// به سایت وصل شویم، درخواست‌ها همیشه به همان آدرسی بروند که کاربر در مرورگرش باز کرده است.
// (Nginx مسیر /api را به سرور بک‌اند روی پورت ۴۰۰۰ هدایت می‌کند)

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'

function getToken() {
  const stored = sessionStorage.getItem('kikav_user')
  if (!stored) return null
  return JSON.parse(stored).token
}

async function apiRequest(path, options = {}) {
  const token = getToken()
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })
  const data = await res.json()

  if (!res.ok) {
    throw new Error(data.error || 'خطای ناشناخته')
  }
  return data
}

export const api = {
  get: (path) => apiRequest(path, { method: 'GET' }),
  post: (path, body) => apiRequest(path, { method: 'POST', body: JSON.stringify(body) }),
  put: (path, body) => apiRequest(path, { method: 'PUT', body: JSON.stringify(body) }),
}

export async function uploadPhoto(file) {
  const token = getToken()
  const formData = new FormData()
  formData.append('photo', file)

  const res = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'بارگذاری عکس ناموفق بود')

  // آدرس عکس به‌صورت نسبی برمی‌گردد (مثلاً /uploads/xxx.jpg) و مرورگر
  // خودکار آن را به همان دامنه/آی‌پی فعلی صفحه می‌چسباند - نیازی به ساخت آدرس کامل نیست
  const serverOrigin = API_BASE.replace('/api', '')
  return `${serverOrigin}${data.photoUrl}`
}
