import express from 'express'
import { pool } from '../db/pool.js'
import { requireAuth } from '../middleware/auth.js'

const router = express.Router()
router.use(requireAuth)

router.get('/equipment', async (req, res) => {
  const { frequency } = req.query // 'daily' | 'weekly'
  const freqDays = frequency === 'daily' ? 1 : 7
  try {
    const result = await pool.query(
      'select id, code, name from equipment where inspection_frequency_days = $1 and is_active = true order by code',
      [freqDays]
    )
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'خطا در واکشی تجهیزات' })
  }
})

router.get('/equipment/:id', async (req, res) => {
  try {
    const eq = await pool.query('select * from equipment where id = $1', [req.params.id])
    const items = await pool.query(
      'select * from inspection_checklist_items where equipment_id = $1 and is_active = true order by item_order',
      [req.params.id]
    )
    res.json({ equipment: eq.rows[0], items: items.rows })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'خطا در واکشی جزئیات تجهیز' })
  }
})

router.get('/checklist-item/:id', async (req, res) => {
  try {
    const result = await pool.query('select * from inspection_checklist_items where id = $1', [req.params.id])
    res.json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: 'خطا' })
  }
})

// آیا این تجهیز در تاریخ/بازه مشخص بازرسی شده
router.get('/inspections/status', async (req, res) => {
  const { dateShamsi, frequency } = req.query
  try {
    let query, params
    if (frequency === 'daily') {
      query = `select equipment_id, inspected_by, u.full_name from inspection_records ir
                left join users u on u.id = ir.inspected_by
                where inspection_date_shamsi = $1 and is_complete = true`
      params = [dateShamsi]
    } else {
      query = `select equipment_id, inspected_by, u.full_name from inspection_records ir
                left join users u on u.id = ir.inspected_by
                where inspection_date >= (current_date - interval '7 days') and is_complete = true`
      params = []
    }
    const result = await pool.query(query, params)
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'خطا' })
  }
})

// ثبت یک بازرسی کامل
router.post('/inspections', async (req, res) => {
  const { equipmentId, dateIso, dateShamsi, results } = req.body
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // اگر کاربر اپراتور است، اجازه ثبت دوباره بازرسی برای همان تجهیز و همان روز را نمی‌دهیم
    if (req.userRole === 'operator') {
      const existing = await client.query(
        'select id from inspection_records where equipment_id = $1 and inspection_date_shamsi = $2 and is_complete = true',
        [equipmentId, dateShamsi]
      )
      if (existing.rows.length > 0) {
        await client.query('ROLLBACK')
        return res.status(409).json({ error: 'برای این تجهیز در این تاریخ قبلاً بازرسی ثبت شده است. در صورت نیاز به ویرایش، با سرپرست یا مدیر هماهنگ کنید.' })
      }
    }

    const recordResult = await client.query(
      `insert into inspection_records (equipment_id, inspected_by, inspection_date, inspection_date_shamsi, is_complete)
       values ($1, $2, $3, $4, true) returning id`,
      [equipmentId, req.userId, dateIso, dateShamsi]
    )
    const recordId = recordResult.rows[0].id

    for (const r of results) {
      await client.query(
        `insert into inspection_results (inspection_record_id, checklist_item_id, status, numeric_value, note, photo_url)
         values ($1, $2, $3, $4, $5, $6)`,
        [recordId, r.checklistItemId, r.status, r.numericValue || null, r.note || null, r.photoUrl || null]
      )
    }

    await client.query('COMMIT')
    res.json({ success: true, recordId })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error(err)
    res.status(500).json({ error: 'ثبت بازرسی ناموفق بود' })
  } finally {
    client.release()
  }
})

// ثبت خرابی فوری
router.post('/breakdown', async (req, res) => {
  const { equipmentId, cause, correctiveAction, sparePartsUsed, photoUrl } = req.body
  try {
    await pool.query(
      `insert into breakdown_records (equipment_id, reported_by, breakdown_type, failure_datetime, cause, corrective_action, spare_parts_used, photo_url, status)
       values ($1, $2, 'اتفاقی', now(), $3, $4, $5, $6, 'باز')`,
      [equipmentId, req.userId, cause, correctiveAction || null, sparePartsUsed || null, photoUrl || null]
    )
    res.json({ success: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'ثبت خرابی ناموفق بود' })
  }
})

export default router
