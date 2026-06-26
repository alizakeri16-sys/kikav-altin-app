import express from 'express'
import { pool } from '../db/pool.js'
import { requireAuth } from '../middleware/auth.js'

const router = express.Router()
router.use(requireAuth)

// وضعیت گزارش امروز (برای نمایش در صفحه اصلی)
router.get('/today-status', async (req, res) => {
  try {
    const todayIso = new Date().toISOString().slice(0, 10)
    const result = await pool.query('select id from daily_reports where report_date = $1', [todayIso])
    res.json({ isSubmitted: result.rows.length > 0 })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'خطا در بررسی وضعیت امروز' })
  }
})

// لیست روزهای بدون هیچ گزارش در یک بازه (برای هشدار در داشبورد)
router.get('/missing-days', async (req, res) => {
  const { start, end } = req.query
  try {
    const result = await pool.query(
      `select generate_series($1::date, $2::date, '1 day'::interval)::date as day`,
      [start, end]
    )
    const allDays = result.rows.map((r) => r.day.toISOString().slice(0, 10))

    const reports = await pool.query(
      'select report_date from daily_reports where report_date >= $1 and report_date <= $2',
      [start, end]
    )
    const reportedDays = new Set(reports.rows.map((r) => r.report_date.toISOString().slice(0, 10)))

    // فقط روزهایی که از امروز قبل‌تر بوده‌اند را به‌عنوان «از قلم‌افتاده» در نظر می‌گیریم
    // (روزهای آینده طبیعی است که هنوز گزارش نداشته باشند)
    const todayIso = new Date().toISOString().slice(0, 10)
    const missingDays = allDays.filter((day) => day < todayIso && !reportedDays.has(day))

    res.json({ missingDays })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'خطا در محاسبه روزهای بدون گزارش' })
  }
})

// ذخیره یک گزارش روزانه کامل
router.post('/', async (req, res) => {
  const report = req.body
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    // اگر کاربر اپراتور است، اجازه ثبت دوباره برای یک تاریخ که از قبل گزارش دارد را نمی‌دهیم
    if (req.userRole === 'operator') {
      const existing = await client.query('select id from daily_reports where report_date = $1', [report.reportDateIso])
      if (existing.rows.length > 0) {
        await client.query('ROLLBACK')
        return res.status(409).json({ error: 'برای این تاریخ قبلاً گزارش ثبت شده است. در صورت نیاز به ویرایش، با سرپرست یا مدیر هماهنگ کنید.' })
      }
    }

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

// به‌روزرسانی یک گزارش موجود (فقط سرپرست و مدیر اجازه دارند)
router.put('/:id', async (req, res) => {
  if (req.userRole === 'operator') {
    return res.status(403).json({ error: 'اپراتور اجازه ویرایش گزارش ثبت‌شده را ندارد. با سرپرست یا مدیر هماهنگ کنید.' })
  }

  const reportId = req.params.id
  const report = req.body
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const existing = await client.query('select id from daily_reports where id = $1', [reportId])
    if (existing.rows.length === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ error: 'گزارش مورد نظر یافت نشد' })
    }

    await client.query(
      `update daily_reports set
        is_mine_active = $1, inactivity_reason = $2, inactivity_note = $3,
        weather_condition = $4, temperature = $5,
        last_edited_by = $6, last_edited_at = now()
       where id = $7`,
      [
        report.isMineActive,
        report.isMineActive ? null : report.inactivityReason,
        report.isMineActive ? null : report.inactivityNote,
        report.isMineActive ? report.weatherCondition : null,
        report.isMineActive ? report.temperature || null : null,
        req.userId,
        reportId,
      ]
    )

    // حذف رکوردهای وابسته قبلی و درج دوباره با داده جدید (ساده‌ترین و امن‌ترین روش برای ویرایش کامل)
    await client.query('delete from production_shifts where daily_report_id = $1', [reportId])
    await client.query('delete from extraction_records where daily_report_id = $1', [reportId])
    await client.query('delete from sales_records where daily_report_id = $1', [reportId])
    await client.query('delete from daily_operations where daily_report_id = $1', [reportId])
    await client.query('delete from daily_personnel where daily_report_id = $1', [reportId])
    await client.query('delete from daily_machinery where daily_report_id = $1', [reportId])
    await client.query('delete from daily_issues where daily_report_id = $1', [reportId])
    await client.query('delete from run_delays where daily_report_id = $1', [reportId])
    await client.query('delete from daily_breakdown_reports where daily_report_id = $1', [reportId])

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
    res.status(500).json({ error: 'ویرایش گزارش با خطا مواجه شد' })
  } finally {
    client.release()
  }
})

// بررسی اینکه آیا برای این تاریخ از قبل گزارشی ثبت شده (برای پیشگیری از خطای تکراری و راهنمایی کاربر)
router.get('/exists/:isoDate', async (req, res) => {
  try {
    const result = await pool.query('select id from daily_reports where report_date = $1', [req.params.isoDate])
    res.json({ exists: result.rows.length > 0 })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'خطا در بررسی گزارش' })
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

// واکشی جزئیات یک گزارش بر اساس شناسه (برای صفحه ویرایش) - این مسیر باید بعد از همه مسیرهای خاص‌تر باشد
router.get('/:id', async (req, res) => {
  try {
    const reportResult = await pool.query('select * from daily_reports where id = $1', [req.params.id])
    const report = reportResult.rows[0]
    if (!report) return res.status(404).json({ error: 'گزارش یافت نشد' })

    if (!report.is_mine_active) {
      return res.json({ report, isMineActive: false })
    }

    const reportId = report.id
    const [shifts, extraction, sales, operations, personnel, machinery, issues, delays, breakdowns] = await Promise.all([
      pool.query('select * from production_shifts where daily_report_id=$1 order by shift_number', [reportId]),
      pool.query('select * from extraction_records where daily_report_id=$1', [reportId]),
      pool.query('select * from sales_records where daily_report_id=$1', [reportId]),
      pool.query('select * from daily_operations where daily_report_id=$1', [reportId]),
      pool.query('select * from daily_personnel where daily_report_id=$1', [reportId]),
      pool.query('select * from daily_machinery where daily_report_id=$1', [reportId]),
      pool.query('select * from daily_issues where daily_report_id=$1', [reportId]),
      pool.query('select * from run_delays where daily_report_id=$1', [reportId]),
      pool.query('select * from daily_breakdown_reports where daily_report_id=$1', [reportId]),
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

export default router
