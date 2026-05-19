import { useState, useEffect, useRef } from 'react'
import CodeBlock from '@/components/shared/CodeBlock'
import MermaidDiagram from '@/components/shared/MermaidDiagram'
import GanttChart from '@/components/shared/GanttChart'
import { validateTest, isConceptSeparator, isQuestionGroup } from '@/schema'
import { saveTestFile, saveTestVersion } from '@/api'

/** Fields injected by the backend on test load. Stripped before writing JSON. */
const BACKEND_META_FIELDS = [
  'id',
  'filePath',
  'versionId',
  'versionValid',
  'versionErrors',
  'versionCreatedAt',
  'sync',
]

function stripBackendMeta(testData) {
  const clean = { ...testData }
  for (const k of BACKEND_META_FIELDS) delete clean[k]
  return clean
}

/** @typedef {import('@/schema').TestData} TestData */
/** @typedef {import('@/schema').Question} Question */
/** @typedef {import('@/schema').ConceptGroup} ConceptGroup */

function EditableText({ value, onChange, tag: Tag = 'span', className = '', multiline = false }) {
  if (multiline) {
    return (
      <textarea
        className={`editable editable-textarea ${className}`}
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={Math.max(2, value.split('\n').length)}
      />
    )
  }
  return (
    <Tag
      className={`editable ${className}`}
      contentEditable
      suppressContentEditableWarning
      onBlur={e => onChange(e.currentTarget.textContent)}
      dangerouslySetInnerHTML={{ __html: value }}
    />
  )
}

function moveItem(arr, from, delta) {
  const to = from + delta
  if (to < 0 || to >= arr.length) return arr
  const next = [...arr]
  ;[next[from], next[to]] = [next[to], next[from]]
  return next
}

function ReorderButtons({ index, total, onMove }) {
  return (
    <div className="reorder-btns">
      <button className="btn-icon" onClick={() => onMove(-1)} disabled={index === 0} title="Sposta su">↑</button>
      <button className="btn-icon" onClick={() => onMove(1)} disabled={index === total - 1} title="Sposta giù">↓</button>
    </div>
  )
}

function defaultBlock(kind) {
  switch (kind) {
    case 'code': return { kind: 'code', language: 'python', value: '# codice' }
    case 'mermaid': return { kind: 'mermaid', value: 'graph TD\n    A-->B' }
    case 'gantt': return { kind: 'gantt', slices: [{ pid: 'P1', duration: 3 }, { pid: 'P2', duration: 2 }] }
    case 'table': return {
      kind: 'table',
      headers: ['Colonna 1', 'Colonna 2'],
      rows: [['', ''], ['', '']],
    }
    default: return { kind: 'text', value: 'Nuovo testo' }
  }
}

/** Normalize a slice to `{ pid, duration }` (handles legacy start/end shape). */
function normalizeSlice(s) {
  if (typeof s?.duration === 'number') return { pid: s.pid ?? '', duration: Math.max(0, s.duration) }
  if (typeof s?.start === 'number' && typeof s?.end === 'number') {
    return { pid: s.pid ?? '', duration: Math.max(0, s.end - s.start) }
  }
  return { pid: s?.pid ?? '', duration: 0 }
}

