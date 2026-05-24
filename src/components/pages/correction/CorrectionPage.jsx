import { useState, useEffect } from 'react'
import TestSheet from '@/components/pages/test-sheet/TestSheet'
import { flattenQuestions, applyOptionShuffle } from '@/components/pages/excel-export/columns.js'
import { useSession } from '@/components/pages/excel-export/useSession.js'

function countPending(variant, student) {
  if (!variant || !student) return 0
  const scores = student.scores ?? {}
  const answers = student.answers ?? {}
  let pending = 0
  for (const q of variant.questions) {
    const fi = q._fi
    if (fi == null) continue
    const base = `D${fi + 1}`
    let corrected = true
    if (q.type === 'multipleChoice') {
      if (q.multi) {
        corrected = q.options.every((_, i) => {
          const origI = q._shuffle ? q._shuffle[i] : i
          return answers[`${base}[${origI + 1}]`] != null
        })
      } else {
        corrected = answers[base] != null
      }
    } else if (q.type === 'trueFalse') {
      corrected = answers[base] != null
    } else if (q.type === 'filler') {
      const ans = Array.isArray(q.answer) ? q.answer : [q.answer]
      corrected = ans.some((_, bi) => {
        const lbl = ans.length > 1 ? `${base}[${bi + 1}]` : base
        return scores[lbl] != null && scores[lbl] !== ''
      })
    } else if (q.type === 'open') {
      corrected = scores[base] != null && scores[base] !== ''
    }
    if (!corrected) pending++
  }
  return pending
}


function buildRowTest(test, row) {
  const flatQ = flattenQuestions(test)
  const reordered = row.order.map(fi => {
    const q = { ...flatQ[fi], _fi: fi }
    const shuffleMap = row.answers?.[fi]
    if (!shuffleMap || q.type !== 'multipleChoice' || !Array.isArray(q.options)) return q
    const { displayOptions, displayAnswer } = applyOptionShuffle(q.options, q.answer, shuffleMap)
    return { ...q, options: displayOptions, answer: displayAnswer, _shuffle: shuffleMap }
  })
  return { ...test, questions: reordered }
}

