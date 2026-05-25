import { useState } from 'react'
import { flattenQuestions, buildColumns, groupCols, sortGroupsByType, orderGroupsByRow, TYPE_LABELS, applyOptionShuffle } from './columns.js'
import { getTotalWeight, computeTotals, computeScoreFromAnswer } from './scoring.js'
import { useSession } from './useSession.js'
import generateExcel from './generateExcel.js'
import ScoreCell from './ScoreCell.jsx'
import QuestionBlock from '@/components/pages/test-sheet/QuestionBlock'
import { TestSheetProvider } from '@/components/pages/test-sheet/TestSheetContext'

export default function ExcelExportPage({ test }) {
  const [selectedRowId, setSelectedRowId] = useState(null)
  const [showDiff, setShowDiff] = useState(false)
  const [hoveredCell, setHoveredCell] = useState(null) // { studentId, qIdx, rect }

  const questions = flattenQuestions(test)
  const activeRow = test.rows?.find(r => r.id === selectedRowId)
  const rawGroups = groupCols(buildColumns(questions, activeRow?.answers ?? {}))
  const groups = activeRow ? orderGroupsByRow(rawGroups, activeRow.order) : sortGroupsByType(rawGroups)
  const cols = groups.flatMap(g => g.cols.map((c, i) => ({ ...c, isGroupFirst: i === 0, isGroupLast: i === g.cols.length - 1 })))

  const session = useSession(test)
  const { students, weights, saveStatus, saveLabel } = session
  const { updateName, updateScore, updateNote, updateRow, updateWeight, addStudent, removeStudent } = session

  const twWeighted = getTotalWeight(groups, weights)

  const hoveredStudent = hoveredCell ? students.find(s => s.id === hoveredCell.studentId) : null
  const hoveredQuestion = (() => {
    if (!hoveredCell || !hoveredStudent) return null
    const q = questions[hoveredCell.qIdx]
    if (!q) return null
    const shuffleMap = activeRow?.answers?.[hoveredCell.qIdx]
    const base = { ...q, _fi: hoveredCell.qIdx }
    if (!shuffleMap || q.type !== 'multipleChoice' || !Array.isArray(q.options)) return base
    const { displayOptions, displayAnswer } = applyOptionShuffle(q.options, q.answer, shuffleMap)
    return { ...base, options: displayOptions, answer: displayAnswer, _shuffle: shuffleMap }
  })()
  const markedOptionOrigins = hoveredCell?.optIdx != null ? [hoveredCell.optIdx] : []

  const floatStyle = (() => {
    if (!hoveredCell) return {}
    const { rect } = hoveredCell
    const panelW = 460
    const panelMaxH = 350
    const left = Math.min(rect.left, window.innerWidth - panelW - 8)
    const top = rect.bottom + 8 + panelMaxH > window.innerHeight
      ? Math.max(8, rect.top - panelMaxH - 8)
      : rect.bottom + 8
    return { top, left }
  })()

  const hasRowVariants = test.rows?.length > 0

  return (
    <div className="excel-page">
      <div className="excel-toolbar no-print">
        <span className="excel-toolbar-info">
          <strong>{cols.length}</strong> col · peso totale <strong>{twWeighted.toFixed(1)}</strong> · <strong>{students.length}</strong> studenti
        </span>
        {saveStatus !== 'idle' && (
          <span className={`excel-save-status excel-save-${saveStatus}`}>{saveLabel}</span>
        )}
        {hasRowVariants && (
          <div className="excel-row-selector">
            <button
              className={`excel-row-btn${selectedRowId === null ? ' active' : ''}`}
              onClick={() => setSelectedRowId(null)}
            >Tipo</button>
            {test.rows.map(r => (
              <button
                key={r.id}
                className={`excel-row-btn${selectedRowId === r.id ? ' active' : ''}`}
                onClick={() => setSelectedRowId(r.id)}
              >Fila {r.id}</button>
            ))}
          </div>
        )}
        <button
          className={`excel-btn-diff${showDiff ? ' active' : ''}`}
          onClick={() => setShowDiff(v => !v)}
          title="Evidenzia celle dove il punteggio salvato differisce da quello calcolato"
        >Diff</button>
        <button className="excel-btn-add" onClick={() => addStudent()}>+ Studente</button>
        <button
          className="excel-btn-generate"
          onClick={() => generateExcel(test, cols, groups, weights, students)}
          disabled={students.length === 0}
        >
          Scarica .xlsx
        </button>
      </div>

<div className="excel-preview-wrap">
        <table className="excel-preview-table">
          <thead>
            <tr className="excel-row-domain">
              <th>Studente</th>
              {hasRowVariants && <th>Fila</th>}
              {groups.map(g => (
                <th
                  key={g.qIdx}
                  colSpan={g.cols.length}
                  className="excel-group-th"
                >
                  {g.qLabel}{g.cols.length > 1 ? ` ×${g.cols.length}` : ''}
                  {' '}<span className={`excel-type-badge excel-type-${g.cols[0].type}`}>{TYPE_LABELS[g.cols[0].type] ?? g.cols[0].type}</span>
                </th>
              ))}
              <th colSpan={2} className="excel-tot-header" title="Punteggio proporzionale (per risposta)">Risposte</th>
              <th colSpan={2} className="excel-tot-header excel-tot-q-header" title="Punteggio binario (per domanda)">Domande</th>
              <th></th>
            </tr>
            <tr className="excel-row-col">
              <th></th>
              {hasRowVariants && <th></th>}
              {cols.map((c, i) => <th key={i} className={`${c.isGroupFirst ? 'group-first' : ''} ${c.isGroupLast ? 'group-last' : ''}`}>{c.colLabel}</th>)}
              <th>TOT</th>
              <th>/10</th>
              <th>TOT</th>
              <th>/10</th>
              <th></th>
            </tr>
            <tr className="excel-row-expected">
              <td>Atteso</td>
              {hasRowVariants && <td></td>}
              {cols.map((c, i) => <td key={i} className={`${c.isGroupFirst ? 'group-first' : ''} ${c.isGroupLast ? 'group-last' : ''}`}>{c.expected}</td>)}
              <td>{twWeighted.toFixed(1)}</td>
              <td></td>
              <td>{twWeighted.toFixed(1)}</td>
              <td></td>
              <td></td>
            </tr>
            <tr className="excel-row-weight">
              <td className="excel-weight-label">Peso D.</td>
              {hasRowVariants && <td></td>}
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
                <td colSpan={cols.length + 6 + (hasRowVariants ? 1 : 0)} className="excel-empty-row">
                  Nessuno studente — clicca "+ Studente" per iniziare
                </td>
              </tr>
            )}
            {students.map(student => {
              const effectiveScore = col => {
                const manual = student.scores[col.colLabel]
                if (manual != null && manual !== '') return manual
                return computeScoreFromAnswer(col, questions[col.qIdx], student.answers)
              }
              const effectiveScores = Object.fromEntries(cols.map(c => [c.colLabel, effectiveScore(c)]))
              const { totCells, totQuestions } = computeTotals({ scores: effectiveScores }, groups, weights)
              const gradeCells = twWeighted > 0 ? (Math.round(totCells / twWeighted * 10 * 10) / 10).toFixed(1) : '—'
              const gradeQuestions = twWeighted > 0 ? (Math.round(totQuestions / twWeighted * 10 * 10) / 10).toFixed(1) : '—'
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
                  {hasRowVariants && (
                    <td className="excel-row-cell">
                      <select
                        value={student.row || ''}
                        onChange={e => updateRow(student.id, e.target.value)}
                        className="excel-row-select"
                      >
                        <option value=""></option>
                        {test.rows.map(r => <option key={r.id} value={r.id}>{r.id}</option>)}
                      </select>
                    </td>
                  )}
                  {cols.map(col => {
                    const saved = student.scores[col.colLabel]
                    const derived = computeScoreFromAnswer(col, questions[col.qIdx], student.answers)
                    const hasDiff = showDiff && saved != null && saved !== '' && derived != null && Number(saved) !== Number(derived)
                    return (
                      <td
                        key={col.colLabel}
                        className={`excel-input-cell${hasDiff ? ' diff' : ''}${col.isGroupFirst ? ' group-first' : ''}${col.isGroupLast ? ' group-last' : ''}`}
                        onMouseEnter={e => setHoveredCell({ studentId: student.id, qIdx: col.qIdx, optIdx: col.optIdx, rect: e.currentTarget.getBoundingClientRect() })}
                        onMouseLeave={() => setHoveredCell(null)}
                      >
                        <ScoreCell
                          col={col}
                          value={effectiveScores[col.colLabel]}
                          onChange={v => updateScore(student.id, col.colLabel, v)}
                          note={student.notes?.[col.colLabel] || ''}
                          onNoteChange={v => updateNote(student.id, col.colLabel, v)}
                        />
                      </td>
                    )
                  })}
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

      {hoveredQuestion && hoveredStudent && (
        <div className="excel-float-panel" style={floatStyle}>
          <TestSheetProvider
            fontSize={11} gap={3} marginBottom={10}
            fontFamily='Georgia, "Times New Roman", serif'
            showAnswers={true}
            correctionMode={true}
            studentScores={hoveredStudent.scores ?? {}}
            studentAnswers={hoveredStudent.answers ?? {}}
            markedOptionOrigins={markedOptionOrigins}
          >
            <QuestionBlock question={hoveredQuestion} index={hoveredCell.qIdx} />
          </TestSheetProvider>
        </div>
      )}

      <div className="excel-legend no-print">
        <strong>Input:</strong>
        <span className="excel-legend-item excel-type-mqma">MQMA/filler — click per 1/0</span>
        <span className="excel-legend-item excel-type-mc">MC/V/F — click per 1/0</span>
        <span className="excel-legend-item excel-type-open">aperta — livelli 0/1/2/3</span>
      </div>
    </div>
  )
}
