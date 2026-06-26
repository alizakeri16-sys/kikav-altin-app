import { toFarsiDigits } from '../lib/jalaliDate'

const MONTH_NAMES = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند',
]

// تعداد روزهای هر ماه شمسی (ماه‌های ۱ تا ۶ سی‌ویک روزه‌اند، ۷ تا ۱۱ سی روزه، ۱۲ بسته به کبیسه)
function daysInMonth(monthIndex) {
  if (monthIndex < 6) return 31
  if (monthIndex < 11) return 30
  return 30 // اسفند را برای سادگی ۳۰ روز در نظر می‌گیریم (کبیسه به‌ندرت ۲۹ است، خطای کوچک قابل قبول)
}

// shamsiValue: رشته‌ای مثل «۱۴۰۵/۰۴/۰۵» (با ارقام فارسی یا انگلیسی)
// onChange: مقدار جدید را به همان فرمت برمی‌گرداند
export default function ShamsiDatePicker({ value, onChange, label }) {
  const normalized = (value || '').replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
  const parts = normalized.split('/')
  const year = parts[0] || ''
  const month = parts[1] ? parseInt(parts[1], 10) : ''
  const day = parts[2] ? parseInt(parts[2], 10) : ''

  function emit(newYear, newMonth, newDay) {
    if (!newYear || !newMonth || !newDay) return
    const pad = (n) => String(n).padStart(2, '0')
    onChange(toFarsiDigits(`${newYear}/${pad(newMonth)}/${pad(newDay)}`))
  }

  const monthDayCount = month ? daysInMonth(month - 1) : 31

  return (
    <div>
      {label && <span className="label label-required">{label}</span>}
      <div style={{ display: 'flex', gap: 8 }}>
        <select
          style={{ flex: 1 }}
          value={day}
          onChange={(e) => emit(year, month, Number(e.target.value))}
        >
          <option value="">روز</option>
          {Array.from({ length: monthDayCount }, (_, i) => i + 1).map((d) => (
            <option key={d} value={d}>{toFarsiDigits(d)}</option>
          ))}
        </select>

        <select
          style={{ flex: 1.4 }}
          value={month}
          onChange={(e) => emit(year, Number(e.target.value), day)}
        >
          <option value="">ماه</option>
          {MONTH_NAMES.map((name, i) => (
            <option key={i} value={i + 1}>{name}</option>
          ))}
        </select>

        <select
          style={{ flex: 1 }}
          value={year}
          onChange={(e) => emit(Number(e.target.value), month, day)}
        >
          <option value="">سال</option>
          {[1403, 1404, 1405, 1406, 1407].map((y) => (
            <option key={y} value={y}>{toFarsiDigits(y)}</option>
          ))}
        </select>
      </div>
    </div>
  )
}
