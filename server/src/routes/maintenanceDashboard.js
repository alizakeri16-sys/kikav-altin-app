import express from 'express'
import { pool } from '../db/pool.js'
import { requireAuth, requireAdmin } from '../middleware/auth.js'

const router = express.Router()
router.use(requireAuth)
router.use(requireAdmin)

// نمای روزانه: وضعیت بازرسی امروز + موارد خراب
router.get('/daily', async (req, res) => {
  const { dateShamsi } = req.query
  try {
    const allEquipment = await pool.query('select id, code, name, inspection_frequency_days from equipment')

    const inspections = await pool.query(
      `select ir.id, ir.equipment_id, ir.inspected_by, u.full_name from inspection_records ir
       left join users u on u.id = ir.inspected_by
       where inspection_date_shamsi = $1 and is_complete = true`,
      [dateShamsi]
    )

    const dailyEquipment = allEquipment.rows.filter((e) => e.inspection_frequency_days === 1)
    const inspectionStatus = dailyEquipment.map((eq) => {
      const found = inspections.rows.find((r) => r.equipment_id === eq.id)
      return { ...eq, isInspected: !!found, inspectedBy: found?.full_name }
    })

    const inspectionIds = inspections.rows.map((r) => r.id)
    let brokenItems = []
    let outOfRangeItems = []

    if (inspectionIds.length > 0) {
      const broken = await pool.query(
        `select ir.*, ici.item_text, ici.category, ici.inspection_method, eq.name as equipment_name
         from inspection_results ir
         join inspection_checklist_items ici on ici.id = ir.checklist_item_id
         join inspection_records rec on rec.id = ir.inspection_record_id
         join equipment eq on eq.id = rec.equipment_id
         where ir.inspection_record_id = any($1) and ir.status = 'خراب'`,
        [inspectionIds]
      )
      brokenItems = broken.rows.map((r) => ({
        id: r.id, note: r.note, photo_url: r.photo_url,
        equipment_name: r.equipment_name,
        inspection_checklist_items: { item_text: r.item_text, category: r.category, inspection_method: r.inspection_method },
      }))

      const numeric = await pool.query(
        `select ir.*, ici.item_text, ici.threshold_text, ici.unit, eq.name as equipment_name
         from inspection_results ir
         join inspection_checklist_items ici on ici.id = ir.checklist_item_id
         join inspection_records rec on rec.id = ir.inspection_record_id
         join equipment eq on eq.id = rec.equipment_id
         where ir.inspection_record_id = any($1) and ir.numeric_value is not null`,
        [inspectionIds]
      )
      outOfRangeItems = numeric.rows
        .filter((r) => isOutOfRange(r.numeric_value, r.threshold_text))
        .map((r) => ({
          id: r.id, numeric_value: r.numeric_value,
          equipment_name: r.equipment_name,
          inspection_checklist_items: { item_text: r.item_text, threshold_text: r.threshold_text, unit: r.unit },
        }))
    }

    res.json({ inspectionStatus, brokenItems, outOfRangeItems })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'خطا در واکشی داشبورد روزانه' })
  }
})

function isOutOfRange(value, thresholdText) {
  if (!thresholdText) return false
  const match = thresholdText.match(/(\d+(?:\.\d+)?)/)
  if (!match) return false
  const threshold = parseFloat(match[1])
  if (thresholdText.includes('کمتر از')) {
    return parseFloat(value) > threshold
  }
  return false
}

// نمای ماهانه
router.get('/monthly', async (req, res) => {
  const { start, end } = req.query
  try {
    const allEquipment = await pool.query('select id, code, name, inspection_frequency_days from equipment')

    const inspections = await pool.query(
      `select id, equipment_id, inspection_date, inspection_date_shamsi from inspection_records
       where inspection_date >= $1 and inspection_date <= $2 and is_complete = true`,
      [start, end]
    )

    const inspectionIds = inspections.rows.map((r) => r.id)
    let results = []
    if (inspectionIds.length > 0) {
      const r = await pool.query(
        `select ir.*, ici.item_text, ici.equipment_id, rec.inspection_date_shamsi
         from inspection_results ir
         join inspection_checklist_items ici on ici.id = ir.checklist_item_id
         join inspection_records rec on rec.id = ir.inspection_record_id
         where ir.inspection_record_id = any($1)`,
        [inspectionIds]
      )
      results = r.rows
    }

    const breakdowns = await pool.query(
      `select * from breakdown_records where failure_datetime >= $1 and failure_datetime <= $2`,
      [start, end]
    )

    res.json({
      allEquipment: allEquipment.rows,
      inspections: inspections.rows,
      results,
      breakdowns: breakdowns.rows,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'خطا در واکشی داشبورد ماهانه' })
  }
})

// تاریخچه کامل موارد خراب یک تجهیز خاص در یک بازه (برای کلیک روی هر تجهیز در رتبه‌بندی)
router.get('/equipment-history/:equipmentId', async (req, res) => {
  const { equipmentId } = req.params
  const { start, end } = req.query
  try {
    const results = await pool.query(
      `select ir.*, ici.item_text, ici.category, rec.inspection_date_shamsi
       from inspection_results ir
       join inspection_checklist_items ici on ici.id = ir.checklist_item_id
       join inspection_records rec on rec.id = ir.inspection_record_id
       where rec.equipment_id = $1 and rec.inspection_date >= $2 and rec.inspection_date <= $3
         and ir.status = 'خراب'
       order by rec.inspection_date desc`,
      [equipmentId, start, end]
    )

    const breakdowns = await pool.query(
      `select * from breakdown_records where equipment_id = $1 and failure_datetime >= $2 and failure_datetime <= $3
       order by failure_datetime desc`,
      [equipmentId, start, end]
    )

    res.json({ inspectionIssues: results.rows, breakdowns: breakdowns.rows })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'خطا در واکشی تاریخچه تجهیز' })
  }
})

export default router
