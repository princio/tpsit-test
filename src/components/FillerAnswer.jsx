export default function FillerAnswer({ count }) {
  const n = count || 1
  return (
    <div className="answer-box answer-box-filler">
      {Array.from({ length: n }, (_, i) => (
        <span key={i} className="answer-box-blank">
          <span className="answer-box-hint">({i + 1})</span>
          <span className="answer-blank-line" />
        </span>
      ))}
    </div>
  )
}
