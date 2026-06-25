import HasRecordToggle from '../HasRecordToggle'

export default function IssuesSection({ hasIssues, issuesDescription, onChangeHasIssues, onChangeDescription }) {
  return (
    <div>
      <HasRecordToggle label="آیا مشکل یا مانعی در طول روز وجود داشت؟" hasRecord={hasIssues} onChange={onChangeHasIssues} />
      {hasIssues && (
        <textarea
          rows={3}
          placeholder="شرح مشکل یا مانع..."
          value={issuesDescription}
          onChange={(e) => onChangeDescription(e.target.value)}
        />
      )}
    </div>
  )
}
