import { useState, useEffect, useCallback, useRef } from 'react'
import * as XLSX from 'xlsx'

// ─── API helpers ─────────────────────────────────────────────────────────────

function apiKey(test) {
  return `${test.title ?? ''}:${test.classe ?? ''}:${test.uda ?? ''}`
}

// localStorage fallback key (kept in sync as a cache)
function storageKey(test) {
  return `excel-grid:${apiKey(test)}`
}

async function fetchSession(test) {
  const res = await fetch(`/api/griglia?key=${encodeURIComponent(apiKey(test))}`)
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

async function putSession(test, students, weights) {
  const res = await fetch(`/api/griglia?key=${encodeURIComponent(apiKey(test))}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ students, weights }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

function flattenQuestions(testData) {
  const result = []
  if (!Array.isArray(testData.questions)) return result
  testData.questions.forEach(item => {
    if (item.pin) return
    if (Array.isArray(item.questions)) {
      item.questions.forEach(q => { if (!q.skip) result.push(q) })
    } else if (!item.skip) {
      result.push(item)
    }
  })
  return result
}

function buildColumns(questions) {
  const cols = []
  questions.forEach((q, qi) => {
    const label = `D${qi + 1}`
    switch (q.type) {
      case 'multipleChoice':
        if (q.multi && Array.isArray(q.answer) && Array.isArray(q.options)) {
          q.options.forEach((opt, oi) => {
            cols.push({
              qIdx: qi, qLabel: label,
              colLabel: `${label}[${oi + 1}]`,
              type: 'mqma',
              expected: q.answer.includes(oi) ? '✓' : '✗',
              maxPts: 1,
            })
          })
        } else {
          const letter = typeof q.answer === 'number'
            ? String.fromCharCode(65 + q.answer)
            : String(q.answer)
          cols.push({
            qIdx: qi, qLabel: label,
            colLabel: label,
            type: 'mc',
            expected: letter,
            maxPts: 1,
          })
        }
        break
      case 'trueFalse':
        cols.push({
          qIdx: qi, qLabel: label,
          colLabel: label,
          type: 'tf',
          expected: q.answer ? 'V' : 'F',
          maxPts: 1,
        })
        break
      case 'filler': {
        const answers = Array.isArray(q.answer) ? q.answer : [q.answer]
        answers.forEach((ans, bi) => {
          cols.push({
            qIdx: qi, qLabel: label,
            colLabel: answers.length > 1 ? `${label}[${bi + 1}]` : label,
            type: 'filler',
            expected: String(ans),
            maxPts: 1,
          })
        })
        break
      }
      case 'open':
        cols.push({
          qIdx: qi, qLabel: label,
          colLabel: label,
          type: 'open',
          expected: q.linesNumber ? `${q.linesNumber} righe` : '—',
          maxPts: 3,  // 4 discrete levels: 0–3
        })
        break
      default:
        break
    }
  })
  return cols
}

function groupCols(cols) {
  const groups = []
  cols.forEach(col => {
    const last = groups[groups.length - 1]
    if (last && last.qIdx === col.qIdx) {
      last.cols.push(col)
    } else {
      groups.push({ qIdx: col.qIdx, qLabel: col.qLabel, cols: [col] })
    }
  })
  return groups
}

function makeStudent(name = '', cols = []) {
  const scores = {}
  cols.forEach(c => { scores[c.colLabel] = c.maxPts })  // 3 for open, 1 for discrete
  return { id: Date.now().toString() + Math.random(), name, scores, notes: {} }
}

function getWeight(weights, qIdx) {
  const v = weights[qIdx]
  if (v === '' || v == null) return 1
  return parseFloat(v) || 0
}

function getTotalWeight(groups, weights) {
  return groups.reduce((s, g) => s + getWeight(weights, g.qIdx), 0)
}

/**
 * Returns two totals for a student:
 * - totCells: Σ (pct_correct × weight) per question  — proportional per answer
 * - totQuestions: Σ (allCorrect ? weight : 0) per question  — binary per question
 */
function computeTotals(student, groups, weights) {
  let totCells = 0, totQuestions = 0
  groups.forEach(g => {
    const w = getWeight(weights, g.qIdx)
    let sumScore = 0, sumMax = 0, allCorrect = true
    g.cols.forEach(c => {
      const cellMax = c.type === 'open' ? 3 : 1
      const v = student.scores[c.colLabel]
      const val = v !== '' && v != null ? parseFloat(v) || 0 : 0
      sumScore += val
      sumMax += cellMax
      if (val < cellMax) allCorrect = false
    })
    const pct = sumMax > 0 ? sumScore / sumMax : 0
    totCells += pct * w
    totQuestions += allCorrect ? w : 0
  })
  return { totCells, totQuestions }
}

// ─── Excel generation ────────────────────────────────────────────────────────

function generateExcel(test, cols, groups, weights, students) {
  const wb = XLSX.utils.book_new()
  const tw = getTotalWeight(groups, weights)

  const row0 = ['Domanda']
  const row1 = ['Colonna']
  const row2 = ['Tipo']
  const row3 = ['Atteso']
  const row4 = ['Peso']

  groups.forEach(g => {
    const w = getWeight(weights, g.qIdx)
    row0.push(g.qLabel + (g.cols.length > 1 ? ` (×${g.cols.length})` : ''))
    for (let i = 1; i < g.cols.length; i++) row0.push('')
    row4.push(w)
    for (let i = 1; i < g.cols.length; i++) row4.push('')
    g.cols.forEach(c => {
      row1.push(c.colLabel)
      row2.push(c.type)
      row3.push(c.expected)
    })
  })

  row0.push('TOT_R', '/10_R', 'TOT_D', '/10_D')
  row1.push('', '', '', '')
  row2.push('', '', '', '')
  row3.push(tw, '', tw, '')
  row4.push('', '', '', '')

  const aoa = [row0, row1, row2, row3, row4]

  students.forEach(student => {
    const { totCells, totQuestions } = computeTotals(student, groups, weights)
    const gradeCells = tw > 0 ? Math.round(totCells / tw * 10 * 10) / 10 : 0
    const gradeQuestions = tw > 0 ? Math.round(totQuestions / tw * 10 * 10) / 10 : 0
    const row = [student.name]
    cols.forEach(c => {
      const v = student.scores[c.colLabel]
      row.push(v !== '' && v != null ? v : '')
    })
    row.push(
      Math.round(totCells * 100) / 100,
      gradeCells,
      Math.round(totQuestions * 100) / 100,
      gradeQuestions,
    )
    aoa.push(row)
  })

  const ws = XLSX.utils.aoa_to_sheet(aoa)

  const merges = []
  let cIdx = 1
  groups.forEach(g => {
    if (g.cols.length > 1) {
      merges.push({ s: { r: 0, c: cIdx }, e: { r: 0, c: cIdx + g.cols.length - 1 } })
      merges.push({ s: { r: 4, c: cIdx }, e: { r: 4, c: cIdx + g.cols.length - 1 } })
    }
    cIdx += g.cols.length
  })
  if (merges.length > 0) ws['!merges'] = merges

  ws['!cols'] = [
    { wch: 22 },
    ...cols.map(c => ({ wch: c.type === 'mqma' ? 7 : c.type === 'open' ? 8 : 10 })),
    { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 },
  ]

  XLSX.utils.book_append_sheet(wb, ws, 'Correzione')

  const hasNotes = students.some(s => Object.values(s.notes || {}).some(n => n))
  if (hasNotes) {
    const noteHeader = ['Studente', ...cols.map(c => c.colLabel)]
    const noteRows = students.map(s => [
      s.name,
      ...cols.map(c => s.notes?.[c.colLabel] || ''),
    ])
    const wsNotes = XLSX.utils.aoa_to_sheet([noteHeader, ...noteRows])
    wsNotes['!cols'] = [{ wch: 22 }, ...cols.map(() => ({ wch: 20 }))]
    XLSX.utils.book_append_sheet(wb, wsNotes, 'Note')
  }

  const safeTitle = (test.title || 'verifica').replace(/\s+/g, '-').toLowerCase()
  XLSX.writeFile(wb, `griglia-${safeTitle}.xlsx`)
}

// ─── Cell components ─────────────────────────────────────────────────────────

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

// 4 discrete levels for open questions: 3 (correct) → 0 → 1 → 2 → 3
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

function ScoreCell({ col, value, onChange, note, onNoteChange }) {
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

// ─── Question panel ───────────────────────────────────────────────────────────

function getQuestionDisplayText(q) {
  if (q.text) return q.text
  if (Array.isArray(q.content)) {
    return q.content.filter(c => c.kind === 'text').map(c => c.value).join(' ')
  }
  return ''
}

function QuestionPanel({ question, qLabel, onClose }) {
  const { type, options, answer, multi } = question
  const text = getQuestionDisplayText(question)

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
          {options.map((opt, i) => {
            const isCorrect = multi
              ? Array.isArray(answer) && answer.includes(i)
              : answer === i
            return (
              <div key={i} className={`excel-q-panel-option${isCorrect ? ' correct' : ''}`}>
                <span className="excel-q-panel-opt-idx">[{i + 1}]</span>
                <span className="excel-q-panel-opt-text">{opt}</span>
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

// ─── Main page ────────────────────────────────────────────────────────────────

const TYPE_LABELS = { mqma: 'MQMA', mc: 'MC', tf: 'V/F', filler: 'fill', open: 'aperta' }

// 'idle' | 'pending' | 'saving' | 'saved' | 'error'
const SAVE_LABELS = {
  pending: 'In attesa…',
  saving:  'Salvataggio…',
  saved:   '✓ Salvato',
  error:   '✗ Errore',
}

export default function ExcelExportPage({ test }) {
  const [students, setStudents] = useState([])
  const [weights, setWeights] = useState({})
  const [selectedQIdx, setSelectedQIdx] = useState(null)
  const [saveStatus, setSaveStatus] = useState('idle')
  const [ready, setReady] = useState(false)

  const saveTimerRef = useRef(null)
  const fadeTimerRef = useRef(null)
  const lsKey = storageKey(test)

  const questions = flattenQuestions(test)
  const cols = buildColumns(questions)
  const groups = groupCols(cols)
  const tw = getTotalWeight(groups, weights)

  // Load: try API first, fall back to localStorage
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      let s = [], w = {}
      try {
        const data = await fetchSession(test)
        if (data && !cancelled) {
          s = Array.isArray(data.students) ? data.students : []
          w = data.weights ?? {}
        } else {
          throw new Error('not found')
        }
      } catch {
        try {
          const saved = JSON.parse(localStorage.getItem(lsKey))
          if (saved && !cancelled) {
            if (Array.isArray(saved)) { s = saved }
            else { s = Array.isArray(saved.students) ? saved.students : []; w = saved.weights ?? {} }
          }
        } catch {}
      }
      if (!cancelled) { setStudents(s); setWeights(w); setReady(true) }
    })()
    return () => { cancelled = true }
  }, [lsKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // Autosave: debounce 600ms → PUT to API, also keep localStorage in sync
  useEffect(() => {
    if (!ready) return
    localStorage.setItem(lsKey, JSON.stringify({ students, weights }))

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current)
    setSaveStatus('pending')

    saveTimerRef.current = setTimeout(async () => {
      setSaveStatus('saving')
      try {
        await putSession(test, students, weights)
        setSaveStatus('saved')
        fadeTimerRef.current = setTimeout(() => setSaveStatus('idle'), 2000)
      } catch {
        setSaveStatus('error')
      }
    }, 600)
  }, [ready, students, weights]) // eslint-disable-line react-hooks/exhaustive-deps

  const updateName = useCallback((id, name) => {
    setStudents(prev => prev.map(s => s.id === id ? { ...s, name } : s))
  }, [])

  const updateScore = useCallback((id, colLabel, value) => {
    setStudents(prev => prev.map(s =>
      s.id === id ? { ...s, scores: { ...s.scores, [colLabel]: value } } : s
    ))
  }, [])

  const updateNote = useCallback((id, colLabel, note) => {
    setStudents(prev => prev.map(s =>
      s.id === id ? { ...s, notes: { ...s.notes, [colLabel]: note } } : s
    ))
  }, [])

  const updateWeight = useCallback((qIdx, value) => {
    setWeights(prev => ({ ...prev, [qIdx]: value === '' ? '' : parseFloat(value) || 0 }))
  }, [])

  const addStudent = () => setStudents(prev => [...prev, makeStudent('', cols)])
  const removeStudent = id => setStudents(prev => prev.filter(s => s.id !== id))
  const toggleQuestion = qIdx => setSelectedQIdx(prev => prev === qIdx ? null : qIdx)

  const selectedGroup = selectedQIdx !== null ? groups.find(g => g.qIdx === selectedQIdx) : null
  const selectedQuestion = selectedQIdx !== null ? questions[selectedQIdx] : null

  return (
    <div className="excel-page">
      <div className="excel-toolbar no-print">
        <span className="excel-toolbar-info">
          <strong>{cols.length}</strong> col · peso totale <strong>{tw.toFixed(1)}</strong> · <strong>{students.length}</strong> studenti
        </span>
        {saveStatus !== 'idle' && (
          <span className={`excel-save-status excel-save-${saveStatus}`}>
            {SAVE_LABELS[saveStatus]}
          </span>
        )}
        <button className="excel-btn-add" onClick={addStudent}>+ Studente</button>
        <button
          className="excel-btn-generate"
          onClick={() => generateExcel(test, cols, groups, weights, students)}
          disabled={students.length === 0}
        >
          Scarica .xlsx
        </button>
      </div>

      {selectedQuestion && (
        <QuestionPanel
          question={selectedQuestion}
          qLabel={selectedGroup?.qLabel}
          onClose={() => setSelectedQIdx(null)}
        />
      )}

      <div className="excel-preview-wrap">
        <table className="excel-preview-table">
          <thead>
            <tr className="excel-row-domain">
              <th>Studente</th>
              {groups.map(g => (
                <th
                  key={g.qIdx}
                  colSpan={g.cols.length}
                  className={`excel-group-th${selectedQIdx === g.qIdx ? ' selected' : ''}`}
                  onClick={() => toggleQuestion(g.qIdx)}
                  title="Clicca per vedere la domanda"
                >
                  {g.qLabel}{g.cols.length > 1 ? ` ×${g.cols.length}` : ''}
                </th>
              ))}
              <th colSpan={2} className="excel-tot-header" title="Punteggio proporzionale (per risposta)">Risposte</th>
              <th colSpan={2} className="excel-tot-header excel-tot-q-header" title="Punteggio binario (per domanda)">Domande</th>
              <th></th>
            </tr>
            <tr className="excel-row-col">
              <th></th>
              {cols.map((c, i) => <th key={i}>{c.colLabel}</th>)}
              <th>TOT</th>
              <th>/10</th>
              <th>TOT</th>
              <th>/10</th>
              <th></th>
            </tr>
            <tr className="excel-row-type">
              <td></td>
              {cols.map((c, i) => (
                <td key={i} className={`excel-type-badge excel-type-${c.type}`}>
                  {TYPE_LABELS[c.type] ?? c.type}
                </td>
              ))}
              <td></td><td></td><td></td><td></td><td></td>
            </tr>
            <tr className="excel-row-expected">
              <td>Atteso</td>
              {cols.map((c, i) => <td key={i}>{c.expected}</td>)}
              <td>{tw.toFixed(1)}</td>
              <td></td>
              <td>{tw.toFixed(1)}</td>
              <td></td>
              <td></td>
            </tr>
            <tr className="excel-row-weight">
              <td className="excel-weight-label">Peso D.</td>
              {groups.map(g => (
                <td key={g.qIdx} colSpan={g.cols.length} className="excel-weight-cell">
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    value={weights[g.qIdx] ?? 1}
                    onChange={e => updateWeight(g.qIdx, e.target.value)}
                    className="excel-weight-input"
                  />
                </td>
              ))}
              <td></td><td></td><td></td><td></td><td></td>
            </tr>
          </thead>
          <tbody>
            {students.length === 0 && (
              <tr>
                <td colSpan={cols.length + 6} className="excel-empty-row">
                  Nessuno studente — clicca "+ Studente" per iniziare
                </td>
              </tr>
            )}
            {students.map(student => {
              const { totCells, totQuestions } = computeTotals(student, groups, weights)
              const gradeCells = tw > 0 ? (Math.round(totCells / tw * 10 * 10) / 10).toFixed(1) : '—'
              const gradeQuestions = tw > 0 ? (Math.round(totQuestions / tw * 10 * 10) / 10).toFixed(1) : '—'
              return (
                <tr key={student.id} className="excel-student-row">
                  <td className="excel-name-cell">
                    <input
                      value={student.name}
                      onChange={e => updateName(student.id, e.target.value)}
                      placeholder="Nome studente"
                      className="excel-name-input"
                    />
                  </td>
                  {cols.map(col => (
                    <td key={col.colLabel} className="excel-input-cell">
                      <ScoreCell
                        col={col}
                        value={student.scores[col.colLabel]}
                        onChange={v => updateScore(student.id, col.colLabel, v)}
                        note={student.notes?.[col.colLabel] || ''}
                        onNoteChange={v => updateNote(student.id, col.colLabel, v)}
                      />
                    </td>
                  ))}
                  <td className="excel-total-cell">{totCells.toFixed(2)}</td>
                  <td className={`excel-grade-cell${parseFloat(gradeCells) < 6 ? ' fail' : ' pass'}`}>{gradeCells}</td>
                  <td className="excel-total-cell excel-total-q">{totQuestions.toFixed(2)}</td>
                  <td className={`excel-grade-cell excel-grade-q${parseFloat(gradeQuestions) < 6 ? ' fail' : ' pass'}`}>{gradeQuestions}</td>
                  <td className="excel-remove-cell">
                    <button className="excel-btn-remove" onClick={() => removeStudent(student.id)} title="Rimuovi">✕</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="excel-legend no-print">
        <strong>Input:</strong>
        <span className="excel-legend-item excel-type-mqma">MQMA/filler — click per 1/0</span>
        <span className="excel-legend-item excel-type-mc">MC/V/F — click per 1/0</span>
        <span className="excel-legend-item excel-type-open">aperta — livelli 0/1/2/3</span>
      </div>
    </div>
  )
}
