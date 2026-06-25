// کامپوننت سؤال دوتایی «آیا امروز این مورد رخ داد؟»
// وقتی hasRecord=false باشد، یعنی «موردی وجود نداشت» انتخاب شده — این هم یک پاسخ معتبر و اجباری است، نه خالی‌گذاشتن.

export default function HasRecordToggle({ label, hasRecord, onChange }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <span className="label label-required">{label}</span>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="button"
          className={`btn-toggle ${hasRecord === true ? 'active' : ''}`}
          onClick={() => onChange(true)}
          style={{ flex: 1 }}
        >
          بله، رخ داد
        </button>
        <button
          type="button"
          className={`btn-toggle ${hasRecord === false ? 'active' : ''}`}
          onClick={() => onChange(false)}
          style={{ flex: 1 }}
        >
          موردی وجود نداشت
        </button>
      </div>
    </div>
  )
}
