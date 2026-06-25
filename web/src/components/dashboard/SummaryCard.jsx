export default function SummaryCard({ label, value, unit, accent }) {
  return (
    <div className="card" style={{ textAlign: 'center', flex: 1, minWidth: 130 }}>
      <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', margin: '0 0 6px' }}>{label}</p>
      <p style={{ fontSize: 24, fontWeight: 700, margin: 0, color: accent || 'var(--color-text)' }}>
        {value}
        {unit && <span style={{ fontSize: 13, fontWeight: 400, marginRight: 4 }}> {unit}</span>}
      </p>
    </div>
  )
}
