import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { pool } from '../db/pool.js'

const router = express.Router()
const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret-in-production'

router.post('/login', async (req, res) => {
  const { username, password } = req.body

  if (!username || !password) {
    return res.status(400).json({ error: 'نام کاربری و رمز عبور لازم است' })
  }

  try {
    const result = await pool.query(
      'select id, username, password_hash, full_name, role, position_title from users where username = $1 and is_active = true',
      [username]
    )

    const user = result.rows[0]
    if (!user) {
      return res.status(401).json({ error: 'نام کاربری یا رمز عبور اشتباه است' })
    }

    const isValid = await bcrypt.compare(password, user.password_hash)
    if (!isValid) {
      return res.status(401).json({ error: 'نام کاربری یا رمز عبور اشتباه است' })
    }

    const { password_hash, ...safeUser } = user
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '30d' })

    res.json({ user: safeUser, token })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'خطای داخلی سرور' })
  }
})

export default router
