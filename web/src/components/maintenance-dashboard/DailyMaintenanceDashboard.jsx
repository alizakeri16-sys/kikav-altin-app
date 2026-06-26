import { useState, useEffect } from 'react'
import { fetchDailyMaintenanceStatus } from '../../lib/maintenanceDashboardApi'
import { toFarsiDigits } from '../../lib/jalaliDate'
import SummaryCard from '../dashboard/SummaryCard'
import ShamsiDatePicker from '../ShamsiDatePicker'

export default function DailyMaintenanceDashboard({ selectedDate, onChangeDate }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setLoading(true)
    fetchDailyMaintenanceStatus(selectedDate).then((result) => {
      if (!active) return
      setData(result)
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [selectedDate])

  if (loading || !data) {
    return <p style={{ textAlign: 'center' }}>در حال بارگذاری...</p>
  }

  const { inspectionStatus, brokenItems, outOfRangeItems } = data
  const doneCount = inspectionStatus.filter((e) => e.isInspected).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="card">
        <ShamsiDatePicker label="انتخاب تاریخ" value={selectedDate} onChange={onChangeDate} />
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <SummaryCard
          label="بازرسی روزانه انجام‌شده"
          value={`${toFarsiDigits(doneCount)} / ${toFarsiDigits(inspectionStatus.length)}`}
        />
        <SummaryCard
          label="موارد خراب امروز"
          value={toFarsiDigits(brokenItems.length)}
          accent={brokenItems.length > 0 ? 'var(--color-danger-text)' : undefined}
        />
        <SummaryCard
          label="مقادیر خارج از محدوده"
          value={toFarsiDigits(outOfRangeItems.length)}
          accent={outOfRangeItems.length > 0 ? 'var(--color-warning-text)' : undefined}
        />
      </div>

      <div className="card">
        <p className="section-title">وضعیت بازرسی تجهیزات روزانه</p>
        {inspectionStatus.map((eq) => (
          <div key={eq.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--color-border)' }}>
            <span className={`badge ${eq.isInspected ? 'badge-success' : 'badge-neutral'}`}>
              {eq.isInspected ? `انجام شد${eq.inspectedBy ? ' — ' + eq.inspectedBy : ''}` : 'بازرسی نشده'}
            </span>
            <span style={{ fontSize: 13, fontWeight: 500 }}>{eq.name}</span>
          </div>
        ))}
      </div>

      {brokenItems.length > 0 && (
        <div className="card" style={{ background: 'var(--color-danger-bg)' }}>
          <p className="section-title" style={{ fontSize: 14 }}>موارد خراب ثبت‌شده امروز</p>
          {brokenItems.map((b) => (
            <div key={b.id} style={{ marginBottom: 10, paddingBottom: 10, borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
              <span className="badge badge-danger" style={{ marginBottom: 4 }}>{b.equipment_name}</span>
              <p style={{ fontSize: 13, fontWeight: 600, margin: '4px 0' }}>{b.inspection_checklist_items?.item_text}</p>
              {b.inspection_checklist_items?.category && (
                <p style={{ fontSize: 11, margin: '0 0 4px', color: 'var(--color-text-tertiary)' }}>
                  {b.inspection_checklist_items.category}
                </p>
              )}
              {b.note && <p style={{ fontSize: 12, margin: '2px 0', color: 'var(--color-text-secondary)' }}>{b.note}</p>}
              {b.photo_url && (
                <img src={b.photo_url} alt="عکس خرابی" style={{ width: 70, height: 70, objectFit: 'cover', borderRadius: 8, marginTop: 4 }} />
              )}
            </div>
          ))}
        </div>
      )}

      {outOfRangeItems.length > 0 && (
        <div className="card" style={{ background: 'var(--color-warning-bg)' }}>
          <p className="section-title" style={{ fontSize: 14 }}>مقادیر خارج از محدوده مجاز</p>
          {outOfRangeItems.map((o) => (
            <div key={o.id} style={{ marginBottom: 8 }}>
              <span className="badge badge-warning" style={{ marginBottom: 4 }}>{o.equipment_name}</span>
              <p style={{ fontSize: 13, margin: '4px 0' }}>
                {o.inspection_checklist_items?.item_text}: {toFarsiDigits(o.numeric_value)} {o.inspection_checklist_items?.unit}
                {' '}— حد مجاز: {o.inspection_checklist_items?.threshold_text}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
