// این تابع روی سرور Supabase اجرا می‌شود (نه در مرورگر کاربر)، چون باید
// رمز عبور را با نسخه هش‌شده در پایگاه داده مقایسه کند بدون اینکه هش رمزها
// هرگز به مرورگر فرستاده شود.
//
// نحوه استقرار (بعداً، وقتی Supabase راه‌اندازی شد):
//   supabase functions deploy login

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { compare } from 'https://deno.land/x/bcrypt@v0.4.1/mod.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

Deno.serve(async (req) => {
  try {
    const { username, password } = await req.json()

    if (!username || !password) {
      return new Response(JSON.stringify({ error: 'نام کاربری و رمز عبور لازم است' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, password_hash, full_name, role, position_title, is_active')
      .eq('username', username)
      .eq('is_active', true)
      .maybeSingle()

    if (error || !user) {
      return new Response(JSON.stringify({ error: 'نام کاربری یا رمز عبور اشتباه است' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const isValid = await compare(password, user.password_hash)
    if (!isValid) {
      return new Response(JSON.stringify({ error: 'نام کاربری یا رمز عبور اشتباه است' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // رمز هش‌شده هرگز برای کلاینت فرستاده نمی‌شود
    const { password_hash, ...safeUser } = user

    return new Response(JSON.stringify({ user: safeUser }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: 'خطای داخلی سرور' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
