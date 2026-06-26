import { useState, useEffect } from 'react'
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
import { validateDailyReport, hasAnyValidationError } from '../lib/dailyReportValidation'
import { saveDailyReport } from '../lib/dailyReportApi'

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
  const [report, setReport] = useState(createEmptyDailyReport())
  const [openSection, setOpenSection] = useState(null)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')

  useEffect(() => {
    setReport((r) => ({ ...r, reportDateShamsi: todayShamsiString() }))
  }, [])

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

    setSaving(true)
    setSaveMessage('')
    try {
      await saveDailyReport(report, user)
      setSaveMessage('گزارش با موفقیت ثبت شد.')
      setReport({ ...createEmptyDailyReport(), reportDateShamsi: todayShamsiString() })
      setErrors({})
    } catch (err) {
      console.error(err)
      setSaveMessage('ثبت گزارش با خطا مواجه شد. دوباره تلاش کنید.')
    } finally {
      setSaving(false)
    }
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
          {saving ? 'در حال ثبت...' : 'ثبت گزارش روز تعطیل'}
        </button>
        {saveMessage && <p style={{ textAlign: 'center', marginTop: 10 }}>{saveMessage}</p>}
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
        {saving ? 'در حال ثبت...' : 'ثبت نهایی گزارش روز'}
      </button>
      {saveMessage && <p style={{ textAlign: 'center', marginTop: 10 }}>{saveMessage}</p>}
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
        <span className="label label-required">تاریخ گزارش</span>
        <input
          type="text"
          value={report.reportDateShamsi}
          onChange={(e) => updateField('reportDateShamsi', e.target.value)}
          placeholder="۱۴۰۵/۰۴/۰۲"
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
