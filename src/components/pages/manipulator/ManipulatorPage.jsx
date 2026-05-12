import { useState, useRef, useEffect } from 'react'
import CodeBlock from '@/components/shared/CodeBlock'
import MermaidDiagram from '@/components/shared/MermaidDiagram'
import GanttChart from '@/components/shared/GanttChart'
import { validateTest } from '@/schema'

/** @typedef {import('@/schema').TestData} TestData */
/** @typedef {import('@/schema').Question} Question */
/** @typedef {import('@/schema').ConceptGroup} ConceptGroup */

const DRAFTS_KEY = 'tpsit-manipulator-drafts'

function loadDrafts() {
  try { return JSON.parse(localStorage.getItem(DRAFTS_KEY)) || {} }
  catch { return {} }
}

function persistDrafts(drafts) {
  localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts))
}

function uniqueName(base, drafts) {
  const trimmed = (base || 'Senza titolo').trim() || 'Senza titolo'
  if (!drafts[trimmed]) return trimmed
  let n = 2
  while (drafts[`${trimmed} (${n})`]) n++
  return `${trimmed} (${n})`
}

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

function defaultBlock(kind) {
  switch (kind) {
    case 'code': return { kind: 'code', language: 'python', value: '# codice' }
    case 'mermaid': return { kind: 'mermaid', value: 'graph TD\n    A-->B' }
    case 'gantt': return { kind: 'gantt', slices: [{ pid: 'P1', start: 0, end: 3 }, { pid: 'P2', start: 3, end: 5 }] }
    default: return { kind: 'text', value: 'Nuovo testo' }
  }
}

