// هر بخش از فرم به‌صورت یک آیتم آکاردئون نمایش داده می‌شود.
// دایره کنار عنوان: خاکستری = ناقص، سبز = تکمیل‌شده.

export default function SectionAccordionItem({ title, isOpen, isComplete, onToggle, children }) {
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: '100%',
          background: 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 16px',
          fontWeight: 500,
          fontSize: 14,
          color: 'var(--color-text)',
        }}
      >
        <span
          style={{
            width: 14,
            height: 14,
            borderRadius: '50%',
            background: isComplete ? 'var(--color-success-text)' : 'transparent',
            border: isComplete ? 'none' : '2px dashed var(--color-text-tertiary)',
            flexShrink: 0,
          }}
        />
        <span style={{ flex: 1, textAlign: 'right', marginRight: 10 }}>{title}</span>
        <span style={{ color: 'var(--color-text-tertiary)' }}>{isOpen ? '−' : '+'}</span>
      </button>
      {isOpen && (
        <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--color-border)' }}>
          <div style={{ paddingTop: 14 }}>{children}</div>
        </div>
      )}
    </div>
  )
}
