import { useState, useEffect, useRef, useCallback } from 'react'
import FilePicker from './FilePicker'
import { defaultCriteria, rubricLevels } from '../data/defaultCriteria'

const STORAGE_KEY = 'tpsit-open-corrections'

function loadCorrections() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [] }
  catch { return [] }
}
function saveCorrections(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

function buildEmptyCorrection(question, testTitle, qIndex) {
  const criteria = question.criteria || defaultCriteria
  return {
    id: Date.now().toString(),
    studente: '',
    testTitle,
    questionIndex: qIndex,
    questionText: question.text || (question.content?.find(c => c.kind === 'text')?.value) || '',
    studentAnswer: '',
    criteria: criteria.map(c => ({
      criterion: { ...c },
      boolean_questions: c.boolean_questions.map(q => ({
        question: q,
        answer: null,
        rationale: '',
        citations: []
      }))
    })),
    penmarks: [],
    grading: {
      i1: { level: null, peso: null },
      i2: { level: null, peso: null },
      i3: { level: null, peso: null },
      formattazione: null,
      votoFinale: null
    },
    date: new Date().toISOString()
  }
}

// ---- Text Highlighter (student answer panel) ----

function StudentAnswerPanel({ answer, onChangeAnswer, allCitations, citationTarget, onAddCitation }) {
  const textRef = useRef(null)
  const [popover, setPopover] = useState(null)

  function handleMouseUp() {
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed || !textRef.current?.contains(sel.anchorNode)) {
      setPopover(null)
      return
    }
    const text = sel.toString().trim()
    if (!text) { setPopover(null); return }
    const range = sel.getRangeAt(0)
    const rect = range.getBoundingClientRect()
    const containerRect = textRef.current.getBoundingClientRect()
    setPopover({
      text,
      top: rect.top - containerRect.top - 36,
      left: rect.left - containerRect.left + rect.width / 2
    })
  }

  function handleAddCitation() {
    if (popover?.text) {
      onAddCitation(popover.text)
      setPopover(null)
      window.getSelection()?.removeAllRanges()
    }
  }

  // Build highlighted segments
  const segments = buildHighlightedSegments(answer, allCitations)

  return (
    <div className="oc-answer-panel">
      <h4>Risposta dello studente</h4>
      {!answer && (
        <textarea
          className="oc-answer-input"
          placeholder="Incolla o digita la risposta dello studente..."
          rows={8}
          value={answer}
          onChange={e => onChangeAnswer(e.target.value)}
        />
      )}
      {answer && (
        <div className="oc-answer-text-wrap">
          {citationTarget && (
            <div className="oc-citation-hint">
              Seleziona il testo da citare per: <em>{citationTarget.question}</em>
            </div>
          )}
          <div className="oc-answer-text" ref={textRef} onMouseUp={handleMouseUp}>
            {segments.map((seg, i) => (
              <span key={i} className={seg.highlighted ? 'oc-highlight' : ''}>
                {seg.text}
              </span>
            ))}
          </div>
          {popover && (
            <div className="oc-popover" style={{ top: popover.top, left: popover.left }}>
              <button onClick={handleAddCitation}>+ Citazione</button>
            </div>
          )}
          <button className="oc-edit-answer-btn" onClick={() => onChangeAnswer('')}>
            Modifica risposta
          </button>
        </div>
      )}
    </div>
  )
}

function buildHighlightedSegments(text, citations) {
  if (!text || !citations.length) return [{ text: text || '', highlighted: false }]

  // Find all occurrences
  const ranges = []
  for (const cit of citations) {
    let idx = 0
    while ((idx = text.indexOf(cit, idx)) !== -1) {
      ranges.push({ start: idx, end: idx + cit.length })
      idx += cit.length
    }
  }
  if (!ranges.length) return [{ text, highlighted: false }]

  // Merge overlapping
  ranges.sort((a, b) => a.start - b.start)
  const merged = [ranges[0]]
  for (let i = 1; i < ranges.length; i++) {
    const last = merged[merged.length - 1]
    if (ranges[i].start <= last.end) {
      last.end = Math.max(last.end, ranges[i].end)
    } else {
      merged.push(ranges[i])
    }
  }

  const segments = []
  let pos = 0
  for (const r of merged) {
    if (pos < r.start) segments.push({ text: text.slice(pos, r.start), highlighted: false })
    segments.push({ text: text.slice(r.start, r.end), highlighted: true })
    pos = r.end
  }
  if (pos < text.length) segments.push({ text: text.slice(pos), highlighted: false })
  return segments
}

