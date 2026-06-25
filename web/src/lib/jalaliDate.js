// تبدیل تاریخ میلادی به شمسی و برعکس - بدون نیاز به کتابخانه خارجی
// الگوریتم استاندارد تقویم جلالی (شمسی)

function gregorianToJalali(gy, gm, gd) {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334]
  let jy = gy <= 1600 ? 0 : 979
  gy -= gy <= 1600 ? 621 : 1600
  const gy2 = gm > 2 ? gy + 1 : gy
  let days =
    365 * gy +
    Math.floor((gy2 + 3) / 4) -
    Math.floor((gy2 + 99) / 100) +
    Math.floor((gy2 + 399) / 400) -
    80 +
    gd +
    g_d_m[gm - 1]
  jy += 33 * Math.floor(days / 12053)
  days %= 12053
  jy += 4 * Math.floor(days / 1461)
  days %= 1461
  if (days > 365) {
    jy += Math.floor((days - 1) / 365)
    days = (days - 1) % 365
  }
  const jm = days < 186 ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30)
  const jd = 1 + (days < 186 ? days % 31 : (days - 186) % 30)
  return [jy, jm, jd]
}

function jalaliToGregorian(jy, jm, jd) {
  let gy = jy <= 979 ? 621 : 1600
  jy -= jy <= 979 ? 0 : 979
  let days =
    365 * jy +
    Math.floor(jy / 33) * 8 +
    Math.floor(((jy % 33) + 3) / 4) +
    78 +
    jd +
    (jm < 7 ? (jm - 1) * 31 : (jm - 7) * 30 + 186)
  gy += 400 * Math.floor(days / 146097)
  days %= 146097
  let leap = true
  if (days >= 36525) {
    days--
    gy += 100 * Math.floor(days / 36524)
    days %= 36524
    if (days >= 365) days++
    else leap = false
  }
  gy += 4 * Math.floor(days / 1461)
  days %= 1461
  if (days >= 366) {
    leap = false
    gy += Math.floor((days - 1) / 365)
    days = (days - 1) % 365
  }
  const g_d_m = [0, 31, leap && isLeapGregorian(gy) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  let gm = 0
  let gd = days + 1
  for (gm = 1; gm <= 12; gm++) {
    if (gd <= g_d_m[gm]) break
    gd -= g_d_m[gm]
  }
  return [gy, gm, gd]
}

function isLeapGregorian(year) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

const faDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹']
export function toFarsiDigits(input) {
  return String(input).replace(/[0-9]/g, (d) => faDigits[parseInt(d, 10)])
}

// ورودی: یک شیء Date جاوااسکریپتی
// خروجی: رشته‌ای مثل «۱۴۰۵/۰۴/۰۲»
export function gregorianDateToShamsiString(date) {
  const [jy, jm, jd] = gregorianToJalali(date.getFullYear(), date.getMonth() + 1, date.getDate())
  const pad = (n) => String(n).padStart(2, '0')
  return toFarsiDigits(`${jy}/${pad(jm)}/${pad(jd)}`)
}

// ورودی: رشته شمسی به فرمت ۱۴۰۵/۰۴/۰۲ (با ارقام فارسی یا انگلیسی)
// خروجی: رشته تاریخ میلادی به فرمت YYYY-MM-DD (مناسب ذخیره در پایگاه داده)
export function shamsiStringToIsoDate(shamsiStr) {
  const normalized = shamsiStr.replace(/[۰-۹]/g, (d) => String(faDigits.indexOf(d)))
  const [jy, jm, jd] = normalized.split('/').map(Number)
  const [gy, gm, gd] = jalaliToGregorian(jy, jm, jd)
  const pad = (n) => String(n).padStart(2, '0')
  return `${gy}-${pad(gm)}-${pad(gd)}`
}

export function todayShamsiString() {
  return gregorianDateToShamsiString(new Date())
}
