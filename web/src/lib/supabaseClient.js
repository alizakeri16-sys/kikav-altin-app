import { createClient } from '@supabase/supabase-js'

// این دو مقدار بعداً، وقتی حساب Supabase ساخته شد، از طریق فایل .env پر می‌شوند.
// تا آن زمان، این فایل فقط ساختار را آماده نگه می‌دارد.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
