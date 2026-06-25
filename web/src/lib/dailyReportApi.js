import { api } from './apiClient'
import { shamsiStringToIsoDate } from './jalaliDate'

// ذخیره گزارش روزانه از طریق سرور بک‌اند جدید (به‌جای Supabase مستقیم)
export async function saveDailyReport(report, user) {
  const isoDate = shamsiStringToIsoDate(report.reportDateShamsi)
  const payload = { ...report, reportDateIso: isoDate }
  return api.post('/daily-reports', payload)
}
