export default function ConfirmSubmitDialog({ open, onConfirm, onCancel, message }) {
  if (!open) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 16,
      }}
    >
      <div className="card" style={{ maxWidth: 360, width: '100%', textAlign: 'center' }}>
        <p style={{ fontSize: 16, fontWeight: 600, margin: '0 0 10px' }}>تأیید ثبت نهایی</p>
        <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', margin: '0 0 20px' }}>
          {message || 'آیا مطمئن هستید؟ پس از ثبت، امکان ویرایش توسط شما وجود نخواهد داشت.'}
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-secondary" style={{ flex: 1 }} onClick={onCancel}>
            انصراف
          </button>
          <button className="btn-primary" style={{ flex: 1 }} onClick={onConfirm}>
            بله، ثبت کن
          </button>
        </div>
      </div>
    </div>
  )
}
