import ExcelJS from 'exceljs'

// تنظیمات پایه راست‌به‌چپ برای هر شیت
function setupRtlSheet(sheet) {
  sheet.views = [{ rightToLeft: true }]
}

function styleHeaderRow(row) {
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2A44' } }
    cell.alignment = { horizontal: 'right', vertical: 'middle' }
  })
}

async function downloadWorkbook(workbook, filename) {
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ---------------------------------------------------------------------
// خروجی اکسل گزارش روزانه (یک ردیف به ازای هر روز، همه بخش‌ها خلاصه‌شده)
// ---------------------------------------------------------------------
export async function exportDailyReportsToExcel(monthlyData, filename) {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('گزارش روزانه')
  setupRtlSheet(sheet)

  sheet.columns = [
    { header: 'تاریخ', key: 'date', width: 14 },
    { header: 'وضعیت', key: 'status', width: 14 },
    { header: 'دلیل تعطیلی', key: 'inactivityReason', width: 22 },
    { header: 'تناژ ورودی (تن)', key: 'inputTonnage', width: 16 },
    { header: 'تعداد ران', key: 'runCount', width: 12 },
    { header: 'تناژ استخراج (تن)', key: 'extractionTonnage', width: 16 },
    { header: 'تناژ فروش (تن)', key: 'salesTonnage', width: 16 },
    { header: 'نیروی حاضر', key: 'presentCount', width: 12 },
  ]
  styleHeaderRow(sheet.getRow(1))

  const { reports, shifts, sales, personnel } = monthlyData

  reports.forEach((report) => {
    if (!report.is_mine_active) {
      sheet.addRow({
        date: report.report_date_shamsi,
        status: 'تعطیل',
        inactivityReason: report.inactivity_reason || '',
        inputTonnage: '', runCount: '', extractionTonnage: '', salesTonnage: '', presentCount: '',
      })
      return
    }

    const dayShifts = shifts.filter((s) => s.daily_report_id === report.id)
    const totalTonnage = dayShifts.reduce((sum, s) => sum + (Number(s.input_tonnage) || 0), 0)
    const totalRuns = dayShifts.reduce((sum, s) => sum + (Number(s.run_count) || 0), 0)
    const daySales = sales.filter((s) => s.daily_report_id === report.id)
    const totalSales = daySales.reduce((sum, s) => sum + (Number(s.daily_exit_tonnage) || 0), 0)
    const dayPersonnel = personnel.filter((p) => p.daily_report_id === report.id)
    const presentCount = dayPersonnel.filter((p) => p.is_present).length

    sheet.addRow({
      date: report.report_date_shamsi,
      status: 'فعال',
      inactivityReason: '',
      inputTonnage: totalTonnage,
      runCount: totalRuns,
      extractionTonnage: '',
      salesTonnage: totalSales,
      presentCount,
    })
  })

  sheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.alignment = { horizontal: 'right' }
    })
  })

  await downloadWorkbook(workbook, filename)
}

// ---------------------------------------------------------------------
// خروجی اکسل تعمیر و نگهداشت (یک ردیف به ازای هر مورد بازرسی خراب + خرابی‌های فوری)
// ---------------------------------------------------------------------
export async function exportMaintenanceToExcel(monthlyData, filename) {
  const workbook = new ExcelJS.Workbook()

  const sheet1 = workbook.addWorksheet('موارد خراب در بازرسی')
  setupRtlSheet(sheet1)
  sheet1.columns = [
    { header: 'تاریخ', key: 'date', width: 14 },
    { header: 'تجهیز', key: 'equipment', width: 20 },
    { header: 'آیتم', key: 'item', width: 30 },
    { header: 'یادداشت', key: 'note', width: 30 },
  ]
  styleHeaderRow(sheet1.getRow(1))

  monthlyData.results
    .filter((r) => r.status === 'خراب')
    .forEach((r) => {
      const eq = monthlyData.allEquipment.find((e) => e.id === r.equipment_id)
      sheet1.addRow({
        date: r.inspection_date_shamsi || '',
        equipment: eq?.name || 'نامشخص',
        item: r.item_text,
        note: r.note || '',
      })
    })

  const sheet2 = workbook.addWorksheet('خرابی‌های فوری')
  setupRtlSheet(sheet2)
  sheet2.columns = [
    { header: 'تاریخ وقوع', key: 'date', width: 18 },
    { header: 'تجهیز', key: 'equipment', width: 20 },
    { header: 'علت', key: 'cause', width: 30 },
    { header: 'اقدام', key: 'action', width: 30 },
    { header: 'وضعیت', key: 'status', width: 14 },
  ]
  styleHeaderRow(sheet2.getRow(1))

  monthlyData.breakdowns.forEach((b) => {
    const eq = monthlyData.allEquipment.find((e) => e.id === b.equipment_id)
    sheet2.addRow({
      date: new Date(b.failure_datetime).toLocaleDateString('fa-IR'),
      equipment: eq?.name || b.equipment_name_free_text || 'نامشخص',
      cause: b.cause,
      action: b.corrective_action || '',
      status: b.status,
    })
  })

  ;[sheet1, sheet2].forEach((sheet) => {
    sheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.alignment = { horizontal: 'right' }
      })
    })
  })

  await downloadWorkbook(workbook, filename)
}
