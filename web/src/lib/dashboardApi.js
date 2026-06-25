import { supabase } from './supabaseClient'

// ---------------------------------------------------------------------
// نمای روزانه: همه داده‌های مربوط به یک روز خاص را جمع می‌کند
// ---------------------------------------------------------------------
export async function fetchDailyReportDetail(reportDateShamsi) {
  const { data: report } = await supabase
    .from('daily_reports')
    .select('*')
    .eq('report_date_shamsi', reportDateShamsi)
    .maybeSingle()

  if (!report) return null

  if (!report.is_mine_active) {
    return { report, isMineActive: false }
  }

  const reportId = report.id

  const [shifts, extraction, sales, operations, personnel, machinery, issues, delays, breakdowns] =
    await Promise.all([
      supabase.from('production_shifts').select('*').eq('daily_report_id', reportId).order('shift_number'),
      supabase.from('extraction_records').select('*').eq('daily_report_id', reportId).maybeSingle(),
      supabase.from('sales_records').select('*').eq('daily_report_id', reportId),
      supabase.from('daily_operations').select('*').eq('daily_report_id', reportId),
      supabase.from('daily_personnel').select('*').eq('daily_report_id', reportId),
      supabase.from('daily_machinery').select('*').eq('daily_report_id', reportId),
      supabase.from('daily_issues').select('*').eq('daily_report_id', reportId).maybeSingle(),
      supabase.from('run_delays').select('*').eq('daily_report_id', reportId),
      supabase.from('daily_breakdown_reports').select('*').eq('daily_report_id', reportId),
    ])

  return {
    report,
    isMineActive: true,
    shifts: shifts.data || [],
    extraction: extraction.data,
    sales: (sales.data || []).filter((s) => s.has_sales),
    operations: (operations.data || []).filter((o) => o.has_operations),
    personnel: personnel.data || [],
    machinery: machinery.data || [],
    issues: issues.data,
    delays: (delays.data || []).filter((d) => d.has_delay),
    breakdowns: (breakdowns.data || []).filter((b) => b.has_breakdown),
  }
}

// ---------------------------------------------------------------------
// نمای ماهانه: همه گزارش‌های یک بازه تاریخی (مثلاً یک ماه شمسی) را می‌گیرد
// و برای نمودارها تجمیع می‌کند.
// ---------------------------------------------------------------------
export async function fetchMonthlyReports(startIsoDate, endIsoDate) {
  const { data: reports } = await supabase
    .from('daily_reports')
    .select('*')
    .gte('report_date', startIsoDate)
    .lte('report_date', endIsoDate)
    .order('report_date')

  if (!reports || reports.length === 0) {
    return { reports: [], shifts: [], sales: [], machinery: [], personnel: [] }
  }

  const reportIds = reports.map((r) => r.id)

  const [shifts, sales, machinery, personnel] = await Promise.all([
    supabase.from('production_shifts').select('*').in('daily_report_id', reportIds),
    supabase.from('sales_records').select('*').in('daily_report_id', reportIds).eq('has_sales', true),
    supabase.from('daily_machinery').select('*').in('daily_report_id', reportIds),
    supabase.from('daily_personnel').select('*').in('daily_report_id', reportIds),
  ])

  return {
    reports,
    shifts: shifts.data || [],
    sales: sales.data || [],
    machinery: machinery.data || [],
    personnel: personnel.data || [],
  }
}

// ---------------------------------------------------------------------
// تجمیع: تناژ روزانه تولید (جمع دو شیفت) برای نمودار روند
// روزهای تعطیل با مقدار null و دلیل تعطیلی برگردانده می‌شوند تا در نمودار
// به‌جای صفر گمراه‌کننده، به‌صورت متمایز نشان داده شوند.
// ---------------------------------------------------------------------
export function buildDailyProductionTrend(monthlyData) {
  const { reports, shifts } = monthlyData

  return reports.map((report) => {
    if (!report.is_mine_active) {
      return {
        date: report.report_date_shamsi,
        tonnage: null,
        isHoliday: true,
        reason: report.inactivity_reason,
      }
    }
    const reportShifts = shifts.filter((s) => s.daily_report_id === report.id)
    const totalTonnage = reportShifts.reduce((sum, s) => sum + (Number(s.input_tonnage) || 0), 0)
    return {
      date: report.report_date_shamsi,
      tonnage: totalTonnage,
      isHoliday: false,
      reason: null,
    }
  })
}

// تجمیع: تعداد روزهای تعطیل به تفکیک دلیل (برای نمودار دایره‌ای/میله‌ای)
export function buildInactivityBreakdown(monthlyData) {
  const counts = {}
  monthlyData.reports.forEach((r) => {
    if (!r.is_mine_active && r.inactivity_reason) {
      counts[r.inactivity_reason] = (counts[r.inactivity_reason] || 0) + 1
    }
  })
  return Object.entries(counts).map(([reason, count]) => ({ reason, count }))
}

// تجمیع: فروش ماهانه به تفکیک خریدار
export function buildSalesByBuyer(monthlyData) {
  const totals = {}
  monthlyData.sales.forEach((s) => {
    const key = s.buyer_name || 'نامشخص'
    totals[key] = (totals[key] || 0) + (Number(s.daily_exit_tonnage) || 0)
  })
  return Object.entries(totals)
    .map(([buyer, tonnage]) => ({ buyer, tonnage }))
    .sort((a, b) => b.tonnage - a.tonnage)
}

// تجمیع: روند درصد آمادگی ماشین‌آلات در طول ماه
export function buildMachineryAvailabilityTrend(monthlyData) {
  const { reports, machinery } = monthlyData
  return reports
    .filter((r) => r.is_mine_active)
    .map((report) => {
      const dayMachinery = machinery.filter((m) => m.daily_report_id === report.id)
      const totalActive = dayMachinery.reduce((sum, m) => sum + (Number(m.active_count) || 0), 0)
      const totalAll = dayMachinery.reduce((sum, m) => sum + (Number(m.total_count) || 0), 0)
      const availability = totalAll > 0 ? Math.round((totalActive / totalAll) * 100) : null
      return { date: report.report_date_shamsi, availability }
    })
}

// تجمیع: نرخ حضور هر نفر در طول ماه
export function buildPersonnelAttendance(monthlyData) {
  const counts = {}
  monthlyData.personnel.forEach((p) => {
    const key = p.personnel_name
    if (!counts[key]) counts[key] = { present: 0, leave: 0, absent: 0 }
    if (p.is_present) counts[key].present += 1
    else if (p.is_on_leave) counts[key].leave += 1
    else counts[key].absent += 1
  })
  return Object.entries(counts).map(([name, c]) => ({ name, ...c }))
}

// خلاصه و میانگین ماهانه تولید/استخراج
export function buildMonthlySummary(monthlyData) {
  const trend = buildDailyProductionTrend(monthlyData)
  const activeDays = trend.filter((d) => !d.isHoliday)
  const totalTonnage = activeDays.reduce((sum, d) => sum + (d.tonnage || 0), 0)
  const avgTonnage = activeDays.length > 0 ? Math.round(totalTonnage / activeDays.length) : 0
  const holidayCount = trend.filter((d) => d.isHoliday).length

  return {
    totalTonnage,
    avgTonnage,
    activeDaysCount: activeDays.length,
    holidayCount,
    totalDays: trend.length,
  }
}
