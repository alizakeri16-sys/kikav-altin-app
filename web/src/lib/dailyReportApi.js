import { api } from './apiClient'
import { shamsiStringToIsoDate } from './jalaliDate'

// ذخیره گزارش روزانه از طریق سرور بک‌اند جدید (به‌جای Supabase مستقیم)
export async function saveDailyReport(report, user) {
  const isoDate = shamsiStringToIsoDate(report.reportDateShamsi)
  const payload = { ...report, reportDateIso: isoDate }
  return api.post('/daily-reports', payload)
}

// بررسی اینکه آیا برای این تاریخ شمسی از قبل گزارشی ثبت شده است
export async function checkReportExists(reportDateShamsi) {
  const isoDate = shamsiStringToIsoDate(reportDateShamsi)
  const result = await api.get(`/daily-reports/exists/${isoDate}`)
  return result.exists
}

// بررسی اینکه آیا گزارش امروز (میلادی) ثبت شده یا نه - برای صفحه اصلی
export async function fetchTodayReportStatus() {
  return api.get('/daily-reports/today-status')
}

// لیست روزهایی که در یک بازه هیچ گزارشی ثبت نشده (برای هشدار در داشبورد)
export async function fetchMissingDays(startIso, endIso) {
  const result = await api.get(`/daily-reports/missing-days?start=${startIso}&end=${endIso}`)
  return result.missingDays
}

// واکشی یک گزارش با شناسه (برای صفحه ویرایش)
export async function fetchDailyReportById(reportId) {
  return api.get(`/daily-reports/${reportId}`)
}

// ویرایش گزارش موجود (فقط سرپرست/مدیر)
export async function updateDailyReport(reportId, report) {
  const isoDate = shamsiStringToIsoDate(report.reportDateShamsi)
  const payload = { ...report, reportDateIso: isoDate }
  return api.put(`/daily-reports/${reportId}`, payload)
}
