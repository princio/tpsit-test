import { useState } from 'react'

function ToggleCell({ value, onChange }) {
  function handleClick() {
    if (value === '' || value == null) onChange(1)
    else if (value === 1) onChange(0)
    else onChange(1)
  }
  const cls = value === 1 ? 'correct' : value === 0 ? 'wrong' : 'empty'
  return (
    <button className={`excel-score-toggle ${cls}`} onClick={handleClick}>
      {value === 1 ? '1' : value === 0 ? '0' : ''}
    </button>
  )
}

// 4 discrete levels: empty → 3 → 0 → 1 → 2 → 3 → …
function LevelCell({ value, onChange }) {
  function handleClick() {
    if (value == null || value === '') onChange(3)
    else if (value >= 3) onChange(0)
    else onChange(value + 1)
  }
  let cls
  if (value === 3) cls = 'correct'
  else if (value === 2) cls = 'partial-high'
  else if (value === 1) cls = 'partial-low'
  else if (value === 0) cls = 'wrong'
  else cls = 'empty'
  return (
    <button className={`excel-score-toggle ${cls}`} onClick={handleClick}>
      {value == null || value === '' ? '' : String(value)}
    </button>
  )
}

export default function ScoreCell({ col, value, onChange, note, onNoteChange }) {
  const [showNote, setShowNote] = useState(false)
  return (
    <div className="excel-cell-wrap">
      <div className="excel-cell-top">
        {col.type === 'open'
          ? <LevelCell value={value} onChange={onChange} />
          : <ToggleCell value={value} onChange={onChange} />
        }
        <button
          className={`excel-note-btn${note ? ' has-note' : ''}`}
          onClick={() => setShowNote(s => !s)}
          title={note || 'Aggiungi nota'}
        >●</button>
      </div>
      {showNote && (
        <textarea
          className="excel-note-input"
          value={note || ''}
          onChange={e => onNoteChange(e.target.value)}
          placeholder="Nota..."
          rows={2}
          autoFocus
        />
      )}
    </div>
  )
}
