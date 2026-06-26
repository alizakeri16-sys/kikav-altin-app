// این فایل مشخص می‌کند هر بخش از فرم «کامل» است یا نه — برای نمایش دایره سبز/خاکستری
// و برای جلوگیری از ثبت نهایی تا وقتی همه‌چیز تکمیل نشده.

function isEmpty(value) {
  return value === '' || value === null || value === undefined
}

export function validateDailyReport(report) {
  const errors = {}

  // اگر معدن امروز تعطیل بوده، فقط دلیل تعطیلی لازم است - بقیه بخش‌ها اصلاً اعتبارسنجی نمی‌شوند
  if (report.isMineActive === false) {
    errors.inactivity = isEmpty(report.inactivityReason) ? [true] : []
    return errors
  }

  // بخش تولید: همه فیلدهای هر دو شیفت باید پر باشند
  errors.production = report.shifts.map((shift) => {
    const fieldErrors = {}
    const requiredKeys = [
      'startTime', 'endTime', 'runCount', 'nelson1RunCount', 'nelson2RunCount',
      'nelsonWaterPressure', 'inputTonnage', 'nelson1Concentrate', 'nelson2Concentrate',
    ]
    requiredKeys.forEach((key) => {
      if (isEmpty(shift[key])) fieldErrors[key] = true
    })
    return fieldErrors
  })

  // بخش استخراج
  const extractionErrors = {}
  ;['extractionLocation', 'extractionTonnage', 'dumpLocation', 'dumpCumulativeTonnage'].forEach((key) => {
    if (isEmpty(report.extraction[key])) extractionErrors[key] = true
  })
  errors.extraction = extractionErrors

  // بخش فروش: اگر hasSales=true، هر ردیف باید کامل باشد
  errors.sales = []
  if (report.hasSales) {
    report.sales.forEach((row) => {
      const incomplete = ['materialType', 'buyerName', 'totalPurchasedTonnage', 'dailyExitTonnage', 'cumulativeExitTonnage'].some((k) => isEmpty(row[k]))
      if (incomplete) errors.sales.push(true)
    })
  }

  // بخش عملیات
  errors.operations = []
  if (report.hasOperations) {
    report.operations.forEach((op) => {
      if (isEmpty(op)) errors.operations.push(true)
    })
  }

  // بخش نیروی انسانی: حداقل یک نفر باید ثبت شده باشد و همه نام داشته باشند
  errors.personnel = []
  if (report.personnel.length === 0) {
    errors.personnel.push(true)
  } else {
    report.personnel.forEach((p) => {
      if (isEmpty(p.personnelName)) errors.personnel.push(true)
    })
  }

  // بخش مشکلات: اگر hasIssues=true باید توضیح داشته باشد
  errors.issues = []
  if (report.hasIssues && isEmpty(report.issuesDescription)) {
    errors.issues.push(true)
  }

  return errors
}

export function hasAnyValidationError(errors) {
  return Object.values(errors).some((sectionErrors) => {
    if (Array.isArray(sectionErrors)) {
      return sectionErrors.some((item) => (typeof item === 'object' ? Object.keys(item).length > 0 : item === true))
    }
    return Object.keys(sectionErrors).length > 0
  })
}
