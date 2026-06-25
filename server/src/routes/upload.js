import express from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { requireAuth } from '../middleware/auth.js'

const router = express.Router()
router.use(requireAuth)

const uploadDir = path.join(process.cwd(), 'uploads')
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`
    cb(null, uniqueName)
  },
})

const upload = multer({ storage, limits: { fileSize: 8 * 1024 * 1024 } }) // حداکثر ۸ مگابایت

router.post('/', upload.single('photo'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'فایلی ارسال نشد' })
  }
  const photoUrl = `/uploads/${req.file.filename}`
  res.json({ photoUrl })
})

export default router
