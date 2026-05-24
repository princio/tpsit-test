function getQuestionDisplayText(q) {
  if (q.text) return q.text
  if (Array.isArray(q.content)) {
    return q.content.filter(c => c.kind === 'text').map(c => c.value).join(' ')
  }
  return ''
}

export default function QuestionPanel({ question, qLabel, optionOrder, onClose }) {
  const { type, options, answer, multi } = question
  const text = getQuestionDisplayText(question)
  const displayOrder = optionOrder ?? (Array.isArray(options) ? options.map((_, i) => i) : [])

  return (
    <div className="excel-q-panel">
      <div className="excel-q-panel-header">
        <span className="excel-q-panel-label">{qLabel}</span>
        <span className={`excel-q-panel-type excel-type-${type === 'multipleChoice' ? (multi ? 'mqma' : 'mc') : type === 'trueFalse' ? 'tf' : type === 'filler' ? 'filler' : 'open'}`}>
          {type === 'multipleChoice' ? (multi ? 'MQMA' : 'MC') : type === 'trueFalse' ? 'V/F' : type}
        </span>
        <button className="excel-q-panel-close" onClick={onClose}>✕</button>
      </div>

      {text && <p className="excel-q-panel-text">{text}</p>}

      {type === 'multipleChoice' && Array.isArray(options) && (
        <div className="excel-q-panel-options">
          {displayOrder.map((origIdx, displayPos) => {
            const isCorrect = multi
              ? Array.isArray(answer) && answer.includes(origIdx)
              : answer === origIdx
            return (
              <div key={origIdx} className={`excel-q-panel-option${isCorrect ? ' correct' : ''}`}>
                <span className="excel-q-panel-opt-idx">[{displayPos + 1}]</span>
                <span className="excel-q-panel-opt-text">{options[origIdx]}</span>
                {isCorrect && <span className="excel-q-panel-tick">✓</span>}
              </div>
            )
          })}
        </div>
      )}

      {type === 'trueFalse' && (
        <div className="excel-q-panel-answer">
          Risposta: <strong>{answer ? 'VERO' : 'FALSO'}</strong>
        </div>
      )}

      {type === 'filler' && (
        <div className="excel-q-panel-blanks">
          {(Array.isArray(answer) ? answer : [answer]).map((a, i) => (
            <span key={i} className="excel-q-panel-blank">[{i + 1}] {a}</span>
          ))}
        </div>
      )}

      {type === 'open' && answer && (
        <div className="excel-q-panel-answer">{answer}</div>
      )}
    </div>
  )
}
