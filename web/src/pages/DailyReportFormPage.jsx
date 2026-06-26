import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { todayShamsiString } from '../lib/jalaliDate'
import { INACTIVITY_REASONS, WEATHER_CONDITIONS, createEmptyDailyReport } from '../lib/dailyReportConstants'
import ProductionShiftsSection from '../components/sections/ProductionShiftsSection'
import ExtractionSection from '../components/sections/ExtractionSection'
import SalesSection from '../components/sections/SalesSection'
import OperationsSection from '../components/sections/OperationsSection'
import PersonnelSection from '../components/sections/PersonnelSection'
import MachinerySection from '../components/sections/MachinerySection'
import IssuesSection from '../components/sections/IssuesSection'
import DelaysSection from '../components/sections/DelaysSection'
import BreakdownSection from '../components/sections/BreakdownSection'
import SectionAccordionItem from '../components/SectionAccordionItem'
import ShamsiDatePicker from '../components/ShamsiDatePicker'
import ConfirmSubmitDialog from '../components/ConfirmSubmitDialog'
import { validateDailyReport, hasAnyValidationError } from '../lib/dailyReportValidation'
import { saveDailyReport, checkReportExists, fetchDailyReportById, updateDailyReport } from '../lib/dailyReportApi'

const SECTION_KEYS = [
  'production',
  'extraction',
  'sales',
  'operations',
  'personnel',
  'issues',
]

