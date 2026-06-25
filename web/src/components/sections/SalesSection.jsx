import HasRecordToggle from '../HasRecordToggle'
import { MATERIAL_TYPES } from '../../lib/dailyReportConstants'

function newSalesRow() {
  return {
    materialType: MATERIAL_TYPES[0],
    buyerName: '',
    totalPurchasedTonnage: '',
    dailyExitTonnage: '',
    cumulativeExitTonnage: '',
    note: '',
  }
}

export default function SalesSection({ hasSales, sales, onChangeHasSales, onChangeSales, errors }) {
  function handleToggle(value) {
    onChangeHasSales(value)
    if (value && sales.length === 0) {
      onChangeSales([newSalesRow()])
    }
  }

  function updateRow(index, key, value) {
    const updated = sales.map((row, i) => (i === index ? { ...row, [key]: value } : row))
    onChangeSales(updated)
  }

  function addRow() {
    onChangeSales([...sales, newSalesRow()])
  }

  function removeRow(index) {
    onChangeSales(sales.filter((_, i) => i !== index))
  }

  return (
    <div>
      <HasRecordToggle label="آیا امروز فروشی انجام شد؟" hasRecord={hasSales} onChange={handleToggle} />

      {hasSales && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {sales.map((row, index) => (
            <div key={index} className="card" style={{ background: 'var(--color-surface-alt)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <span className="label label-required">نوع مصالح</span>
                  <select value={row.materialType} onChange={(e) => updateRow(index, 'materialType', e.target.value)}>
                    {MATERIAL_TYPES.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <span className="label label-required">نام خریدار</span>
                  <input value={row.buyerName} onChange={(e) => updateRow(index, 'buyerName', e.target.value)} />
                </div>
                <div>
                  <span className="label label-required">مقدار تناژ کل خریداری‌شده</span>
                  <input type="number" value={row.totalPurchasedTonnage} onChange={(e) => updateRow(index, 'totalPurchasedTonnage', e.target.value)} />
                </div>
                <div>
                  <span className="label label-required">تناژ خارج‌شده در روز</span>
                  <input type="number" value={row.dailyExitTonnage} onChange={(e) => updateRow(index, 'dailyExitTonnage', e.target.value)} />
                </div>
                <div>
                  <span className="label label-required">تناژ کل خارج‌شده تا کنون</span>
                  <input type="number" value={row.cumulativeExitTonnage} onChange={(e) => updateRow(index, 'cumulativeExitTonnage', e.target.value)} />
                </div>
              </div>
              <div style={{ marginTop: 10 }}>
                <span className="label">توضیحات (اختیاری)</span>
                <input value={row.note} onChange={(e) => updateRow(index, 'note', e.target.value)} />
              </div>
              {sales.length > 1 && (
                <button type="button" className="btn-secondary" style={{ marginTop: 10, fontSize: 12 }} onClick={() => removeRow(index)}>
                  حذف این ردیف
                </button>
              )}
            </div>
          ))}
          <button type="button" className="btn-secondary" onClick={addRow}>
            + افزودن خریدار دیگر
          </button>
        </div>
      )}
      {errors && errors.length > 0 && <p className="error-text">لطفاً همه فیلدهای فروش را تکمیل کنید</p>}
    </div>
  )
}