function GanttSlicesEditor({ slices, onChange }) {
  function updateSlice(i, patch) {
    const next = slices.map((s, idx) => (idx === i ? { ...s, ...patch } : s))
    onChange(next)
  }
  function removeSlice(i) {
    onChange(slices.filter((_, idx) => idx !== i))
  }
  function addSlice() {
    const last = slices[slices.length - 1]
    const start = last ? last.end : 0
    onChange([...slices, { pid: `P${slices.length + 1}`, start, end: start + 2 }])
  }
  return (
    <div className="editor-gantt">
      <GanttChart slices={slices} />
      <div className="editor-gantt-rows">
        {slices.map((s, i) => (
          <div key={i} className="editor-gantt-row">
            <input
              className="editable editable-inline"
              value={s.pid}
              onChange={e => updateSlice(i, { pid: e.target.value })}
              placeholder="pid"
            />
            <input
              type="number"
              className="editable editable-inline"
              value={s.start}
              onChange={e => updateSlice(i, { start: parseFloat(e.target.value) || 0 })}
              placeholder="start"
            />
            <input
              type="number"
              className="editable editable-inline"
              value={s.end}
              onChange={e => updateSlice(i, { end: parseFloat(e.target.value) || 0 })}
              placeholder="end"
            />
            {slices.length > 1 && (
              <button className="btn-icon btn-remove" onClick={() => removeSlice(i)} title="Rimuovi slice">x</button>
            )}
          </div>
        ))}
        <button className="btn-small" onClick={addSlice}>+ Slice</button>
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
            </select>
            {block.kind === 'code' && (
              <input
                className="editable editable-inline"
                value={block.language || ''}
                onChange={e => updateBlock(i, { ...block, language: e.target.value })}
                placeholder="linguaggio"
              />
            )}
            <button className="btn-icon btn-remove" onClick={() => removeBlock(i)} title="Rimuovi blocco">x</button>
          </div>
          {block.kind === 'gantt' ? (
            <GanttSlicesEditor
              slices={block.slices || []}
              onChange={slices => updateBlock(i, { ...block, slices })}
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

  function setAnswer(i, value) {
    const next = blanks.map((_, k) => (k === i ? value : (answers[k] ?? '')))
    onChange({ ...data, answer: next })
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
              <input
                className="editable editable-inline"
                value={answers[i] ?? ''}
                onChange={e => setAnswer(i, e.target.value)}
              />
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

function ConceptGroupEditor({ group, onChange, onRemove }) {
  function updateQuestion(i, updated) {
    const qs = [...group.questions]
    qs[i] = updated
    onChange({ ...group, questions: qs })
  }

  function removeQuestion(i) {
    onChange({ ...group, questions: group.questions.filter((_, idx) => idx !== i) })
  }

  function addQuestion(type) {
    const defaults = {
      trueFalse: { type: 'trueFalse', text: 'Affermazione.', answer: true },
      multipleChoice: { type: 'multipleChoice', text: 'Domanda?', options: ['Opzione A', 'Opzione B', 'Opzione C', 'Opzione D'], answer: 0 },
      filler: { type: 'filler', text: 'Completa la ____.' },
      open: { type: 'open', text: 'Domanda aperta?', linesNumber: 2 },
    }
    onChange({ ...group, questions: [...group.questions, defaults[type]] })
  }

  return (
    <div className="editor-concept">
      <div className="editor-concept-header">
        <EditableText
          value={group.concept}
          onChange={v => onChange({ ...group, concept: v })}
          tag="strong"
          className="editor-concept-title"
        />
        <button className="btn-icon btn-remove" onClick={onRemove} title="Rimuovi concetto">x</button>
      </div>
      {group.questions.map((q, i) => (
        <QuestionEditor
          key={i}
          question={q}
          onChange={v => updateQuestion(i, v)}
          onRemove={() => removeQuestion(i)}
        />
      ))}
      <div className="editor-add-block">
        <button onClick={() => addQuestion('trueFalse')}>+ Vero/Falso</button>
        <button onClick={() => addQuestion('multipleChoice')}>+ Scelta multipla</button>
        <button onClick={() => addQuestion('filler')}>+ Completamento</button>
        <button onClick={() => addQuestion('open')}>+ Aperta</button>
      </div>
    </div>
  )
}

export default function ManipulatorPage({ test = null } = {}) {
  const [testData, setTestData] = useState(null)
  const [draftName, setDraftName] = useState(null)
  const [drafts, setDrafts] = useState(() => loadDrafts())
  const [saveStatus, setSaveStatus] = useState('')
  const inputRef = useRef(null)

  // If a test is provided by the parent (the new app-level shell), seed an
  // edit session from it. Re-runs when the upstream test changes.
  useEffect(() => {
    if (!test) return
    const current = loadDrafts()
    const name = uniqueName(test.title, current)
    const next = name === test.title ? test : { ...test, title: name }
    setDraftName(name)
    setTestData(next)
  }, [test])

  // Auto-save (debounced). The draft is keyed by `draftName`. When the user
  // renames the title to something unique, we move the draft slot. If the new
  // title collides with another draft, we keep saving under `draftName` and
  // surface a warning so we never silently overwrite somebody else's draft.
  useEffect(() => {
    if (!testData || !draftName) return
    setSaveStatus('Salvataggio…')
    const handle = setTimeout(() => {
      const current = loadDrafts()
      const desired = (testData.title || '').trim()
      if (!desired) {
        current[draftName] = testData
        persistDrafts(current)
        setDrafts(current)
        setSaveStatus('Salvato (titolo vuoto)')
        return
      }
      if (desired === draftName) {
        current[draftName] = testData
        persistDrafts(current)
        setDrafts(current)
        setSaveStatus('Salvato')
        return
      }
      if (current[desired]) {
        current[draftName] = testData
        persistDrafts(current)
        setDrafts(current)
        setSaveStatus(`Nome "${desired}" già usato — bozza salvata come "${draftName}"`)
        return
      }
      delete current[draftName]
      current[desired] = testData
      persistDrafts(current)
      setDrafts(current)
      setDraftName(desired)
      setSaveStatus('Salvato')
    }, 600)
    return () => clearTimeout(handle)
  }, [testData, draftName])

  function startSession(data) {
    const current = loadDrafts()
    const name = uniqueName(data.title, current)
    const next = name === data.title ? data : { ...data, title: name }
    setDraftName(name)
    setTestData(next)
  }

  function resumeDraft(name) {
    setDraftName(name)
    setTestData(drafts[name])
    setSaveStatus('')
  }

  function deleteDraft(name) {
    if (!confirm(`Eliminare la bozza "${name}"?`)) return
    const current = loadDrafts()
    delete current[name]
    persistDrafts(current)
    setDrafts(current)
    if (name === draftName) {
      setTestData(null)
      setDraftName(null)
      setSaveStatus('')
    }
  }

  function handleFile(file) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => {
      let parsed
      try {
        parsed = JSON.parse(e.target.result)
      } catch {
        alert('Parsing JSON fallito.')
        return
      }
      try {
        startSession(validateTest(parsed))
      } catch (err) {
        alert('JSON non conforme allo schema:\n' + (err instanceof Error ? err.message : String(err)))
      }
    }
    reader.readAsText(file)
  }

  function exportJSON() {
    const blob = new Blob([JSON.stringify(testData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = (testData.title || 'test').replace(/[^a-zA-Z0-9àèéìòù_-]/g, '_') + '.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  function createNew() {
    startSession({
      title: 'Nuovo test',
      subtitle: '',
      instructions: '',
      questions: []
    })
  }

  function updateConceptGroup(i, updated) {
    const groups = [...testData.questions]
    groups[i] = updated
    setTestData({ ...testData, questions: groups })
  }

  function removeConceptGroup(i) {
    setTestData({ ...testData, questions: testData.questions.filter((_, idx) => idx !== i) })
  }

  function addConceptGroup() {
    setTestData({ ...testData, questions: [...testData.questions, { concept: 'Nuovo concetto', questions: [] }] })
  }

  if (!testData) {
    const draftEntries = Object.entries(drafts)
    return (
      <div className="file-picker-container" style={{ flexDirection: 'column' }}>
        <div
          className="file-picker-card"
          onClick={() => inputRef.current?.click()}
          onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]) }}
          onDragOver={e => e.preventDefault()}
        >
          <div className="file-picker-icon">&#9998;</div>
          <h2>Carica un JSON da manipolare</h2>
          <p>Trascina il file qui oppure clicca per selezionarlo</p>
          <input
            ref={inputRef}
            type="file"
            accept=".json"
            onChange={e => handleFile(e.target.files[0])}
            style={{ display: 'none' }}
          />
        </div>
        <button className="btn-small" style={{ display: 'block', margin: '1rem auto' }} onClick={createNew}>
          Oppure crea un nuovo test
        </button>
        {draftEntries.length > 0 && (
          <div className="manipulator-drafts">
            <h3>Bozze salvate</h3>
            <ul>
              {draftEntries.map(([name, data]) => {
                const count = Array.isArray(data?.questions) ? data.questions.length : 0
                return (
                  <li key={name}>
                    <button className="draft-resume" onClick={() => resumeDraft(name)}>
                      <strong>{name}</strong>
                      <span className="draft-meta">{count} elemento/i</span>
                    </button>
                    <button className="btn-icon btn-remove" onClick={() => deleteDraft(name)} title="Elimina bozza">x</button>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="editor-page">
      <div className="toolbar no-print">
        <button onClick={exportJSON}>Esporta JSON</button>
        <button onClick={() => { setTestData(null); setDraftName(null); setSaveStatus('') }}>Cambia bozza</button>
        <button onClick={() => deleteDraft(draftName)}>Elimina bozza</button>
        <span className="manipulator-save-status">
          Bozza: <strong>{draftName}</strong>{saveStatus ? ` — ${saveStatus}` : ''}
        </span>
      </div>

      <div className="editor-sheet">
        <div className="editor-meta">
          <label>
            <span className="editor-label">Titolo:</span>
            <input
              className="editable editable-large"
              value={testData.title}
              onChange={e => setTestData({ ...testData, title: e.target.value })}
            />
          </label>
          <label>
            <span className="editor-label">Sottotitolo:</span>
            <input
              className="editable editable-inline"
              value={testData.subtitle || ''}
              onChange={e => setTestData({ ...testData, subtitle: e.target.value })}
            />
          </label>
          <label>
            <span className="editor-label">Istruzioni:</span>
            <textarea
              className="editable editable-textarea"
              value={testData.instructions || ''}
              onChange={e => setTestData({ ...testData, instructions: e.target.value })}
              rows={2}
            />
          </label>
        </div>

        {testData.questions.map((group, i) => (
          <ConceptGroupEditor
            key={i}
            group={group}
            onChange={v => updateConceptGroup(i, v)}
            onRemove={() => removeConceptGroup(i)}
          />
        ))}

        <button className="btn-small btn-add-section" onClick={addConceptGroup}>+ Aggiungi concetto</button>
      </div>
    </div>
  )
}