function GanttSlicesEditor({ slices, onChange }) {
  const normalized = slices.map(normalizeSlice)
  function update(next) {
    onChange(next)
  }
  function updateSlice(i, patch) {
    update(normalized.map((s, idx) => (idx === i ? { ...s, ...patch } : s)))
  }
  function removeSlice(i) {
    update(normalized.filter((_, idx) => idx !== i))
  }
  function addSlice() {
    update([...normalized, { pid: `P${normalized.length + 1}`, duration: 2 }])
  }
  // Compute cumulative start for display.
  let cursor = 0
  const withStart = normalized.map(s => {
    const start = cursor
    cursor += s.duration
    return { ...s, start, end: cursor }
  })
  return (
    <div className="editor-gantt">
      <GanttChart slices={normalized} />
      <div className="editor-gantt-rows">
        {withStart.map((s, i) => (
          <div key={i} className="editor-gantt-row">
            <input
              className="editable editable-inline"
              value={s.pid}
              onChange={e => updateSlice(i, { pid: e.target.value })}
              placeholder="pid"
            />
            <input
              type="number"
              min="0"
              step="1"
              className="editable editable-inline"
              value={s.duration}
              onChange={e => updateSlice(i, { duration: Math.max(0, parseFloat(e.target.value) || 0) })}
              placeholder="durata"
              title="Durata della slice"
            />
            <span className="editor-gantt-range">[{s.start} → {s.end}]</span>
            {normalized.length > 1 && (
              <button className="btn-icon btn-remove" onClick={() => removeSlice(i)} title="Rimuovi slice">x</button>
            )}
          </div>
        ))}
        <button className="btn-small" onClick={addSlice}>+ Slice</button>
      </div>
    </div>
  )
}

