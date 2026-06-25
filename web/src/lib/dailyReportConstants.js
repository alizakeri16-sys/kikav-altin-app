// ثابت‌های مشترک فرم گزارش روزانه

export const INACTIVITY_REASONS = [
  'تعطیلی رسمی/برنامه‌ریزی‌شده',
  'خرابی دستگاه/تجهیزات',
  'معارض محلی',
  'شرایط جوی نامناسب',
  'کمبود سوخت',
  'کمبود آب',
  'کمبود برق',
]

export const WEATHER_CONDITIONS = ['آفتابی', 'ابری', 'بارانی', 'برفی', 'طوفانی']

export const MACHINE_TYPES = [
  'لودر',
  'بیل مکانیکی',
  'کامیون ۱۰ چرخ',
  'کامیون کمپرسی',
  'دیزل ژنراتور',
  'سایر',
]

export const MATERIAL_TYPES = ['ماسه', 'سنگ', 'گراول']

export const NO_RECORD_LABEL = 'موردی وجود نداشت'

// ساختار اولیه (خالی) یک گزارش روزانه جدید - برای مقداردهی اولیه فرم در React
export function createEmptyDailyReport() {
  return {
    reportDateShamsi: '',
    isMineActive: true,
    inactivityReason: null,
    inactivityNote: '',
    weatherCondition: WEATHER_CONDITIONS[0],
    temperature: '',

    shifts: [
      { shiftNumber: 1, startTime: '', endTime: '', runCount: '', nelson1RunCount: '', nelson2RunCount: '', nelsonWaterPressure: '', inputTonnage: '', nelson1Concentrate: '', nelson2Concentrate: '' },
      { shiftNumber: 2, startTime: '', endTime: '', runCount: '', nelson1RunCount: '', nelson2RunCount: '', nelsonWaterPressure: '', inputTonnage: '', nelson1Concentrate: '', nelson2Concentrate: '' },
    ],

    extraction: { extractionLocation: '', extractionTonnage: '', dumpLocation: '', dumpCumulativeTonnage: '' },

    hasSales: false,
    sales: [],

    hasOperations: false,
    operations: [],

    personnel: [],

    machinery: [],

    hasIssues: false,
    issuesDescription: '',

    hasDelay: false,
    delays: [],

    hasBreakdown: false,
    breakdowns: [],
  }
}
