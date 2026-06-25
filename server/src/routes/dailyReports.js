import express from 'express'
import { pool } from '../db/pool.js'
import { requireAuth } from '../middleware/auth.js'

const router = express.Router()
router.use(requireAuth)

// ذخیره یک گزارش روزانه کامل
router.post('/', async (req, res) => {
  const report = req.body
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const reportResult = await client.query(
      `insert into daily_reports
        (report_date, report_date_shamsi, submitted_by, is_mine_active, inactivity_reason, inactivity_note, weather_condition, temperature, is_complete)
       values ($1, $2, $3, $4, $5, $6, $7, $8, true)
       returning id`,
      [
        report.reportDateIso,
        report.reportDateShamsi,
        req.userId,
        report.isMineActive,
        report.isMineActive ? null : report.inactivityReason,
        report.isMineActive ? null : report.inactivityNote,
        report.isMineActive ? report.weatherCondition : null,
        report.isMineActive ? report.temperature || null : null,
      ]
    )
    const reportId = reportResult.rows[0].id

    if (report.isMineActive) {
      for (const shift of report.shifts) {
        await client.query(
          `insert into production_shifts
            (daily_report_id, shift_number, start_time, end_time, run_count, nelson1_run_count, nelson2_run_count, nelson_water_pressure, input_tonnage, nelson1_concentrate, nelson2_concentrate)
           values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
          [reportId, shift.shiftNumber, shift.startTime || null, shift.endTime || null, shift.runCount || null,
           shift.nelson1RunCount || null, shift.nelson2RunCount || null, shift.nelsonWaterPressure || null,
           shift.inputTonnage || null, shift.nelson1Concentrate || null, shift.nelson2Concentrate || null]
        )
      }

      await client.query(
        `insert into extraction_records (daily_report_id, has_extraction, extraction_location, extraction_tonnage, dump_location, dump_cumulative_tonnage)
         values ($1, true, $2, $3, $4, $5)`,
        [reportId, report.extraction.extractionLocation, report.extraction.extractionTonnage || null,
         report.extraction.dumpLocation, report.extraction.dumpCumulativeTonnage || null]
      )

      if (report.hasSales && report.sales.length > 0) {
        for (const s of report.sales) {
          await client.query(
            `insert into sales_records (daily_report_id, has_sales, material_type, buyer_name, total_purchased_tonnage, daily_exit_tonnage, cumulative_exit_tonnage, note)
             values ($1, true, $2, $3, $4, $5, $6, $7)`,
            [reportId, s.materialType, s.buyerName, s.totalPurchasedTonnage || null, s.dailyExitTonnage || null, s.cumulativeExitTonnage || null, s.note || null]
          )
        }
      } else {
        await client.query(`insert into sales_records (daily_report_id, has_sales) values ($1, false)`, [reportId])
      }

      if (report.hasOperations && report.operations.length > 0) {
        for (const desc of report.operations) {
          await client.query(`insert into daily_operations (daily_report_id, has_operations, description) values ($1, true, $2)`, [reportId, desc])
        }
      } else {
        await client.query(`insert into daily_operations (daily_report_id, has_operations) values ($1, false)`, [reportId])
      }

      for (const p of report.personnel) {
        await client.query(
          `insert into daily_personnel (daily_report_id, personnel_name, position_title, is_present, is_on_leave, note)
           values ($1, $2, $3, $4, $5, $6)`,
          [reportId, p.personnelName, p.positionTitle || null, p.isPresent || false, p.isOnLeave || false, p.note || null]
        )
      }

      for (const m of report.machinery) {
        const total = (Number(m.activeCount) || 0) + (Number(m.inactiveCount) || 0) + (Number(m.underRepairCount) || 0)
        await client.query(
          `insert into daily_machinery (daily_report_id, machine_type, total_count, active_count, inactive_count, under_repair_count)
           values ($1, $2, $3, $4, $5, $6)`,
          [reportId, m.machineType, total, m.activeCount || 0, m.inactiveCount || 0, m.underRepairCount || 0]
        )
      }

      await client.query(
        `insert into daily_issues (daily_report_id, has_issues, description) values ($1, $2, $3)`,
        [reportId, report.hasIssues, report.hasIssues ? report.issuesDescription : null]
      )

      if (report.hasDelay && report.delays.length > 0) {
        for (const d of report.delays) {
          await client.query(
            `insert into run_delays (daily_report_id, has_delay, shift_number, delay_reason, delay_duration_minutes)
             values ($1, true, $2, $3, $4)`,
            [reportId, d.shiftNumber, d.delayReason, d.delayDurationMinutes || null]
          )
        }
      } else {
        await client.query(`insert into run_delays (daily_report_id, has_delay) values ($1, false)`, [reportId])
      }

      if (report.hasBreakdown && report.breakdowns.length > 0) {
        for (const b of report.breakdowns) {
          await client.query(
            `insert into daily_breakdown_reports
              (daily_report_id, has_breakdown, part_name, part_specifications, related_equipment, cause, corrective_action, delay_minutes, photo_url)
             values ($1, true, $2, $3, $4, $5, $6, $7, $8)`,
            [reportId, b.partName, b.partSpecifications || null, b.relatedEquipment, b.cause, b.correctiveAction, b.delayMinutes || null, b.photoUrl || null]
          )
        }
      } else {
        await client.query(`insert into daily_breakdown_reports (daily_report_id, has_breakdown) values ($1, false)`, [reportId])
      }
    }

    await client.query('COMMIT')
    res.json({ success: true, reportId })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error(err)
    res.status(500).json({ error: 'ثبت گزارش با خطا مواجه شد' })
  } finally {
    client.release()
  }
})

// واکشی جزئیات یک روز خاص (برای داشبورد)
router.get('/by-date/:shamsiDate', async (req, res) => {
  try {
    const reportResult = await pool.query(
      'select * from daily_reports where report_date_shamsi = $1',
      [req.params.shamsiDate]
    )
    const report = reportResult.rows[0]
    if (!report) return res.json(null)

    if (!report.is_mine_active) {
      return res.json({ report, isMineActive: false })
    }

    const reportId = report.id
    const [shifts, extraction, sales, operations, personnel, machinery, issues, delays, breakdowns] = await Promise.all([
      pool.query('select * from production_shifts where daily_report_id=$1 order by shift_number', [reportId]),
      pool.query('select * from extraction_records where daily_report_id=$1', [reportId]),
      pool.query('select * from sales_records where daily_report_id=$1 and has_sales=true', [reportId]),
      pool.query('select * from daily_operations where daily_report_id=$1 and has_operations=true', [reportId]),
      pool.query('select * from daily_personnel where daily_report_id=$1', [reportId]),
      pool.query('select * from daily_machinery where daily_report_id=$1', [reportId]),
      pool.query('select * from daily_issues where daily_report_id=$1', [reportId]),
      pool.query('select * from run_delays where daily_report_id=$1 and has_delay=true', [reportId]),
      pool.query('select * from daily_breakdown_reports where daily_report_id=$1 and has_breakdown=true', [reportId]),
    ])

    res.json({
      report,
      isMineActive: true,
      shifts: shifts.rows,
      extraction: extraction.rows[0] || null,
      sales: sales.rows,
      operations: operations.rows,
      personnel: personnel.rows,
      machinery: machinery.rows,
      issues: issues.rows[0] || null,
      delays: delays.rows,
      breakdowns: breakdowns.rows,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'خطا در واکشی گزارش' })
  }
})

// واکشی گزارش‌های یک بازه (برای نمای ماهانه)
router.get('/range', async (req, res) => {
  const { start, end } = req.query
  try {
    const reportsResult = await pool.query(
      'select * from daily_reports where report_date >= $1 and report_date <= $2 order by report_date',
      [start, end]
    )
    const reports = reportsResult.rows
    if (reports.length === 0) {
      return res.json({ reports: [], shifts: [], sales: [], machinery: [], personnel: [] })
    }
    const ids = reports.map((r) => r.id)
    const [shifts, sales, machinery, personnel] = await Promise.all([
      pool.query('select * from production_shifts where daily_report_id = any($1)', [ids]),
      pool.query('select * from sales_records where daily_report_id = any($1) and has_sales=true', [ids]),
      pool.query('select * from daily_machinery where daily_report_id = any($1)', [ids]),
      pool.query('select * from daily_personnel where daily_report_id = any($1)', [ids]),
    ])
    res.json({ reports, shifts: shifts.rows, sales: sales.rows, machinery: machinery.rows, personnel: personnel.rows })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'خطا در واکشی گزارش‌های ماهانه' })
  }
})

export default router
