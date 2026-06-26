import { useState, useEffect } from 'react'
import { fetchDailyReportDetail } from '../../lib/dashboardApi'
import SummaryCard from './SummaryCard'
import ShamsiDatePicker from '../ShamsiDatePicker'
import { toFarsiDigits } from '../../lib/jalaliDate'

export default function DailyDashboardView({ selectedDate, onChangeDate }) {
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    let active = true
    setLoading(true)
    setNotFound(false)
    fetchDailyReportDetail(selectedDate).then((data) => {
      if (!active) return
      if (!data) setNotFound(true)
      setDetail(data)
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [selectedDate])

  return (
    <div>
      <div className="card" style={{ marginBottom: 16 }}>
        <ShamsiDatePicker label="انتخاب تاریخ" value={selectedDate} onChange={onChangeDate} />
      </div>

      {loading && <p style={{ textAlign: 'center' }}>در حال بارگذاری...</p>}

      {!loading && notFound && (
        <p className="card" style={{ textAlign: 'center', color: 'var(--color-text-tertiary)' }}>
          گزارشی برای این تاریخ ثبت نشده است.
        </p>
      )}

      {!loading && detail && detail.isMineActive === false && (
        <div className="card" style={{ textAlign: 'center', background: 'var(--color-warning-bg)' }}>
          <p style={{ fontWeight: 600, margin: 0 }}>این روز معدن فعال نبوده</p>
          <p style={{ margin: '6px 0 0' }}>دلیل: {detail.report.inactivity_reason}</p>
          {detail.report.inactivity_note && (
            <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--color-text-secondary)' }}>
              {detail.report.inactivity_note}
            </p>
          )}
        </div>
      )}

      {!loading && detail && detail.isMineActive === true && (
        <DailyDetailContent detail={detail} />
      )}
    </div>
  )
}

function DailyDetailContent({ detail }) {
  const totalTonnage = detail.shifts.reduce((sum, s) => sum + (Number(s.input_tonnage) || 0), 0)
  const totalRuns = detail.shifts.reduce((sum, s) => sum + (Number(s.run_count) || 0), 0)
  const presentCount = detail.personnel.filter((p) => p.is_present).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <SummaryCard label="تناژ کل ورودی" value={toFarsiDigits(totalTonnage)} unit="تن" />
        <SummaryCard label="تعداد کل ران" value={toFarsiDigits(totalRuns)} />
        <SummaryCard label="تناژ استخراج" value={toFarsiDigits(detail.extraction?.extraction_tonnage || 0)} unit="تن" />
        <SummaryCard label="نیروی حاضر" value={toFarsiDigits(presentCount)} unit="نفر" />
      </div>

      <div className="card">
        <p className="section-title">مقایسه شیفت‌ها</p>
        <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
              <th style={{ textAlign: 'right', padding: 6 }}>شیفت</th>
              <th style={{ textAlign: 'right', padding: 6 }}>تعداد ران</th>
              <th style={{ textAlign: 'right', padding: 6 }}>فشار آب نلسون</th>
              <th style={{ textAlign: 'right', padding: 6 }}>بار ورودی (تن)</th>
            </tr>
          </thead>
          <tbody>
            {detail.shifts.map((s) => (
              <tr key={s.shift_number} style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td style={{ padding: 6 }}>{s.shift_number === 1 ? 'اول' : 'دوم'}</td>
                <td style={{ padding: 6 }}>{toFarsiDigits(s.run_count || 0)}</td>
                <td style={{ padding: 6 }}>{toFarsiDigits(s.nelson_water_pressure || 0)}</td>
                <td style={{ padding: 6 }}>{toFarsiDigits(s.input_tonnage || 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {detail.sales.length > 0 && (
        <div className="card">
          <p className="section-title">فروش امروز</p>
          <p style={{ fontSize: 14, fontWeight: 600, margin: '0 0 10px', color: 'var(--color-primary)' }}>
            جمع کل امروز: {toFarsiDigits(detail.sales.reduce((s, r) => s + (Number(r.daily_exit_tonnage) || 0), 0))} تن
          </p>
          {detail.sales.map((s) => (
            <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0', borderBottom: '1px solid var(--color-border)' }}>
              <span>{toFarsiDigits(s.daily_exit_tonnage)} تن</span>
              <span>{s.material_type} — {s.buyer_name}</span>
            </div>
          ))}
        </div>
      )}

      {detail.machinery.length > 0 && (
        <div className="card">
          <p className="section-title">ماشین‌آلات</p>
          {detail.machinery.map((m) => (
            <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0' }}>
              <span>{m.machine_type}</span>
              <span>
                <span className="badge badge-success">{toFarsiDigits(m.active_count)} فعال</span>{' '}
                <span className="badge badge-warning">{toFarsiDigits(m.under_repair_count)} تحت تعمیر</span>{' '}
                <span className="badge badge-danger">{toFarsiDigits(m.inactive_count)} غیرفعال</span>
              </span>
            </div>
          ))}
        </div>
      )}

      {detail.issues?.has_issues && (
        <div className="card" style={{ background: 'var(--color-warning-bg)' }}>
          <p className="section-title" style={{ fontSize: 14 }}>مشکلات و موانع</p>
          <p style={{ fontSize: 13, margin: 0 }}>{detail.issues.description}</p>
        </div>
      )}

      {detail.delays.length > 0 && (
        <div className="card" style={{ background: 'var(--color-warning-bg)' }}>
          <p className="section-title" style={{ fontSize: 14 }}>تأخیرها</p>
          {detail.delays.map((d) => (
            <p key={d.id} style={{ fontSize: 13, margin: '4px 0' }}>
              شیفت {d.shift_number === 1 ? 'اول' : 'دوم'} — {d.delay_reason} ({toFarsiDigits(d.delay_duration_minutes || 0)} دقیقه)
            </p>
          ))}
        </div>
      )}

      {detail.breakdowns.length > 0 && (
        <div className="card" style={{ background: 'var(--color-danger-bg)' }}>
          <p className="section-title" style={{ fontSize: 14 }}>خرابی‌های ثبت‌شده</p>
          {detail.breakdowns.map((b) => (
            <div key={b.id} style={{ marginBottom: 10 }}>
              <p style={{ fontSize: 13, margin: '4px 0', fontWeight: 600 }}>{b.part_name} — {b.related_equipment}</p>
              <p style={{ fontSize: 12, margin: '2px 0', color: 'var(--color-text-secondary)' }}>علت: {b.cause}</p>
              <p style={{ fontSize: 12, margin: '2px 0', color: 'var(--color-text-secondary)' }}>اقدام: {b.corrective_action}</p>
              {b.photo_url && (
                <img src={b.photo_url} alt="عکس خرابی" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, marginTop: 4 }} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