export default function DailyReportFormPage() {
  const { user } = useAuth()
  const { reportId } = useParams() // اگر این پارامتر وجود داشته باشد، یعنی در حالت ویرایش هستیم
  const navigate = useNavigate()
  const isEditMode = !!reportId

  const [report, setReport] = useState(createEmptyDailyReport())
  const [openSection, setOpenSection] = useState(null)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)
  const [loadingExisting, setLoadingExisting] = useState(isEditMode)

  useEffect(() => {
    if (isEditMode) {
      // اگر کاربر اپراتور باشد، اصلاً اجازه ورود به صفحه ویرایش را نمی‌دهیم
      if (user?.role === 'operator') {
        navigate('/')
        return
      }
      loadExistingReport()
    } else {
      setReport((r) => ({ ...r, reportDateShamsi: todayShamsiString() }))
    }
  }, [reportId])

  async function loadExistingReport() {
    setLoadingExisting(true)
    try {
      const data = await fetchDailyReportById(reportId)
      setReport(mapServerDataToFormState(data))
    } catch (err) {
      console.error(err)
      setSaveMessage('بارگذاری گزارش با خطا مواجه شد')
    } finally {
      setLoadingExisting(false)
    }
  }

  function updateField(field, value) {
    setReport((r) => ({ ...r, [field]: value }))
  }

  function isSectionComplete(key) {
    // هر بخش از طریق تابع اعتبارسنجی مرکزی چک می‌شود
    const sectionErrors = validateDailyReport(report)[key]
    return !sectionErrors || sectionErrors.length === 0
  }

  async function handleSubmit() {
    const allErrors = validateDailyReport(report)
    const hasErrors = hasAnyValidationError(allErrors)

    if (hasErrors) {
      setErrors(allErrors)
      setSaveMessage('لطفاً بخش‌های ناقص را تکمیل کنید.')
      return
    }

    // در حالت ثبت جدید (نه ویرایش)، اپراتورها فقط می‌توانند یک‌بار برای هر تاریخ ثبت کنند
    if (!isEditMode && user?.role === 'operator') {
      try {
        const exists = await checkReportExists(report.reportDateShamsi)
        if (exists) {
          setSaveMessage('برای این تاریخ قبلاً گزارش ثبت شده است. در صورت نیاز به ویرایش، با سرپرست یا مدیر هماهنگ کنید.')
          return
        }
      } catch (err) {
        console.error(err)
      }
    }

    // قبل از ثبت نهایی، یک تأیید صریح از کاربر می‌گیریم
    setShowConfirm(true)
  }

  async function confirmAndSubmit() {
    setShowConfirm(false)
    setSaving(true)
    setSaveMessage('')
    try {
      if (isEditMode) {
        await updateDailyReport(reportId, report)
        setSaveMessage('گزارش با موفقیت ویرایش شد.')
        setTimeout(() => navigate('/dashboard'), 1200)
      } else {
        await saveDailyReport(report, user)
        setSaveMessage('گزارش با موفقیت ثبت شد.')
        setReport({ ...createEmptyDailyReport(), reportDateShamsi: todayShamsiString() })
        setErrors({})
      }
    } catch (err) {
      console.error(err)
      setSaveMessage(err.message || 'ثبت گزارش با خطا مواجه شد. دوباره تلاش کنید.')
    } finally {
      setSaving(false)
    }
  }

  if (loadingExisting) {
    return <p style={{ textAlign: 'center', padding: 40 }}>در حال بارگذاری گزارش...</p>
  }

  // اگر معدن امروز فعال نبوده، فرم کوتاه می‌شود و فقط دلیل تعطیلی لازم است
  if (report.isMineActive === false) {
    return (
      <div style={{ maxWidth: 480, margin: '0 auto', padding: 16 }}>
        <HeaderBlock report={report} updateField={updateField} />
        <div className="card" style={{ marginTop: 16 }}>
          <p className="section-title">دلیل عدم فعالیت معدن</p>
          <select
            value={report.inactivityReason || ''}
            onChange={(e) => updateField('inactivityReason', e.target.value)}
          >
            <option value="">انتخاب کنید...</option>
            {INACTIVITY_REASONS.map((reason) => (
              <option key={reason} value={reason}>{reason}</option>
            ))}
          </select>
          <div style={{ marginTop: 10 }}>
            <span className="label">توضیح تکمیلی (اختیاری)</span>
            <textarea
              rows={3}
              value={report.inactivityNote}
              onChange={(e) => updateField('inactivityNote', e.target.value)}
            />
          </div>
        </div>
        <button
          className="btn-primary"
          style={{ width: '100%', marginTop: 16 }}
          disabled={!report.inactivityReason || saving}
          onClick={handleSubmit}
        >
          {saving ? 'در حال ثبت...' : isEditMode ? 'ثبت ویرایش' : 'ثبت گزارش روز تعطیل'}
        </button>
        {saveMessage && <p style={{ textAlign: 'center', marginTop: 10 }}>{saveMessage}</p>}

        <ConfirmSubmitDialog
          open={showConfirm}
          onConfirm={confirmAndSubmit}
          onCancel={() => setShowConfirm(false)}
          message="آیا از ثبت گزارش تعطیلی امروز مطمئن هستید؟ پس از ثبت، امکان ویرایش توسط شما وجود نخواهد داشت."
        />
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: 16 }}>
      <HeaderBlock report={report} updateField={updateField} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
        <SectionAccordionItem
          title="عملکرد خط تولید"
          isOpen={openSection === 'production'}
          isComplete={isSectionComplete('production')}
          onToggle={() => setOpenSection(openSection === 'production' ? null : 'production')}
        >
          <ProductionShiftsSection
            shifts={report.shifts}
            onChange={(shifts) => updateField('shifts', shifts)}
            errors={errors.production}
          />
        </SectionAccordionItem>

        <SectionAccordionItem
          title="استخراج و دپو"
          isOpen={openSection === 'extraction'}
          isComplete={isSectionComplete('extraction')}
          onToggle={() => setOpenSection(openSection === 'extraction' ? null : 'extraction')}
        >
          <ExtractionSection
            extraction={report.extraction}
            onChange={(extraction) => updateField('extraction', extraction)}
            errors={errors.extraction}
          />
        </SectionAccordionItem>

        <SectionAccordionItem
          title="فروش ماسه، سنگ و گراول"
          isOpen={openSection === 'sales'}
          isComplete={isSectionComplete('sales')}
          onToggle={() => setOpenSection(openSection === 'sales' ? null : 'sales')}
        >
          <SalesSection
            hasSales={report.hasSales}
            sales={report.sales}
            onChangeHasSales={(v) => updateField('hasSales', v)}
            onChangeSales={(sales) => updateField('sales', sales)}
            errors={errors.sales}
          />
        </SectionAccordionItem>

        <SectionAccordionItem
          title="عملیات انجام‌شده"
          isOpen={openSection === 'operations'}
          isComplete={isSectionComplete('operations')}
          onToggle={() => setOpenSection(openSection === 'operations' ? null : 'operations')}
        >
          <OperationsSection
            hasOperations={report.hasOperations}
            operations={report.operations}
            onChangeHasOperations={(v) => updateField('hasOperations', v)}
            onChangeOperations={(ops) => updateField('operations', ops)}
            errors={errors.operations}
          />
        </SectionAccordionItem>

        <SectionAccordionItem
          title="نیروی انسانی و ماشین‌آلات"
          isOpen={openSection === 'personnel'}
          isComplete={isSectionComplete('personnel')}
          onToggle={() => setOpenSection(openSection === 'personnel' ? null : 'personnel')}
        >
          <PersonnelSection
            personnel={report.personnel}
            onChange={(personnel) => updateField('personnel', personnel)}
            errors={errors.personnel}
          />
          <MachinerySection
            machinery={report.machinery}
            onChange={(machinery) => updateField('machinery', machinery)}
            errors={errors.personnel}
          />
        </SectionAccordionItem>

        <SectionAccordionItem
          title="مشکلات، تأخیر و خرابی"
          isOpen={openSection === 'issues'}
          isComplete={isSectionComplete('issues')}
          onToggle={() => setOpenSection(openSection === 'issues' ? null : 'issues')}
        >
          <IssuesSection
            hasIssues={report.hasIssues}
            issuesDescription={report.issuesDescription}
            onChangeHasIssues={(v) => updateField('hasIssues', v)}
            onChangeDescription={(d) => updateField('issuesDescription', d)}
          />
          <DelaysSection
            hasDelay={report.hasDelay}
            delays={report.delays}
            onChangeHasDelay={(v) => updateField('hasDelay', v)}
            onChangeDelays={(d) => updateField('delays', d)}
          />
          <BreakdownSection
            hasBreakdown={report.hasBreakdown}
            breakdowns={report.breakdowns}
            onChangeHasBreakdown={(v) => updateField('hasBreakdown', v)}
            onChangeBreakdowns={(b) => updateField('breakdowns', b)}
          />
        </SectionAccordionItem>
      </div>

      <button
        className="btn-primary"
        style={{ width: '100%', marginTop: 20 }}
        disabled={saving}
        onClick={handleSubmit}
      >
        {saving ? 'در حال ثبت...' : isEditMode ? 'ثبت ویرایش' : 'ثبت نهایی گزارش روز'}
      </button>
      {saveMessage && <p style={{ textAlign: 'center', marginTop: 10 }}>{saveMessage}</p>}

      <ConfirmSubmitDialog
        open={showConfirm}
        onConfirm={confirmAndSubmit}
        onCancel={() => setShowConfirm(false)}
        message="آیا از ثبت نهایی گزارش امروز مطمئن هستید؟ پس از ثبت، امکان ویرایش توسط شما وجود نخواهد داشت."
      />
    </div>
  )
}

