import { supabase } from './supabaseClient'
import { shamsiStringToIsoDate } from './jalaliDate'

// این تابع یک گزارش روزانه کامل را در تمام جدول‌های مرتبط ذخیره می‌کند.
// ابتدا ردیف اصلی در daily_reports ساخته می‌شود، سپس ردیف‌های وابسته
// (شیفت‌ها، فروش، نیرو، و غیره) با ارجاع به همان گزارش ذخیره می‌شوند.

export async function saveDailyReport(report, user) {
  const isoDate = shamsiStringToIsoDate(report.reportDateShamsi)

  const { data: insertedReport, error: reportError } = await supabase
    .from('daily_reports')
    .insert({
      report_date: isoDate,
      report_date_shamsi: report.reportDateShamsi,
      submitted_by: user?.id,
      is_mine_active: report.isMineActive,
      inactivity_reason: report.isMineActive ? null : report.inactivityReason,
      inactivity_note: report.isMineActive ? null : report.inactivityNote,
      weather_condition: report.isMineActive ? report.weatherCondition : null,
      temperature: report.isMineActive ? report.temperature || null : null,
      is_complete: true,
    })
    .select()
    .single()

  if (reportError) throw reportError
  const reportId = insertedReport.id

  // اگر معدن تعطیل بوده، فقط همین یک ردیف کافی است
  if (!report.isMineActive) {
    return insertedReport
  }

  // شیفت‌های تولید
  const shiftsPayload = report.shifts.map((s) => ({
    daily_report_id: reportId,
    shift_number: s.shiftNumber,
    start_time: s.startTime || null,
    end_time: s.endTime || null,
    run_count: s.runCount || null,
    nelson1_run_count: s.nelson1RunCount || null,
    nelson2_run_count: s.nelson2RunCount || null,
    nelson_water_pressure: s.nelsonWaterPressure || null,
    input_tonnage: s.inputTonnage || null,
    nelson1_concentrate: s.nelson1Concentrate || null,
    nelson2_concentrate: s.nelson2Concentrate || null,
  }))
  await supabase.from('production_shifts').insert(shiftsPayload)

  // استخراج
  await supabase.from('extraction_records').insert({
    daily_report_id: reportId,
    has_extraction: true,
    extraction_location: report.extraction.extractionLocation,
    extraction_tonnage: report.extraction.extractionTonnage || null,
    dump_location: report.extraction.dumpLocation,
    dump_cumulative_tonnage: report.extraction.dumpCumulativeTonnage || null,
  })

  // فروش
  if (report.hasSales && report.sales.length > 0) {
    const salesPayload = report.sales.map((row) => ({
      daily_report_id: reportId,
      has_sales: true,
      material_type: row.materialType,
      buyer_name: row.buyerName,
      total_purchased_tonnage: row.totalPurchasedTonnage || null,
      daily_exit_tonnage: row.dailyExitTonnage || null,
      cumulative_exit_tonnage: row.cumulativeExitTonnage || null,
      note: row.note || null,
    }))
    await supabase.from('sales_records').insert(salesPayload)
  } else {
    await supabase.from('sales_records').insert({ daily_report_id: reportId, has_sales: false })
  }

  // عملیات
  if (report.hasOperations && report.operations.length > 0) {
    const opsPayload = report.operations.map((desc) => ({
      daily_report_id: reportId,
      has_operations: true,
      description: desc,
    }))
    await supabase.from('daily_operations').insert(opsPayload)
  } else {
    await supabase.from('daily_operations').insert({ daily_report_id: reportId, has_operations: false })
  }

  // نیروی انسانی
  if (report.personnel.length > 0) {
    const personnelPayload = report.personnel.map((p) => ({
      daily_report_id: reportId,
      personnel_name: p.personnelName,
      position_title: p.positionTitle || null,
      is_present: p.isPresent || false,
      is_on_leave: p.isOnLeave || false,
      note: p.note || null,
    }))
    await supabase.from('daily_personnel').insert(personnelPayload)
  }

  // ماشین‌آلات
  if (report.machinery.length > 0) {
    const machineryPayload = report.machinery.map((m) => ({
      daily_report_id: reportId,
      machine_type: m.machineType,
      total_count:
        (Number(m.activeCount) || 0) + (Number(m.inactiveCount) || 0) + (Number(m.underRepairCount) || 0),
      active_count: m.activeCount || 0,
      inactive_count: m.inactiveCount || 0,
      under_repair_count: m.underRepairCount || 0,
    }))
    await supabase.from('daily_machinery').insert(machineryPayload)
  }

  // مشکلات
  await supabase.from('daily_issues').insert({
    daily_report_id: reportId,
    has_issues: report.hasIssues,
    description: report.hasIssues ? report.issuesDescription : null,
  })

  // تأخیرها
  if (report.hasDelay && report.delays.length > 0) {
    const delaysPayload = report.delays.map((d) => ({
      daily_report_id: reportId,
      has_delay: true,
      shift_number: d.shiftNumber,
      delay_reason: d.delayReason,
      delay_duration_minutes: d.delayDurationMinutes || null,
    }))
    await supabase.from('run_delays').insert(delaysPayload)
  } else {
    await supabase.from('run_delays').insert({ daily_report_id: reportId, has_delay: false })
  }

  // خرابی‌ها (با عکس اختیاری)
  if (report.hasBreakdown && report.breakdowns.length > 0) {
    const breakdownPayload = report.breakdowns.map((b) => ({
      daily_report_id: reportId,
      has_breakdown: true,
      part_name: b.partName,
      part_specifications: b.partSpecifications || null,
      related_equipment: b.relatedEquipment,
      cause: b.cause,
      corrective_action: b.correctiveAction,
      delay_minutes: b.delayMinutes || null,
      photo_url: b.photoUrl || null,
    }))
    await supabase.from('daily_breakdown_reports').insert(breakdownPayload)
  } else {
    await supabase.from('daily_breakdown_reports').insert({ daily_report_id: reportId, has_breakdown: false })
  }

  return insertedReport
}