// ---- Boolean Question Row ----

function BooleanQuestionRow({ bq, onChange, onRequestCitation, isCitationTarget }) {
  const [showDetail, setShowDetail] = useState(false)

  return (
    <div className={`oc-bq-row${isCitationTarget ? ' oc-bq-target' : ''}`}>
      <div className="oc-bq-main">
        <span className="oc-bq-text">{bq.question}</span>
        <div className="oc-bq-toggle">
          <button
            className={`oc-bq-btn${bq.answer === true ? ' active-yes' : ''}`}
            onClick={() => onChange({ ...bq, answer: bq.answer === true ? null : true })}
          >Si</button>
          <button
            className={`oc-bq-btn${bq.answer === false ? ' active-no' : ''}`}
            onClick={() => onChange({ ...bq, answer: bq.answer === false ? null : false })}
          >No</button>
        </div>
        <button className="oc-bq-detail-toggle" onClick={() => setShowDetail(s => !s)}>
          {showDetail ? '−' : '+'}
        </button>
      </div>
      {showDetail && (
        <div className="oc-bq-detail">
          <textarea
            className="oc-bq-rationale"
            placeholder="Motivazione..."
            value={bq.rationale}
            onChange={e => onChange({ ...bq, rationale: e.target.value })}
            rows={2}
          />
          <div className="oc-bq-citations">
            <div className="oc-bq-citations-header">
              <span>Citazioni ({bq.citations.length})</span>
              <button className="oc-cite-btn" onClick={onRequestCitation}>
                + Seleziona dal testo
              </button>
            </div>
            {bq.citations.map((c, i) => (
              <div key={i} className="oc-citation-chip">
                <span>"{c}"</span>
                <button onClick={() => {
                  const newCits = bq.citations.filter((_, j) => j !== i)
                  onChange({ ...bq, citations: newCits })
                }}>x</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ---- Criteria Panel ----

function CriteriaPanel({ criteria, onChange, onRequestCitation }) {
  return (
    <div className="oc-criteria-panel">
      <h4>Criteri di valutazione</h4>
      {criteria.map((ac, ci) => (
        <div key={ci} className="oc-criterion-group">
          <div className="oc-criterion-header">
            <span className={`oc-criterion-type oc-type-${ac.criterion.type}`}>
              {ac.criterion.type === 'concept' ? 'C' : 'E'}
            </span>
            <span className="oc-criterion-def">{ac.criterion.definition}</span>
            {ac.criterion.required && <span className="oc-criterion-req">obbligatorio</span>}
            <span className="oc-criterion-severity" title="Severita'">
              sev: {ac.criterion.severity > 0 ? '+' : ''}{ac.criterion.severity}
            </span>
          </div>
          <div className="oc-criterion-questions">
            {ac.boolean_questions.map((bq, qi) => (
              <BooleanQuestionRow
                key={qi}
                bq={bq}
                onChange={newBq => {
                  const newBqs = [...ac.boolean_questions]
                  newBqs[qi] = newBq
                  const newCriteria = [...criteria]
                  newCriteria[ci] = { ...ac, boolean_questions: newBqs }
                  onChange(newCriteria)
                }}
                onRequestCitation={() => onRequestCitation(ci, qi)}
                isCitationTarget={false}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ---- Rubric Grading ----

function RubricGrading({ grading, onChange }) {
  function setField(key, subkey, value) {
    onChange({ ...grading, [key]: { ...grading[key], [subkey]: value } })
  }
  function setDirect(key, value) {
    onChange({ ...grading, [key]: value })
  }

  function calcVoto() {
    const { i1, i2, i3 } = grading
    if (i1.level == null || i1.peso == null || i2.level == null || i2.peso == null || i3.level == null || i3.peso == null) {
      alert('Inserisci tutti i livelli e pesi prima di calcolare.')
      return
    }
    const totalPeso = i1.peso + i2.peso + i3.peso
    if (totalPeso === 0) { alert('La somma dei pesi non puo\' essere 0.'); return }
    const raw = (i1.level * i1.peso + i2.level * i2.peso + i3.level * i3.peso) / totalPeso
    // Scale from 1-5 to 1-10
    const voto = ((raw - 1) / 4) * 9 + 1
    const formatted = grading.formattazione || 0
    setDirect('votoFinale', Math.round((voto + formatted) * 10) / 10)
  }

  const [expandedIndicator, setExpandedIndicator] = useState(null)

  return (
    <div className="oc-rubric">
      <h4>Griglia di valutazione</h4>
      {['i1', 'i2', 'i3'].map(key => {
        const info = rubricLevels[key]
        const g = grading[key]
        return (
          <div key={key} className="oc-rubric-indicator">
            <div className="oc-rubric-indicator-header">
              <strong>{info.label}</strong>
              <button
                className="oc-rubric-expand"
                onClick={() => setExpandedIndicator(expandedIndicator === key ? null : key)}
              >{expandedIndicator === key ? '▲' : '▼'}</button>
            </div>
            {expandedIndicator === key && (
              <div className="oc-rubric-levels-desc">
                {info.levels.map(l => (
                  <div key={l.value} className={`oc-rubric-level-desc${g.level === l.value ? ' selected' : ''}`}
                    onClick={() => setField(key, 'level', l.value)}>
                    <strong>{l.value}</strong> — {l.desc}
                  </div>
                ))}
              </div>
            )}
            <div className="oc-rubric-row">
              <div className="oc-rubric-level-btns">
                {info.levels.map(l => (
                  <button
                    key={l.value}
                    className={`oc-rubric-lvl-btn${g.level === l.value ? ' active' : ''}`}
                    onClick={() => setField(key, 'level', l.value)}
                    title={l.desc}
                  >{l.value}</button>
                ))}
              </div>
              <label className="oc-rubric-peso">
                Peso
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={g.peso ?? ''}
                  onChange={e => setField(key, 'peso', e.target.value === '' ? null : parseFloat(e.target.value))}
                />
              </label>
            </div>
          </div>
        )
      })}

      <div className="oc-rubric-extras">
        <label className="oc-rubric-field">
          Formattazione
          <input
            type="number"
            step="0.1"
            value={grading.formattazione ?? ''}
            onChange={e => setDirect('formattazione', e.target.value === '' ? null : parseFloat(e.target.value))}
          />
        </label>
        <div className="oc-rubric-voto">
          <label className="oc-rubric-field">
            Voto finale
            <input
              type="number"
              step="0.1"
              min="1"
              max="10"
              value={grading.votoFinale ?? ''}
              onChange={e => setDirect('votoFinale', e.target.value === '' ? null : parseFloat(e.target.value))}
            />
          </label>
          <button className="oc-calc-btn" onClick={calcVoto}>Calcola</button>
        </div>
      </div>
    </div>
  )
}

// ---- Main correction form ----

function OpenCorrectionForm({ question, testTitle, qIndex, editingCorrection, onSave, onCancel }) {
  const [correction, setCorrection] = useState(() =>
    editingCorrection || buildEmptyCorrection(question, testTitle, qIndex)
  )
  const [citationTarget, setCitationTarget] = useState(null)

  // Collect all citations for highlighting
  const allCitations = []
  correction.criteria.forEach(ac => {
    ac.boolean_questions.forEach(bq => {
      bq.citations.forEach(c => { if (!allCitations.includes(c)) allCitations.push(c) })
    })
  })
  correction.penmarks.forEach(p => {
    p.citations.forEach(c => { if (!allCitations.includes(c)) allCitations.push(c) })
  })

  function handleAddCitation(text) {
    if (!citationTarget) return
    const { criterionIndex, questionIndex } = citationTarget
    const newCriteria = [...correction.criteria]
    const bqs = [...newCriteria[criterionIndex].boolean_questions]
    const bq = { ...bqs[questionIndex] }
    if (!bq.citations.includes(text)) {
      bq.citations = [...bq.citations, text]
    }
    bqs[questionIndex] = bq
    newCriteria[criterionIndex] = { ...newCriteria[criterionIndex], boolean_questions: bqs }
    setCorrection(c => ({ ...c, criteria: newCriteria }))
    setCitationTarget(null)
  }

  function handleRequestCitation(ci, qi) {
    setCitationTarget({
      criterionIndex: ci,
      questionIndex: qi,
      question: correction.criteria[ci].boolean_questions[qi].question
    })
  }

  return (
    <div className="oc-form">
      <div className="oc-form-header">
        <div className="oc-form-title">
          <h3>{testTitle}</h3>
          <p className="oc-form-question-text">{correction.questionText}</p>
        </div>
        <label className="oc-student-label">
          Studente
          <input
            type="text"
            value={correction.studente}
            onChange={e => setCorrection(c => ({ ...c, studente: e.target.value }))}
            placeholder="Nome e Cognome"
            className="oc-student-input"
            autoFocus
          />
        </label>
      </div>

      <div className="oc-main-grid">
        <StudentAnswerPanel
          answer={correction.studentAnswer}
          onChangeAnswer={val => setCorrection(c => ({ ...c, studentAnswer: val }))}
          allCitations={allCitations}
          citationTarget={citationTarget}
          onAddCitation={handleAddCitation}
        />
        <CriteriaPanel
          criteria={correction.criteria}
          onChange={newCriteria => setCorrection(c => ({ ...c, criteria: newCriteria }))}
          onRequestCitation={handleRequestCitation}
        />
      </div>

      <RubricGrading
        grading={correction.grading}
        onChange={newGrading => setCorrection(c => ({ ...c, grading: newGrading }))}
      />

      <div className="oc-actions">
        <button className="oc-btn-save" onClick={() => {
          if (!correction.studente.trim()) { alert('Inserisci il nome dello studente.'); return }
          onSave({ ...correction, date: new Date().toISOString() })
        }}>
          {editingCorrection ? 'Aggiorna' : 'Salva'}
        </button>
        {onCancel && <button className="oc-btn-cancel" onClick={onCancel}>Annulla</button>}
      </div>
    </div>
  )
}

// ---- Corrections List ----

function OpenCorrectionsList({ corrections, onEdit, onDelete, onExport }) {
  if (!corrections.length) return <p className="correction-empty">Nessuna correzione aperta salvata.</p>

  const byTest = {}
  corrections.forEach(c => {
    const key = `${c.testTitle}||${c.questionIndex}`
    if (!byTest[key]) byTest[key] = { title: c.testTitle, qIndex: c.questionIndex, qText: c.questionText, items: [] }
    byTest[key].items.push(c)
  })

  return (
    <div className="corrections-list">
      {Object.values(byTest).map(group => (
        <div key={`${group.title}-${group.qIndex}`} className="corrections-test-group">
          <h3>{group.title} — D{group.qIndex + 1}</h3>
          <p className="oc-list-qtext">{group.qText}</p>
          <table className="corrections-table">
            <thead>
              <tr>
                <th>Studente</th>
                <th>I1</th>
                <th>I2</th>
                <th>I3</th>
                <th>Voto</th>
                <th>Data</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {group.items.sort((a, b) => a.studente.localeCompare(b.studente)).map(c => (
                <tr key={c.id}>
                  <td>{c.studente}</td>
                  <td>{c.grading.i1.level ?? '-'}</td>
                  <td>{c.grading.i2.level ?? '-'}</td>
                  <td>{c.grading.i3.level ?? '-'}</td>
                  <td><strong>{c.grading.votoFinale ?? '-'}</strong></td>
                  <td>{new Date(c.date).toLocaleDateString('it-IT')}</td>
                  <td className="corrections-actions-cell">
                    <button onClick={() => onEdit(c)}>Modifica</button>
                    <button onClick={() => onDelete(c.id)}>Elimina</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button className="correction-btn-export" onClick={() => onExport(group)}>Esporta CSV</button>
        </div>
      ))}
    </div>
  )
}

// ---- Question Picker (only open questions) ----

function QuestionPicker({ testData, onSelect }) {
  const openQuestions = testData.questions
    .map((q, i) => ({ ...q, index: i }))
    .filter(q => q.type === 'open')

  if (!openQuestions.length) {
    return <p className="correction-empty">Questo test non contiene domande a risposta aperta.</p>
  }

  return (
    <div className="oc-question-picker">
      <h3>Seleziona una domanda aperta</h3>
      <div className="oc-question-list">
        {openQuestions.map(q => {
          const text = q.text || q.content?.find(c => c.kind === 'text')?.value || '(nessun testo)'
          return (
            <div key={q.index} className="oc-question-card" onClick={() => onSelect(q, q.index)}>
              <span className="oc-question-card-num">D{q.index + 1}</span>
              <span className="oc-question-card-text">{text}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ---- Main Page ----

export default function OpenCorrectionPage() {
  const [testData, setTestData] = useState(null)
  const [corrections, setCorrections] = useState(loadCorrections)
  const [editing, setEditing] = useState(null)
  const [selectedQuestion, setSelectedQuestion] = useState(null)
  const [view, setView] = useState('list')

  useEffect(() => { saveCorrections(corrections) }, [corrections])

  function handleSave(correction) {
    setCorrections(prev => {
      const idx = prev.findIndex(c => c.id === correction.id)
      if (idx >= 0) { const u = [...prev]; u[idx] = correction; return u }
      return [...prev, correction]
    })
    setView('list')
    setEditing(null)
    setSelectedQuestion(null)
  }

  function handleDelete(id) {
    if (!confirm('Eliminare questa correzione?')) return
    setCorrections(prev => prev.filter(c => c.id !== id))
  }

  function handleExportCSV(group) {
    if (!group.items.length) return
    const header = ['Studente', 'I1_Liv', 'I1_Peso', 'I2_Liv', 'I2_Peso', 'I3_Liv', 'I3_Peso', 'Formattazione', 'Voto_Finale']
    const rows = group.items
      .sort((a, b) => a.studente.localeCompare(b.studente))
      .map(c => [
        c.studente,
        c.grading.i1.level ?? '', c.grading.i1.peso ?? '',
        c.grading.i2.level ?? '', c.grading.i2.peso ?? '',
        c.grading.i3.level ?? '', c.grading.i3.peso ?? '',
        c.grading.formattazione ?? '',
        c.grading.votoFinale ?? ''
      ])
    const csv = [header, ...rows].map(r => r.join(';')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `correzione-aperta-${group.title.replace(/\s+/g, '-')}-D${group.qIndex + 1}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="correction-page">
      <div className="toolbar no-print">
        <div className="toolbar-group">
          <button className={view === 'list' ? 'toolbar-btn-primary' : ''} onClick={() => { setView('list'); setEditing(null); setSelectedQuestion(null) }}>Correzioni</button>
          <button className={view === 'new' ? 'toolbar-btn-primary' : ''} onClick={() => { setView('new'); setEditing(null); setSelectedQuestion(null); setTestData(null) }}>Nuova correzione</button>
        </div>
        <div className="toolbar-divider" />
        <div className="toolbar-group">
          <button onClick={() => { window.location.hash = '#/' }}>Stampa</button>
          <button onClick={() => { window.location.hash = '#/correction' }}>Correzione rapida</button>
          <button onClick={() => { window.location.hash = '#/manipulate' }}>Manipola</button>
        </div>
      </div>

      {view === 'list' && (
        <div className="correction-container">
          <OpenCorrectionsList
            corrections={corrections}
            onEdit={c => { setEditing(c); setView('edit') }}
            onDelete={handleDelete}
            onExport={handleExportCSV}
          />
        </div>
      )}

      {view === 'edit' && editing && (
        <div className="correction-container oc-wide">
          <OpenCorrectionForm
            question={{ text: editing.questionText }}
            testTitle={editing.testTitle}
            qIndex={editing.questionIndex}
            editingCorrection={editing}
            onSave={handleSave}
            onCancel={() => { setView('list'); setEditing(null) }}
          />
        </div>
      )}

      {view === 'new' && !testData && (
        <div className="correction-container">
          <FilePicker onTestLoaded={setTestData} />
        </div>
      )}

      {view === 'new' && testData && !selectedQuestion && (
        <div className="correction-container">
          <QuestionPicker testData={testData} onSelect={(q, idx) => setSelectedQuestion({ q, idx })} />
        </div>
      )}

      {view === 'new' && testData && selectedQuestion && (
        <div className="correction-container oc-wide">
          <OpenCorrectionForm
            question={selectedQuestion.q}
            testTitle={testData.title}
            qIndex={selectedQuestion.idx}
            onSave={handleSave}
            onCancel={() => { setView('list'); setSelectedQuestion(null) }}
          />
        </div>
      )}
    </div>
  )
}
