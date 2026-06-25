import { useState, useEffect } from 'react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
} from 'recharts'
import {
  fetchMonthlyReports,
  buildDailyProductionTrend,
  buildInactivityBreakdown,
  buildSalesByBuyer,
  buildMachineryAvailabilityTrend,
  buildPersonnelAttendance,
  buildMonthlySummary,
} from '../../lib/dashboardApi'
import { toFarsiDigits, todayShamsiString, shamsiStringToIsoDate } from '../../lib/jalaliDate'
import SummaryCard from './SummaryCard'

// رنگ‌های مشخص برای هرکدام از ۷ دلیل تعطیلی، تا در نمودار همیشه یکدست باشند
const INACTIVITY_COLORS = {
  'تعطیلی رسمی/برنامه‌ریزی‌شده': '#8b929c',
  'خرابی دستگاه/تجهیزات': '#b3261e',
  'معارض محلی': '#94650b',
  'شرایط جوی نامناسب': '#2d6ea3',
  'کمبود سوخت': '#a35a2d',
  'کمبود آب': '#2d8aa3',
  'کمبود برق': '#7a4fa3',
}

function currentShamsiYearMonth() {
  const today = todayShamsiString() // مثل ۱۴۰۵/۰۴/۰۲
  const normalized = today.replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
  const [y, m] = normalized.split('/')
  return { year: y, month: m }
}

export default function MonthlyDashboardView() {
  const { year, month } = currentShamsiYearMonth()
  const [selectedYear, setSelectedYear] = useState(year)
  const [selectedMonth, setSelectedMonth] = useState(month)
  const [monthlyData, setMonthlyData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadMonth()
  }, [selectedYear, selectedMonth])

  async function loadMonth() {
    setLoading(true)
    // محدوده تقریبی روزهای ماه شمسی به میلادی - برای سادگی از ۳۱ روز استفاده می‌کنیم
    // و نتیجه نهایی بر اساس report_date_shamsi واقعی فیلتر دقیق می‌شود.
    const startIso = shamsiStringToIsoDate(`${selectedYear}/${selectedMonth.padStart(2, '0')}/01`)
    const startDate = new Date(startIso)
    const endDate = new Date(startDate)
    endDate.setDate(endDate.getDate() + 31)
    const endIso = endDate.toISOString().slice(0, 10)

    const data = await fetchMonthlyReports(startIso, endIso)
    setMonthlyData(data)
    setLoading(false)
  }

  if (loading || !monthlyData) {
    return <p style={{ textAlign: 'center' }}>در حال بارگذاری...</p>
  }

  const trend = buildDailyProductionTrend(monthlyData)
  const inactivityBreakdown = buildInactivityBreakdown(monthlyData)
  const salesByBuyer = buildSalesByBuyer(monthlyData)
  const availabilityTrend = buildMachineryAvailabilityTrend(monthlyData)
  const attendance = buildPersonnelAttendance(monthlyData)
  const summary = buildMonthlySummary(monthlyData)

  const chartData = trend.map((d) => ({ ...d, tonnageDisplay: d.isHoliday ? 0 : d.tonnage }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="card">
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <span className="label">سال شمسی</span>
            <input value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <span className="label">ماه (۰۱ تا ۱۲)</span>
            <input value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <SummaryCard label="جمع تناژ تولید" value={toFarsiDigits(summary.totalTonnage)} unit="تن" />
        <SummaryCard label="میانگین روزانه" value={toFarsiDigits(summary.avgTonnage)} unit="تن" />
        <SummaryCard label="روزهای فعال" value={toFarsiDigits(summary.activeDaysCount)} unit="روز" />
        <SummaryCard
          label="روزهای تعطیل"
          value={toFarsiDigits(summary.holidayCount)}
          unit="روز"
          accent={summary.holidayCount > 0 ? 'var(--color-danger-text)' : undefined}
        />
      </div>

      <div className="card">
        <p className="section-title">روند تناژ تولید در طول ماه</p>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip
              formatter={(value, name, props) =>
                props.payload.isHoliday ? `تعطیل (${props.payload.reason})` : `${value} تن`
              }
            />
            <Line type="monotone" dataKey="tonnageDisplay" stroke="#1f2a44" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {inactivityBreakdown.length > 0 && (
        <div className="card">
          <p className="section-title">تفکیک دلایل تعطیلی</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={inactivityBreakdown} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis dataKey="reason" type="category" tick={{ fontSize: 11 }} width={150} />
              <Tooltip />
              <Bar dataKey="count">
                {inactivityBreakdown.map((entry, index) => (
                  <Cell key={index} fill={INACTIVITY_COLORS[entry.reason] || '#8b929c'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {salesByBuyer.length > 0 && (
        <div className="card">
          <p className="section-title">فروش به تفکیک خریدار (تن)</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={salesByBuyer}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="buyer" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="tonnage" fill="#2d6ea3" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {availabilityTrend.length > 0 && (
        <div className="card">
          <p className="section-title">روند درصد آمادگی ماشین‌آلات</p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={availabilityTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} unit="%" />
              <Tooltip />
              <Line type="monotone" dataKey="availability" stroke="#1e7a3a" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {attendance.length > 0 && (
        <div className="card">
          <p className="section-title">نرخ حضور نیروی انسانی در طول ماه</p>
          <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ textAlign: 'right', padding: 6 }}>نام</th>
                <th style={{ textAlign: 'right', padding: 6 }}>حاضر</th>
                <th style={{ textAlign: 'right', padding: 6 }}>مرخصی</th>
                <th style={{ textAlign: 'right', padding: 6 }}>غایب</th>
              </tr>
            </thead>
            <tbody>
              {attendance.map((p) => (
                <tr key={p.name} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: 6 }}>{p.name}</td>
                  <td style={{ padding: 6 }}>{toFarsiDigits(p.present)}</td>
                  <td style={{ padding: 6 }}>{toFarsiDigits(p.leave)}</td>
                  <td style={{ padding: 6 }}>{toFarsiDigits(p.absent)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