function HeaderBlock({ report, updateField }) {
  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 10 }}>
        <a href="/" style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>← بازگشت به خانه</a>
      </div>
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', margin: 0 }}>شرکت کی‌کاو آلتین</p>
        <p style={{ fontSize: 18, fontWeight: 600, margin: '4px 0 0' }}>گزارش روزانه معدن انگوران چای</p>
      </div>

      <div style={{ marginBottom: 12 }}>
        <ShamsiDatePicker
          label="تاریخ گزارش"
          value={report.reportDateShamsi}
          onChange={(v) => updateField('reportDateShamsi', v)}
        />
      </div>

      <div style={{ marginBottom: 12 }}>
        <span className="label label-required">آیا معدن امروز فعال بود؟</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            className={`btn-toggle ${report.isMineActive === true ? 'active' : ''}`}
            onClick={() => updateField('isMineActive', true)}
            style={{ flex: 1 }}
          >
            بله، فعال بود
          </button>
          <button
            type="button"
            className={`btn-toggle ${report.isMineActive === false ? 'active' : ''}`}
            onClick={() => updateField('isMineActive', false)}
            style={{ flex: 1 }}
          >
            خیر، تعطیل بود
          </button>
        </div>
      </div>

      {report.isMineActive === true && (
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <span className="label">وضعیت جوی</span>
            <select
              value={report.weatherCondition}
              onChange={(e) => updateField('weatherCondition', e.target.value)}
            >
              {WEATHER_CONDITIONS.map((w) => (
                <option key={w} value={w}>{w}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <span className="label">دمای هوا (سانتی‌گراد)</span>
            <input
              type="number"
              value={report.temperature}
              onChange={(e) => updateField('temperature', e.target.value)}
              placeholder="۲۰"
            />
          </div>
        </div>
      )}
    </div>
  )
}

// تبدیل داده‌ای که از سرور می‌آید (نام ستون‌های snake_case) به ساختار مورد انتظار فرم (camelCase)
function mapServerDataToFormState(data) {
  const base = createEmptyDailyReport()
  const r = data.report

  if (!data.isMineActive) {
    return {
      ...base,
      reportDateShamsi: r.report_date_shamsi,
      isMineActive: false,
      inactivityReason: r.inactivity_reason,
      inactivityNote: r.inactivity_note || '',
    }
  }

  return {
    ...base,
    reportDateShamsi: r.report_date_shamsi,
    isMineActive: true,
    weatherCondition: r.weather_condition || base.weatherCondition,
    temperature: r.temperature || '',

    shifts: data.shifts.length > 0
      ? data.shifts.map((s) => ({
          shiftNumber: s.shift_number,
          startTime: s.start_time || '',
          endTime: s.end_time || '',
          runCount: s.run_count ?? '',
          nelson1RunCount: s.nelson1_run_count ?? '',
          nelson2RunCount: s.nelson2_run_count ?? '',
          nelsonWaterPressure: s.nelson_water_pressure ?? '',
          inputTonnage: s.input_tonnage ?? '',
          nelson1Concentrate: s.nelson1_concentrate ?? '',
          nelson2Concentrate: s.nelson2_concentrate ?? '',
        }))
      : base.shifts,

    extraction: data.extraction
      ? {
          extractionLocation: data.extraction.extraction_location || '',
          extractionTonnage: data.extraction.extraction_tonnage ?? '',
          dumpLocation: data.extraction.dump_location || '',
          dumpCumulativeTonnage: data.extraction.dump_cumulative_tonnage ?? '',
        }
      : base.extraction,

    hasSales: data.sales.some((s) => s.has_sales),
    sales: data.sales.filter((s) => s.has_sales).map((s) => ({
      materialType: s.material_type,
      buyerName: s.buyer_name,
      totalPurchasedTonnage: s.total_purchased_tonnage ?? '',
      dailyExitTonnage: s.daily_exit_tonnage ?? '',
      cumulativeExitTonnage: s.cumulative_exit_tonnage ?? '',
      note: s.note || '',
    })),

    hasOperations: data.operations.some((o) => o.has_operations),
    operations: data.operations.filter((o) => o.has_operations).map((o) => o.description),

    personnel: data.personnel.map((p) => ({
      personnelName: p.personnel_name,
      positionTitle: p.position_title || '',
      isPresent: p.is_present,
      isOnLeave: p.is_on_leave,
      note: p.note || '',
    })),

    machinery: data.machinery.map((m) => ({
      machineType: m.machine_type,
      activeCount: m.active_count ?? '',
      inactiveCount: m.inactive_count ?? '',
      underRepairCount: m.under_repair_count ?? '',
    })),

    hasIssues: data.issues?.has_issues || false,
    issuesDescription: data.issues?.description || '',

    hasDelay: data.delays.some((d) => d.has_delay),
    delays: data.delays.filter((d) => d.has_delay).map((d) => ({
      shiftNumber: d.shift_number,
      delayReason: d.delay_reason,
      delayDurationMinutes: d.delay_duration_minutes ?? '',
    })),

    hasBreakdown: data.breakdowns.some((b) => b.has_breakdown),
    breakdowns: data.breakdowns.filter((b) => b.has_breakdown).map((b) => ({
      partName: b.part_name,
      partSpecifications: b.part_specifications || '',
      relatedEquipment: b.related_equipment,
      cause: b.cause,
      correctiveAction: b.corrective_action,
      delayMinutes: b.delay_minutes ?? '',
      photoUrl: b.photo_url,
    })),
  }
}
