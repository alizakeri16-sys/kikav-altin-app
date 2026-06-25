import { api } from './apiClient'

// ---------------------------------------------------------------------
// نمای روزانه
// ---------------------------------------------------------------------
export async function fetchDailyMaintenanceStatus(dateShamsi) {
  return api.get(`/maintenance-dashboard/daily?dateShamsi=${encodeURIComponent(dateShamsi)}`)
}

// ---------------------------------------------------------------------
// نمای ماهانه
// ---------------------------------------------------------------------
export async function fetchMonthlyMaintenanceData(startIso, endIso) {
  return api.get(`/maintenance-dashboard/monthly?start=${startIso}&end=${endIso}`)
}

// تجمیع: نرخ تکمیل بازرسی روزانه در طول ماه
export function buildInspectionCompletionTrend(monthlyData, totalDays) {
  const dailyEquipmentCount = monthlyData.allEquipment.filter((e) => e.inspection_frequency_days === 1).length
  const byDate = {}
  monthlyData.inspections.forEach((insp) => {
    byDate[insp.inspection_date_shamsi] = (byDate[insp.inspection_date_shamsi] || 0) + 1
  })
  return Object.entries(byDate).map(([date, count]) => ({
    date,
    completionRate: dailyEquipmentCount > 0 ? Math.round((count / dailyEquipmentCount) * 100) : 0,
  }))
}

// تجمیع: رتبه‌بندی تجهیزات پرمشکل (تعداد موارد خراب)
export function buildEquipmentProblemRanking(monthlyData) {
  const counts = {}
  monthlyData.results.forEach((r) => {
    if (r.status === 'خراب') {
      const eqId = r.equipment_id
      if (eqId) counts[eqId] = (counts[eqId] || 0) + 1
    }
  })
  return Object.entries(counts)
    .map(([eqId, count]) => {
      const eq = monthlyData.allEquipment.find((e) => e.id === eqId)
      return { name: eq?.name || 'نامشخص', count }
    })
    .sort((a, b) => b.count - a.count)
}

// تجمیع: شاخص‌های رسمی Availability / MTTR / MTBF از داده خرابی‌ها
export function buildMaintenanceKPIs(monthlyData, totalDays) {
  const breakdowns = monthlyData.breakdowns

  const resolvedBreakdowns = breakdowns.filter((b) => b.resolved_datetime)
  const totalRepairMinutes = resolvedBreakdowns.reduce((sum, b) => {
    const diff = (new Date(b.resolved_datetime) - new Date(b.failure_datetime)) / 60000
    return sum + diff
  }, 0)
  const mttr = resolvedBreakdowns.length > 0 ? Math.round(totalRepairMinutes / resolvedBreakdowns.length) : null

  const totalAvailableMinutes = totalDays * 24 * 60
  const totalDowntimeMinutes = totalRepairMinutes
  const availability =
    totalAvailableMinutes > 0
      ? Math.round(((totalAvailableMinutes - totalDowntimeMinutes) / totalAvailableMinutes) * 1000) / 10
      : null

  const mtbf =
    breakdowns.length > 0
      ? Math.round((totalAvailableMinutes - totalDowntimeMinutes) / breakdowns.length / 60)
      : null

  return { mttr, availability, mtbf, breakdownCount: breakdowns.length }
}