function TableEditor({ block, onChange }) {
  const headers = Array.isArray(block.headers) ? block.headers : []
  const rows = Array.isArray(block.rows) ? block.rows : []
  const colCount = Math.max(headers.length, ...rows.map(r => r.length), 1)

  function setHeaders(next) {
    onChange({ ...block, headers: next })
  }
  function setRows(next) {
    onChange({ ...block, rows: next })
  }
  function updateHeader(i, value) {
    const next = [...headers]
    while (next.length < colCount) next.push('')
    next[i] = value
    setHeaders(next)
  }
  function updateCell(r, c, value) {
    const next = rows.map(row => {
      const padded = [...row]
      while (padded.length < colCount) padded.push('')
      return padded
    })
    next[r] = [...next[r]]
    next[r][c] = value
    setRows(next)
  }
  function addRow() {
    setRows([...rows, Array.from({ length: colCount }, () => '')])
  }
  function removeRow(i) {
    if (rows.length <= 1) return
    setRows(rows.filter((_, idx) => idx !== i))
  }
  function addColumn() {
    const nextHeaders = [...headers]
    while (nextHeaders.length < colCount) nextHeaders.push('')
    nextHeaders.push(`Colonna ${nextHeaders.length + 1}`)
    setHeaders(nextHeaders)
    setRows(rows.map(r => [...r, '']))
  }
  function removeColumn(i) {
    if (colCount <= 1) return
    const nextHeaders = headers.filter((_, idx) => idx !== i)
    setHeaders(nextHeaders)
    setRows(rows.map(r => r.filter((_, idx) => idx !== i)))
  }
  function toggleHeaders() {
    if (headers.length === 0) {
      setHeaders(Array.from({ length: colCount }, (_, i) => `Colonna ${i + 1}`))
    } else {
      setHeaders([])
    }
  }

  return (
    <div className="editor-table">
      <div className="editor-table-controls">
        <label className="editor-table-toggle">
          <input
            type="checkbox"
            checked={headers.length > 0}
            onChange={toggleHeaders}
          />
          Intestazioni
        </label>
        <button className="btn-small" onClick={addColumn}>+ Colonna</button>
        <button className="btn-small" onClick={addRow}>+ Riga</button>
      </div>
      <div className="editor-table-scroll">
        <table className="editor-table-grid">
          {headers.length > 0 && (
            <thead>
              <tr>
                {Array.from({ length: colCount }).map((_, ci) => (
                  <th key={ci}>
                    <input
                      className="editable editable-inline editor-table-input"
                      value={headers[ci] ?? ''}
                      onChange={e => updateHeader(ci, e.target.value)}
                      placeholder={`Col ${ci + 1}`}
                    />
                    {colCount > 1 && (
                      <button
                        className="btn-icon btn-remove editor-table-col-remove"
                        onClick={() => removeColumn(ci)}
                        title="Rimuovi colonna"
                      >x</button>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri}>
                {Array.from({ length: colCount }).map((_, ci) => (
                  <td key={ci}>
                    <input
                      className="editable editable-inline editor-table-input"
                      value={row[ci] ?? ''}
                      onChange={e => updateCell(ri, ci, e.target.value)}
                    />
                  </td>
                ))}
                <td className="editor-table-row-actions">
                  {rows.length > 1 && (
                    <button
                      className="btn-icon btn-remove"
                      onClick={() => removeRow(ri)}
                      title="Rimuovi riga"
                    >x</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ContentEditor({ content, onChange }) {
  function updateBlock(i, newBlock) {
    const updated = [...content]
    updated[i] = newBlock
    onChange(updated)
  }

  function changeKind(i, newKind) {
    if (content[i].kind === newKind) return
    updateBlock(i, defaultBlock(newKind))
  }

  function addBlock(kind) {
    onChange([...content, defaultBlock(kind)])
  }

  function removeBlock(i) {
    onChange(content.filter((_, idx) => idx !== i))
  }

  return (
    <div className="editor-content-blocks">
      {content.map((block, i) => (
        <div key={i} className="editor-content-block">
          <div className="editor-block-controls">
            <select
              value={block.kind}
              onChange={e => changeKind(i, e.target.value)}
            >
              <option value="text">Testo</option>
              <option value="code">Codice</option>
              <option value="mermaid">Mermaid</option>
              <option value="gantt">Gantt</option>
              <option value="table">Tabella</option>
            </select>
            {block.kind === 'code' && (
              <input
                className="editable editable-inline"
                value={block.language || ''}
                onChange={e => updateBlock(i, { ...block, language: e.target.value })}
                placeholder="linguaggio"
              />
            )}
            <ReorderButtons index={i} total={content.length} onMove={d => onChange(moveItem(content, i, d))} />
            <button className="btn-icon btn-remove" onClick={() => removeBlock(i)} title="Rimuovi blocco">x</button>
          </div>
          {block.kind === 'gantt' ? (
            <GanttSlicesEditor
              slices={block.slices || []}
              onChange={slices => updateBlock(i, { ...block, slices })}
            />
          ) : block.kind === 'table' ? (
            <TableEditor
              block={block}
              onChange={next => updateBlock(i, next)}
            />
          ) : block.kind === 'text' ? (
            <EditableText
              value={block.value}
              onChange={v => updateBlock(i, { ...block, value: v })}
              tag="p"
              className="content-text"
            />
          ) : (
            <EditableText
              value={block.value}
              onChange={v => updateBlock(i, { ...block, value: v })}
              multiline
            />
          )}
          {block.kind === 'code' && <CodeBlock language={block.language} value={block.value} />}
          {block.kind === 'mermaid' && <MermaidDiagram value={block.value} id={`manip-${i}`} />}
        </div>
      ))}
      <div className="editor-add-block">
        <button onClick={() => addBlock('text')}>+ Testo</button>
        <button onClick={() => addBlock('code')}>+ Codice</button>
        <button onClick={() => addBlock('mermaid')}>+ Mermaid</button>
        <button onClick={() => addBlock('gantt')}>+ Gantt</button>
        <button onClick={() => addBlock('table')}>+ Tabella</button>
      </div>
    </div>
  )
}

function getContent(data) {
  if (Array.isArray(data.content)) return data.content
  if (data.text) return [{ kind: 'text', value: data.text }]
  return [{ kind: 'text', value: '' }]
}

function setContent(data, newContent) {
  if (newContent.length === 1 && newContent[0].kind === 'text') {
    const { content: _c, ...rest } = data
    return { ...rest, text: newContent[0].value }
  }
  const { text: _t, ...rest } = data
  return { ...rest, content: newContent }
}

function collectFillerBlanks(content) {
  const result = []
  content.forEach((block, blockIdx) => {
    if (block.kind !== 'text') return
    const matches = block.value.match(/_{2,}/g) || []
    matches.forEach(() => result.push(blockIdx))
  })
  return result
}

function SkipToggle({ data, onChange }) {
  return (
    <label className="editor-skip-toggle" title="Escludi questa domanda dal rendering e dal conteggio">
      <input
        type="checkbox"
        checked={!!data.skip}
        onChange={e => {
          const { skip: _s, ...rest } = data
          onChange(e.target.checked ? { ...rest, skip: true } : rest)
        }}
      />
      Skip
    </label>
  )
}

function TrueFalseEditor({ data, onChange, onRemove }) {
  const content = getContent(data)
  return (
    <div className={`editor-question-type${data.skip ? ' skipped' : ''}`}>
      <div className="editor-type-header">
        <span className="editor-type-badge tf">V/F</span>
        <div className="editor-tf-answer">
          <span className="editor-tf-answer-label">Risposta:</span>
          <button
            type="button"
            className={`btn-tf${data.answer === true ? ' active true' : ''}`}
            onClick={() => onChange({ ...data, answer: data.answer === true ? undefined : true })}
            title="Affermazione vera"
          >V</button>
          <button
            type="button"
            className={`btn-tf${data.answer === false ? ' active false' : ''}`}
            onClick={() => onChange({ ...data, answer: data.answer === false ? undefined : false })}
            title="Affermazione falsa"
          >F</button>
        </div>
        <SkipToggle data={data} onChange={onChange} />
        <button className="btn-icon btn-remove" onClick={onRemove} title="Rimuovi domanda">x</button>
      </div>
      <ContentEditor content={content} onChange={c => onChange(setContent(data, c))} />
    </div>
  )
}

function MultipleChoiceEditor({ data, onChange, onRemove }) {
  const multi = data.multi === true
  const content = getContent(data)

  function isCorrect(i) {
    return multi
      ? Array.isArray(data.answer) && data.answer.includes(i)
      : data.answer === i
  }

  function toggleMulti() {
    if (multi) {
      const first = Array.isArray(data.answer) && data.answer.length > 0 ? data.answer[0] : 0
      const { multi: _m, ...rest } = data
      onChange({ ...rest, answer: first })
    } else {
      const initial = typeof data.answer === 'number' ? [data.answer] : []
      onChange({ ...data, multi: true, answer: initial })
    }
  }

  function toggleAnswer(i) {
    if (multi) {
      const current = Array.isArray(data.answer) ? data.answer : []
      const next = current.includes(i)
        ? current.filter(x => x !== i)
        : [...current, i].sort((a, b) => a - b)
      onChange({ ...data, answer: next })
    } else {
      onChange({ ...data, answer: i })
    }
  }

  function removeOption(i) {
    const updated = data.options.filter((_, idx) => idx !== i)
    if (multi) {
      const current = Array.isArray(data.answer) ? data.answer : []
      const next = current.filter(x => x !== i).map(x => (x > i ? x - 1 : x))
      onChange({ ...data, options: updated, answer: next })
    } else {
      const newAnswer = data.answer >= updated.length
        ? updated.length - 1
        : data.answer > i ? data.answer - 1 : data.answer
      onChange({ ...data, options: updated, answer: newAnswer })
    }
  }

  return (
    <div className={`editor-question-type${data.skip ? ' skipped' : ''}`}>
      <div className="editor-type-header">
        <span className="editor-type-badge mc">Scelta multipla</span>
        <label className="editor-mc-multi-toggle" title="Permetti più risposte corrette">
          <input type="checkbox" checked={multi} onChange={toggleMulti} />
          Risposte multiple
        </label>
        <SkipToggle data={data} onChange={onChange} />
        <button className="btn-icon btn-remove" onClick={onRemove} title="Rimuovi domanda">x</button>
      </div>
      <ContentEditor content={content} onChange={c => onChange(setContent(data, c))} />
      <div className="editor-mc-options">
        {data.options.map((opt, i) => (
          <div key={i} className={`editor-mc-option ${isCorrect(i) ? 'correct' : ''}`}>
            <button
              className={`btn-correct ${isCorrect(i) ? 'active' : ''} ${multi ? 'multi' : ''}`}
              onClick={() => toggleAnswer(i)}
              title={multi ? 'Aggiungi/rimuovi dalle risposte corrette' : 'Segna come corretta'}
            >
              {String.fromCharCode(97 + i)})
            </button>
            <input
              className="editable editable-inline editable-flex"
              value={opt}
              onChange={e => {
                const updated = [...data.options]
                updated[i] = e.target.value
                onChange({ ...data, options: updated })
              }}
            />
            {data.options.length > 2 && (
              <button className="btn-icon btn-remove" onClick={() => removeOption(i)}>x</button>
            )}
          </div>
        ))}
        <button className="btn-small" onClick={() => onChange({ ...data, options: [...data.options, 'Nuova opzione'] })}>+ Opzione</button>
      </div>
    </div>
  )
}

function FillerEditor({ data, onChange, onRemove }) {
  const content = getContent(data)
  const blanks = collectFillerBlanks(content)
  const answers = Array.isArray(data.answer)
    ? data.answer
    : typeof data.answer === 'string' ? [data.answer] : []
  const blankSizes = Array.isArray(data.blankSize) ? data.blankSize : []

  function setAnswer(i, value) {
    const next = blanks.map((_, k) => (k === i ? value : (answers[k] ?? '')))
    onChange({ ...data, answer: next })
  }

  function setBlankSize(i, raw) {
    // Build a new blankSize array aligned with the current number of blanks.
    // Empty / invalid input falls back to undefined for that slot (default 10).
    const next = blanks.map((_, k) => {
      if (k === i) {
        if (raw === '' || raw == null) return undefined
        const n = parseInt(raw, 10)
        return Number.isInteger(n) && n >= 2 ? n : undefined
      }
      return blankSizes[k]
    })
    // If all entries are undefined, drop the field entirely to keep JSON clean.
    if (next.every(v => v === undefined)) {
      const { blankSize: _b, ...rest } = data
      onChange(rest)
    } else {
      onChange({ ...data, blankSize: next })
    }
  }

  return (
    <div className={`editor-question-type${data.skip ? ' skipped' : ''}`}>
      <div className="editor-type-header">
        <span className="editor-type-badge filler">Completamento</span>
        <SkipToggle data={data} onChange={onChange} />
        <button className="btn-icon btn-remove" onClick={onRemove} title="Rimuovi domanda">x</button>
      </div>
      <ContentEditor content={content} onChange={c => onChange(setContent(data, c))} />
      {blanks.length > 0 ? (
        <div className="editor-filler-answers">
          {blanks.map((_, i) => (
            <label key={i} className="editor-filler-answer">
              <span>Soluzione blank #{i + 1}</span>
              <div className="editor-filler-row">
                <input
                  className="editable editable-inline editor-filler-answer-input"
                  value={answers[i] ?? ''}
                  onChange={e => setAnswer(i, e.target.value)}
                />
                <span className="editor-filler-width">
                  larghezza
                  <input
                    type="number"
                    min="2"
                    step="1"
                    className="editable editable-inline"
                    value={blankSizes[i] ?? ''}
                    placeholder="10"
                    title="Numero di underscore del blank in stampa. Default 10."
                    onChange={e => setBlankSize(i, e.target.value)}
                  />
                </span>
              </div>
            </label>
          ))}
        </div>
      ) : (
        <p className="editor-filler-hint">
          Inserisci almeno un blank con <code>____</code> (≥2 underscore) in un blocco di testo per definire le soluzioni.
        </p>
      )}
    </div>
  )
}

function OpenEditor({ data, onChange, onRemove }) {
  const lines = data.linesNumber ?? 2
  const content = getContent(data)
  return (
    <div className={`editor-question-type${data.skip ? ' skipped' : ''}`}>
      <div className="editor-type-header">
        <span className="editor-type-badge open">Aperta</span>
        <label className="editor-open-lines" title="Righe vuote riservate sullo sheet stampato">
          Righe
          <input
            type="number"
            min="1"
            max="40"
            value={lines}
            onChange={e => {
              const n = parseInt(e.target.value, 10)
              if (Number.isInteger(n) && n >= 1) onChange({ ...data, linesNumber: n })
            }}
          />
        </label>
        <SkipToggle data={data} onChange={onChange} />
        <button className="btn-icon btn-remove" onClick={onRemove} title="Rimuovi domanda">x</button>
      </div>
      <ContentEditor content={content} onChange={c => onChange(setContent(data, c))} />
    </div>
  )
}

function QuestionEditor({ question, onChange, onRemove }) {
  switch (question.type) {
    case 'trueFalse':
      return <TrueFalseEditor data={question} onChange={onChange} onRemove={onRemove} />
    case 'multipleChoice':
      return <MultipleChoiceEditor data={question} onChange={onChange} onRemove={onRemove} />
    case 'filler':
      return <FillerEditor data={question} onChange={onChange} onRemove={onRemove} />
    case 'open':
      return <OpenEditor data={question} onChange={onChange} onRemove={onRemove} />
    default:
      return <div className="editor-question-type">Tipo sconosciuto: {question.type}</div>
  }
}

const ITEM_DEFAULTS = {
  separator:      { concept: 'Nuovo argomento' },
  group:          { questions: [] },
  trueFalse:      { type: 'trueFalse', text: 'Affermazione.', answer: true },
  multipleChoice: { type: 'multipleChoice', text: 'Domanda?', options: ['Opzione A', 'Opzione B', 'Opzione C', 'Opzione D'], answer: 0 },
  filler:         { type: 'filler', text: 'Completa la ____.' },
  open:           { type: 'open', text: 'Domanda aperta?', linesNumber: 2 },
}

function InsertSlot({ onInsert, questionsOnly = false }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    function onMouseDown(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [open])

  function insert(key) {
    onInsert({ ...ITEM_DEFAULTS[key] })
    setOpen(false)
  }

  return (
    <div className={`insert-slot${open ? ' insert-slot--open' : ''}`} ref={ref}>
      <button className="insert-slot-btn" title="Inserisci qui" onClick={() => setOpen(v => !v)}>+</button>
      {open && (
        <div className="insert-slot-menu">
          {!questionsOnly && (
            <>
              <button onClick={() => insert('separator')}>§ Separatore</button>
              <button onClick={() => insert('group')}>Gruppo</button>
            </>
          )}
          <button onClick={() => insert('trueFalse')}>Vero/Falso</button>
          <button onClick={() => insert('multipleChoice')}>Scelta multipla</button>
          <button onClick={() => insert('filler')}>Completamento</button>
          <button onClick={() => insert('open')}>Aperta</button>
        </div>
      )}
    </div>
  )
}

function ConceptSeparatorEditor({ item, onChange, onRemove }) {
  return (
    <div className="editor-separator">
      <span className="editor-separator-icon">§</span>
      <EditableText
        value={item.concept}
        onChange={v => onChange({ ...item, concept: v })}
        tag="strong"
        className="editor-concept-title"
      />
      <button className="btn-icon btn-remove" onClick={onRemove} title="Rimuovi separatore">x</button>
    </div>
  )
}

function QuestionGroupEditor({ group, onChange, onRemove }) {
  function updateQuestion(i, updated) {
    const qs = [...group.questions]
    qs[i] = updated
    onChange({ ...group, questions: qs })
  }

  function removeQuestion(i) {
    onChange({ ...group, questions: group.questions.filter((_, idx) => idx !== i) })
  }

  function insertInGroup(index, item) {
    const qs = [...group.questions]
    qs.splice(index, 0, item)
    onChange({ ...group, questions: qs })
  }

  const sharedContent = Array.isArray(group.content) ? group.content : []

  return (
    <div className="editor-concept">
      <div className="editor-concept-header">
        <span className="editor-type-badge" style={{ background: '#e8f0fe', color: '#3a5fcc' }}>Gruppo</span>
        <button className="btn-icon btn-remove" onClick={onRemove} title="Rimuovi gruppo">x</button>
      </div>
      <ContentEditor
        content={sharedContent}
        onChange={c => onChange({ ...group, content: c.length ? c : undefined })}
      />
      {group.questions.flatMap((q, i) => [
        <InsertSlot key={`slot-${i}`} questionsOnly onInsert={item => insertInGroup(i, item)} />,
        <div key={`item-${i}`} className="editor-question-row">
          <ReorderButtons index={i} total={group.questions.length} onMove={d => onChange({ ...group, questions: moveItem(group.questions, i, d) })} />
          <QuestionEditor
            question={q}
            onChange={v => updateQuestion(i, v)}
            onRemove={() => removeQuestion(i)}
          />
        </div>,
      ])}
      <InsertSlot questionsOnly onInsert={item => insertInGroup(group.questions.length, item)} />
    </div>
  )
}

export default function ManipulatorPage({ test = null, onTestChange } = {}) {
  const [testData, setTestData] = useState(test)
  const [saveStatus, setSaveStatus] = useState('')
  const [saving, setSaving] = useState(false)
  const seededIdRef = useRef(test?.id ?? null)

  function updateTestData(updated) {
    setTestData(updated)
    onTestChange?.(updated)
  }

  // Re-seed only when a different test is selected (different id).
  useEffect(() => {
    if (test && test.id !== seededIdRef.current) {
      seededIdRef.current = test.id
      setTestData(test)
    }
  }, [test])

  function describeStatus(prefix, status) {
    if (status === 'new-version') return `${prefix} (nuova versione)`
    if (status === 'unchanged') return `${prefix} (invariato)`
    return prefix
  }

  /** Validates locally and overwrites the JSON file on disk via the backend. */
  async function handleOverwriteFile() {
    if (!testData?.id) return
    const clean = stripBackendMeta(testData)
    try {
      validateTest(clean)
    } catch (err) {
      setSaveStatus('✗ Validazione: ' + (err instanceof Error ? err.message : String(err)))
      return
    }
    setSaving(true)
    setSaveStatus('Sovrascrittura file…')
    try {
      const result = await saveTestFile(testData.id, clean)
      setSaveStatus('✓ File ' + describeStatus('sovrascritto', result?.sync?.status))
    } catch (e) {
      setSaveStatus('✗ ' + (e instanceof Error ? e.message : String(e)))
    } finally {
      setSaving(false)
    }
  }

  /** Saves a new TestVersion in the DB without touching the file on disk. */
  async function handleSaveVersion() {
    if (!testData?.id) return
    const clean = stripBackendMeta(testData)
    try {
      validateTest(clean)
    } catch (err) {
      setSaveStatus('✗ Validazione: ' + (err instanceof Error ? err.message : String(err)))
      return
    }
    setSaving(true)
    setSaveStatus('Salvataggio versione…')
    try {
      const result = await saveTestVersion(testData.id, clean)
      setSaveStatus('✓ Versione ' + describeStatus('salvata', result?.status))
    } catch (e) {
      setSaveStatus('✗ ' + (e instanceof Error ? e.message : String(e)))
    } finally {
      setSaving(false)
    }
  }

  function updateConceptGroup(i, updated) {
    const groups = [...testData.questions]
    groups[i] = updated
    updateTestData({ ...testData, questions: groups })
  }

  function removeConceptGroup(i) {
    updateTestData({ ...testData, questions: testData.questions.filter((_, idx) => idx !== i) })
  }

  function insertAt(index, item) {
    const qs = [...testData.questions]
    qs.splice(index, 0, item)
    updateTestData({ ...testData, questions: qs })
  }

  function addConceptSeparator() {
    updateTestData({ ...testData, questions: [...testData.questions, { ...ITEM_DEFAULTS.separator }] })
  }

  function addQuestionGroup() {
    updateTestData({ ...testData, questions: [...testData.questions, { ...ITEM_DEFAULTS.group }] })
  }

  function addQuestion(type) {
    updateTestData({ ...testData, questions: [...testData.questions, { ...ITEM_DEFAULTS[type] }] })
  }

  if (!testData) {
    return (
      <div className="editor-empty">
        <p>Nessun test caricato. Torna alla libreria per selezionarne uno.</p>
      </div>
    )
  }

  const canSave = !!testData?.id && !saving

  return (
    <div className="editor-page">
      <div className="toolbar no-print">
        <button
          className="toolbar-btn-primary"
          onClick={handleOverwriteFile}
          disabled={!canSave}
          title="Sovrascrivi il file JSON originale sul filesystem (e cattura una versione)"
        >
          💾 Sovrascrivi file su disco
        </button>
        <button
          onClick={handleSaveVersion}
          disabled={!canSave}
          title="Salva una nuova versione nel database senza toccare il file su disco"
        >
          📚 Salva versione (DB)
        </button>
        {saveStatus && (
          <span className="manipulator-file-status">{saveStatus}</span>
        )}
      </div>

      <div className="editor-sheet">
        <div className="editor-meta">
          <label>
            <span className="editor-label">Titolo:</span>
            <input
              className="editable editable-large"
              value={testData.title}
              onChange={e => updateTestData({ ...testData, title: e.target.value })}
            />
          </label>
          <label>
            <span className="editor-label">Sottotitolo:</span>
            <input
              className="editable editable-inline"
              value={testData.subtitle || ''}
              onChange={e => updateTestData({ ...testData, subtitle: e.target.value })}
            />
          </label>
          <label>
            <span className="editor-label">Istruzioni:</span>
            <textarea
              className="editable editable-textarea"
              value={testData.instructions || ''}
              onChange={e => updateTestData({ ...testData, instructions: e.target.value })}
              rows={2}
            />
          </label>
        </div>

        {testData.questions.flatMap((item, i) => [
          <InsertSlot key={`slot-${i}`} onInsert={it => insertAt(i, it)} />,
          <div key={`item-${i}`} className="editor-question-row">
            <ReorderButtons index={i} total={testData.questions.length} onMove={d => updateTestData({ ...testData, questions: moveItem(testData.questions, i, d) })} />
            {isConceptSeparator(item)
              ? <ConceptSeparatorEditor
                  item={item}
                  onChange={v => updateConceptGroup(i, v)}
                  onRemove={() => removeConceptGroup(i)}
                />
              : isQuestionGroup(item)
                ? <QuestionGroupEditor
                    group={item}
                    onChange={v => updateConceptGroup(i, v)}
                    onRemove={() => removeConceptGroup(i)}
                  />
                : <QuestionEditor
                    question={item}
                    onChange={v => updateConceptGroup(i, v)}
                    onRemove={() => removeConceptGroup(i)}
                  />}
          </div>,
        ])}

        <div className="editor-add-block">
          <button className="btn-small" onClick={addConceptSeparator}>§ Separatore</button>
          <button className="btn-small" onClick={addQuestionGroup}>+ Gruppo</button>
          <button className="btn-small" onClick={() => addQuestion('trueFalse')}>+ Vero/Falso</button>
          <button className="btn-small" onClick={() => addQuestion('multipleChoice')}>+ Scelta multipla</button>
          <button className="btn-small" onClick={() => addQuestion('filler')}>+ Completamento</button>
          <button className="btn-small" onClick={() => addQuestion('open')}>+ Aperta</button>
        </div>
      </div>
    </div>
  )
}
