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

// تاریخچه کامل خرابی یک تجهیز خاص (برای نمایش با کلیک روی هر تجهیز)
export async function fetchEquipmentHistory(equipmentId, startIso, endIso) {
  return api.get(`/maintenance-dashboard/equipment-history/${equipmentId}?start=${startIso}&end=${endIso}`)
}

// تجمیع: نرخ تکمیل بازرسی روزانه در طول ماه - شامل تمام روزهای ماه (حتی روزهای بدون بازرسی = ۰٪)
export function buildInspectionCompletionTrend(monthlyData, totalDays, startIso) {
  const dailyEquipmentCount = monthlyData.allEquipment.filter((e) => e.inspection_frequency_days === 1).length
  const byDate = {}
  monthlyData.inspections.forEach((insp) => {
    byDate[insp.inspection_date_shamsi] = (byDate[insp.inspection_date_shamsi] || 0) + 1
  })
  return Object.entries(byDate)
    .map(([date, count]) => ({
      date,
      completionRate: dailyEquipmentCount > 0 ? Math.round((count / dailyEquipmentCount) * 100) : 0,
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

// تجمیع: رتبه‌بندی تجهیزات پرمشکل، با لیست دقیق آیتم‌های خراب هر تجهیز
export function buildEquipmentProblemRanking(monthlyData) {
  const grouped = {}
  monthlyData.results.forEach((r) => {
    if (r.status === 'خراب') {
      const eqId = r.equipment_id
      if (!eqId) return
      if (!grouped[eqId]) grouped[eqId] = []
      grouped[eqId].push({ itemText: r.item_text, date: r.inspection_date_shamsi, note: r.note })
    }
  })
  return Object.entries(grouped)
    .map(([eqId, items]) => {
      const eq = monthlyData.allEquipment.find((e) => e.id === eqId)
      return { equipmentId: eqId, name: eq?.name || 'نامشخص', count: items.length, items }
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
