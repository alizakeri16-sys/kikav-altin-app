import { supabase } from './supabaseClient'

// ---------------------------------------------------------------------
// نمای روزانه: وضعیت بازرسی امروز + موارد خراب ثبت‌شده امروز
// ---------------------------------------------------------------------
export async function fetchDailyMaintenanceStatus(dateShamsi) {
  const { data: allEquipment } = await supabase.from('equipment').select('id, code, name, inspection_frequency_days')

  const { data: inspections } = await supabase
    .from('inspection_records')
    .select('id, equipment_id, inspected_by, users(full_name)')
    .eq('inspection_date_shamsi', dateShamsi)
    .eq('is_complete', true)

  const inspectedEquipmentIds = new Set((inspections || []).map((r) => r.equipment_id))

  const dailyEquipment = (allEquipment || []).filter((e) => e.inspection_frequency_days === 1)
  const inspectionStatus = dailyEquipment.map((eq) => ({
    ...eq,
    isInspected: inspectedEquipmentIds.has(eq.id),
    inspectedBy: (inspections || []).find((r) => r.equipment_id === eq.id)?.users?.full_name,
  }))

  // موارد خراب ثبت‌شده در بازرسی‌های امروز
  const inspectionIds = (inspections || []).map((r) => r.id)
  let brokenItems = []
  if (inspectionIds.length > 0) {
    const { data } = await supabase
      .from('inspection_results')
      .select('*, inspection_checklist_items(item_text, equipment_id), inspection_records(equipment_id)')
      .in('inspection_record_id', inspectionIds)
      .eq('status', 'خراب')
    brokenItems = data || []
  }

  // مقادیر عددی خارج از محدوده (بررسی ساده: اگر threshold شامل عدد است و مقدار از آن بیشتر است)
  let outOfRangeItems = []
  if (inspectionIds.length > 0) {
    const { data } = await supabase
      .from('inspection_results')
      .select('*, inspection_checklist_items(item_text, threshold_text, unit, field_type)')
      .in('inspection_record_id', inspectionIds)
      .not('numeric_value', 'is', null)
    outOfRangeItems = (data || []).filter((r) => isOutOfRange(r.numeric_value, r.inspection_checklist_items?.threshold_text))
  }

  return { inspectionStatus, brokenItems, outOfRangeItems }
}

function isOutOfRange(value, thresholdText) {
  if (!thresholdText) return false
  const match = thresholdText.match(/(\d+(?:\.\d+)?)/)
  if (!match) return false
  const threshold = parseFloat(match[1])
  // فرض ساده: اگر متن «کمتر از» دارد، مقدار باید کمتر باشد
  if (thresholdText.includes('کمتر از')) {
    return parseFloat(value) > threshold
  }
  return false
}

// ---------------------------------------------------------------------
// نمای ماهانه
// ---------------------------------------------------------------------
export async function fetchMonthlyMaintenanceData(startIso, endIso) {
  const { data: allEquipment } = await supabase.from('equipment').select('id, code, name, inspection_frequency_days')

  const { data: inspections } = await supabase
    .from('inspection_records')
    .select('id, equipment_id, inspection_date, inspection_date_shamsi')
    .gte('inspection_date', startIso)
    .lte('inspection_date', endIso)
    .eq('is_complete', true)

  const inspectionIds = (inspections || []).map((r) => r.id)

  let results = []
  if (inspectionIds.length > 0) {
    const { data } = await supabase
      .from('inspection_results')
      .select('*, inspection_checklist_items(item_text, equipment_id)')
      .in('inspection_record_id', inspectionIds)
    results = data || []
  }

  const { data: breakdowns } = await supabase
    .from('breakdown_records')
    .select('*')
    .gte('failure_datetime', startIso)
    .lte('failure_datetime', endIso)

  return {
    allEquipment: allEquipment || [],
    inspections: inspections || [],
    results,
    breakdowns: breakdowns || [],
  }
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
      const eqId = r.inspection_checklist_items?.equipment_id
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

// تجمیع: روند یک پارامتر عددی خاص برای یک تجهیز در طول ماه
export function buildNumericParameterTrend(monthlyData, checklistItemId) {
  return monthlyData.results
    .filter((r) => r.checklist_item_id === checklistItemId && r.numeric_value != null)
    .map((r) => {
      const inspection = monthlyData.inspections.find((i) => i.id === r.inspection_record_id)
      return { date: inspection?.inspection_date_shamsi, value: Number(r.numeric_value) }
    })
    .filter((d) => d.date)
    .sort((a, b) => a.date.localeCompare(b.date))
}