export default function CorrectionPage({ test }) {
  const hasRows = Array.isArray(test.rows) && test.rows.length > 0

  const [selectedRowId, setSelectedRowId] = useState(null)
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [newStudentName, setNewStudentName] = useState('')
  const [variants, setVariants] = useState(null)

  const [fontSize, setFontSize] = useState(13)
  const [gap, setGap] = useState(8)
  const [marginBottom, setMarginBottom] = useState(20)
  const [fontFamily, setFontFamily] = useState('Georgia, "Times New Roman", serif')

  const { students, saveStatus, saveLabel, updateScore, updateAnswer, updateRow, addStudent } = useSession(test)

  useEffect(() => {
    setSelectedRowId(null)
    setSelectedStudentId('')
    setNewStudentName('')
    setVariants(null)
  }, [test])

  useEffect(() => {
    if (hasRows && !variants) {
      setVariants(test.rows.map(row => buildRowTest(test, row)))
    }
  }, [hasRows, test]) // eslint-disable-line react-hooks/exhaustive-deps

  // When selecting an existing student, pre-select the row they're assigned to
  function handleSelectStudent(id) {
    setSelectedStudentId(id)
    if (id) {
      const s = students.find(s => s.id === id)
      if (s?.row && test.rows?.some(r => r.id === s.row)) {
        setSelectedRowId(s.row)
      }
    }
  }

  function handleSelectRow(rowId) {
    setSelectedRowId(rowId)
    // Update student's assigned row when row changes
    if (selectedStudentId) updateRow(selectedStudentId, rowId)
  }

  function handleAddStudent() {
    const trimmed = newStudentName.trim()
    if (!trimmed) return
    const id = addStudent(trimmed)
    if (selectedRowId) updateRow(id, selectedRowId)
    setSelectedStudentId(id)
    setNewStudentName('')
  }

  const fonts = [
    { label: 'Georgia', value: 'Georgia, "Times New Roman", serif' },
    { label: 'Arial', value: 'Arial, Helvetica, sans-serif' },
    { label: 'Times New Roman', value: '"Times New Roman", Times, serif' },
    { label: 'Courier', value: '"Courier New", Courier, monospace' },
  ]

  if (!hasRows) {
    return (
      <div className="correction-page">
        <p className="correction-empty">
          La correzione è disponibile solo per test con file (righe). Aggiungi le righe nel file JSON del test.
        </p>
      </div>
    )
  }

  if (!variants) return null

  const rowIdx = selectedRowId != null ? test.rows.findIndex(r => r.id === selectedRowId) : -1
  const variant = rowIdx >= 0 ? variants[rowIdx] : null
  const student = students.find(s => s.id === selectedStudentId) ?? null
  const pending = countPending(variant, student)

  return (
    <>
      <div className="toolbar no-print">
        <div className="toolbar-group">
          {/* Row selector */}
          <div className="excel-row-selector">
            {test.rows.map(r => (
              <button
                key={r.id}
                className={`excel-row-btn${selectedRowId === r.id ? ' active' : ''}`}
                onClick={() => handleSelectRow(r.id)}
              >
                Fila {r.id}
              </button>
            ))}
          </div>

          <div className="toolbar-divider" />

          {/* Student selector */}
          <select
            className="toolbar-select"
            value={selectedStudentId}
            onChange={e => handleSelectStudent(e.target.value)}
          >
            <option value="">— Studente —</option>
            {students.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>

          {/* New student */}
          <input
            className="toolbar-input"
            style={{ width: '140px' }}
            placeholder="Nuovo studente…"
            value={newStudentName}
            onChange={e => setNewStudentName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddStudent()}
          />
          <button onClick={handleAddStudent}>+</button>

          {saveStatus !== 'idle' && (
            <span className={`excel-save-status excel-save-${saveStatus}`}>{saveLabel}</span>
          )}

          {student && variant && (
            pending === 0
              ? <span className="corr-pending-badge corr-pending-done">Completata</span>
              : <span className="corr-pending-badge corr-pending-todo">{pending} da correggere</span>
          )}
        </div>

        <div className="toolbar-divider" />

        <div className="toolbar-group">
          <label className="toolbar-control">
            Carattere
            <select value={fontFamily} onChange={e => setFontFamily(e.target.value)} className="toolbar-select">
              {fonts.map(f => <option key={f.label} value={f.value}>{f.label}</option>)}
            </select>
          </label>
          <label className="toolbar-control">
            Dimensione
            <div className="toolbar-stepper">
              <button onClick={() => setFontSize(s => Math.max(8, s - 1))}>−</button>
              <span>{fontSize}px</span>
              <button onClick={() => setFontSize(s => Math.min(20, s + 1))}>+</button>
            </div>
          </label>
          <label className="toolbar-control">
            Spaziatura
            <div className="toolbar-stepper">
              <button onClick={() => setGap(g => Math.max(0, g - 2))}>−</button>
              <span>{gap}px</span>
              <button onClick={() => setGap(g => Math.min(32, g + 2))}>+</button>
            </div>
          </label>
          <label className="toolbar-control">
            Margine basso
            <div className="toolbar-stepper">
              <button onClick={() => setMarginBottom(m => Math.max(0, m - 2))}>−</button>
              <span>{marginBottom}mm</span>
              <button onClick={() => setMarginBottom(m => Math.min(50, m + 2))}>+</button>
            </div>
          </label>
        </div>
      </div>

      {(!selectedRowId || !selectedStudentId) && (
        <div className="correction-page">
          <p className="correction-empty">
            {!selectedRowId && !selectedStudentId && 'Seleziona una fila e uno studente per iniziare la correzione.'}
            {selectedRowId && !selectedStudentId && 'Seleziona o crea uno studente.'}
            {!selectedRowId && selectedStudentId && 'Seleziona una fila.'}
          </p>
        </div>
      )}

      {variant && student && (
        <TestSheet
          index={`Fila ${selectedRowId}`}
          test={variant}
          fontSize={fontSize}
          gap={gap}
          marginBottom={marginBottom}
          fontFamily={fontFamily}
          showAnswers={false}
          showInstructions={true}
          showLegend={true}
          correctionMode={true}
          studentScores={student.scores ?? {}}
          studentAnswers={student.answers ?? {}}
          onScore={(colLabel, value) => updateScore(selectedStudentId, colLabel, value)}
          onAnswer={(colLabel, raw) => updateAnswer(selectedStudentId, colLabel, raw)}
        />
      )}
    </>
  )
}
