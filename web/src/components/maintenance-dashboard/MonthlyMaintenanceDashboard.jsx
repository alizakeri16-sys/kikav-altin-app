import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  fetchMonthlyMaintenanceData,
  buildInspectionCompletionTrend,
  buildEquipmentProblemRanking,
  buildMaintenanceKPIs,
} from '../../lib/maintenanceDashboardApi'
import { toFarsiDigits, todayShamsiString, shamsiStringToIsoDate } from '../../lib/jalaliDate'
import SummaryCard from '../dashboard/SummaryCard'

const MONTH_NAMES = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند',
]

function currentShamsiYearMonth() {
  const today = todayShamsiString()
  const normalized = today.replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
  const [y, m] = normalized.split('/')
  return { year: y, month: m }
}

export default function MonthlyMaintenanceDashboard() {
  const { year, month } = currentShamsiYearMonth()
  const [selectedYear, setSelectedYear] = useState(year)
  const [selectedMonth, setSelectedMonth] = useState(month)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [expandedEquipment, setExpandedEquipment] = useState(null)

  useEffect(() => {
    loadMonth()
  }, [selectedYear, selectedMonth])

  async function loadMonth() {
    setLoading(true)
    const startIso = shamsiStringToIsoDate(`${selectedYear}/${selectedMonth.padStart(2, '0')}/01`)
    const startDate = new Date(startIso)
    const endDate = new Date(startDate)
    endDate.setDate(endDate.getDate() + 31)
    const endIso = endDate.toISOString().slice(0, 10)

    const result = await fetchMonthlyMaintenanceData(startIso, endIso)
    setData(result)
    setLoading(false)
  }

  if (loading || !data) {
    return <p style={{ textAlign: 'center' }}>در حال بارگذاری...</p>
  }

  const completionTrend = buildInspectionCompletionTrend(data, 31)
  const problemRanking = buildEquipmentProblemRanking(data)
  const kpis = buildMaintenanceKPIs(data, 31)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="card">
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1.4 }}>
            <span className="label">ماه</span>
            <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
              {MONTH_NAMES.map((name, i) => (
                <option key={i} value={String(i + 1).padStart(2, '0')}>{name}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <span className="label">سال شمسی</span>
            <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
              {[1403, 1404, 1405, 1406, 1407].map((y) => (
                <option key={y} value={String(y)}>{toFarsiDigits(y)}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <SummaryCard label="تعداد خرابی ثبت‌شده" value={toFarsiDigits(kpis.breakdownCount)} />
        <SummaryCard label="میانگین MTTR" value={kpis.mttr != null ? toFarsiDigits(kpis.mttr) : '—'} unit="دقیقه" />
        <SummaryCard label="Availability" value={kpis.availability != null ? toFarsiDigits(kpis.availability) : '—'} unit="٪" />
        <SummaryCard label="میانگین MTBF" value={kpis.mtbf != null ? toFarsiDigits(kpis.mtbf) : '—'} unit="ساعت" />
      </div>

      {kpis.breakdownCount === 0 && (
        <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', margin: 0, textAlign: 'center' }}>
          شاخص‌های MTTR، Availability و MTBF از داده «خرابی فوری» محاسبه می‌شوند. چون این ماه خرابی‌ای ثبت نشده، این مقادیر «—» نشان داده می‌شوند.
        </p>
      )}

      <div className="card">
        <p className="section-title">نرخ تکمیل بازرسی روزانه در طول ماه</p>
        {completionTrend.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', textAlign: 'center' }}>
            در این ماه هنوز هیچ بازرسی‌ای ثبت نشده است.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={completionTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} unit="%" domain={[0, 100]} />
              <Tooltip />
              <Bar dataKey="completionRate" fill="#1f2a44" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {problemRanking.length > 0 && (
        <div className="card">
          <p className="section-title">رتبه‌بندی تجهیزات پرمشکل</p>
          <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', margin: '0 0 10px' }}>
            برای دیدن جزئیات هر مورد، روی نام تجهیز کلیک کنید.
          </p>
          <ResponsiveContainer width="100%" height={Math.max(160, problemRanking.length * 40)}>
            <BarChart data={problemRanking} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={120} />
              <Tooltip />
              <Bar dataKey="count" fill="#b3261e" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>

          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {problemRanking.map((eq) => (
              <div key={eq.equipmentId}>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ width: '100%', textAlign: 'right', fontSize: 13 }}
                  onClick={() => setExpandedEquipment(expandedEquipment === eq.equipmentId ? null : eq.equipmentId)}
                >
                  {eq.name} — {toFarsiDigits(eq.count)} مورد خراب {expandedEquipment === eq.equipmentId ? '▲' : '▼'}
                </button>
                {expandedEquipment === eq.equipmentId && (
                  <div style={{ padding: '8px 12px', background: 'var(--color-surface-alt)', borderRadius: 8, marginTop: 4 }}>
                    {eq.items.map((item, idx) => (
                      <div key={idx} style={{ fontSize: 12, padding: '4px 0', borderBottom: idx < eq.items.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                        <span style={{ color: 'var(--color-text-tertiary)' }}>{item.date}</span> — {item.itemText}
                        {item.note && <span style={{ color: 'var(--color-text-secondary)' }}> ({item.note})</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
