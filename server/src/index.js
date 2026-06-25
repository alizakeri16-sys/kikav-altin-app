import express from 'express'
import cors from 'cors'
import path from 'path'
import dotenv from 'dotenv'

import authRoutes from './routes/auth.js'
import dailyReportRoutes from './routes/dailyReports.js'
import maintenanceRoutes from './routes/maintenance.js'
import maintenanceDashboardRoutes from './routes/maintenanceDashboard.js'
import uploadRoutes from './routes/upload.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 4000

app.use(cors())
app.use(express.json())

// نمایش عکس‌های آپلودشده
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')))

app.use('/api/auth', authRoutes)
app.use('/api/daily-reports', dailyReportRoutes)
app.use('/api/maintenance', maintenanceRoutes)
app.use('/api/maintenance-dashboard', maintenanceDashboardRoutes)
app.use('/api/upload', uploadRoutes)

app.get('/api/health', (req, res) => res.json({ status: 'ok' }))

app.listen(PORT, () => {
  console.log(`سرور کی‌کاو آلتین روی پورت ${PORT} اجرا شد`)
})
