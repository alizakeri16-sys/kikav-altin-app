import HasRecordToggle from '../HasRecordToggle'

export default function OperationsSection({ hasOperations, operations, onChangeHasOperations, onChangeOperations }) {
  function handleToggle(value) {
    onChangeHasOperations(value)
    if (value && operations.length === 0) {
      onChangeOperations([''])
    }
  }

  function updateRow(index, value) {
    onChangeOperations(operations.map((op, i) => (i === index ? value : op)))
  }

  function addRow() {
    onChangeOperations([...operations, ''])
  }

  function removeRow(index) {
    onChangeOperations(operations.filter((_, i) => i !== index))
  }

  return (
    <div>
      <HasRecordToggle
        label="آیا عملیات خاصی غیر از روتین انجام شد؟"
        hasRecord={hasOperations}
        onChange={handleToggle}
      />
      {hasOperations && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {operations.map((op, index) => (
            <div key={index} style={{ display: 'flex', gap: 8 }}>
              <input
                value={op}
                onChange={(e) => updateRow(index, e.target.value)}
                placeholder="شرح عملیات (مثلاً جوشکاری ترمز ترومل)"
                style={{ flex: 1 }}
              />
              {operations.length > 1 && (
                <button type="button" className="btn-secondary" onClick={() => removeRow(index)}>
                  حذف
                </button>
              )}
            </div>
          ))}
          <button type="button" className="btn-secondary" onClick={addRow}>
            + افزودن مورد دیگر
          </button>
        </div>
      )}
    </div>
  )
}
