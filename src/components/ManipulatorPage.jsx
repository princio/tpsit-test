import { useState, useRef } from 'react'
import CodeBlock from './CodeBlock'
import MermaidDiagram from './MermaidDiagram'

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

function ContentEditor({ content, onChange }) {
  function updateBlock(i, newBlock) {
    const updated = [...content]
    updated[i] = newBlock
    onChange(updated)
  }

  function addBlock(kind) {
    const block = kind === 'code'
      ? { kind: 'code', language: 'python', value: '# codice' }
      : kind === 'mermaid'
        ? { kind: 'mermaid', value: 'graph TD\n    A-->B' }
        : { kind: 'text', value: 'Nuovo testo' }
    onChange([...content, block])
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
              onChange={e => updateBlock(i, { ...block, kind: e.target.value })}
            >
              <option value="text">Testo</option>
              <option value="code">Codice</option>
              <option value="mermaid">Mermaid</option>
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
          {block.kind === 'text' ? (
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
      </div>
    </div>
  )
}

function TrueFalseEditor({ data, onChange, onRemove }) {
  return (
    <div className="editor-question-type">
      <div className="editor-type-header">
        <span className="editor-type-badge tf">V/F</span>
        <button className="btn-icon btn-remove" onClick={onRemove} title="Rimuovi domanda">x</button>
      </div>
      <div className="editor-tf-fields">
        <label className="editor-tf-field">
          <span className="editor-tf-label editor-tf-label-true">VERO</span>
          <input
            className="editable editable-flex"
            value={data["true"] || ''}
            onChange={e => onChange({ ...data, "true": e.target.value })}
          />
        </label>
        <label className="editor-tf-field">
          <span className="editor-tf-label editor-tf-label-false">FALSO</span>
          <input
            className="editable editable-flex"
            value={data["false"] || ''}
            onChange={e => onChange({ ...data, "false": e.target.value })}
          />
        </label>
      </div>
    </div>
  )
}

function MultipleChoiceEditor({ data, onChange, onRemove }) {
  const content = data.content
    ? data.content
    : data.text
      ? [{ kind: 'text', value: data.text }]
      : [{ kind: 'text', value: '' }]

  function updateContent(newContent) {
    if (newContent.length === 1 && newContent[0].kind === 'text') {
      onChange({ ...data, text: newContent[0].value, content: undefined })
    } else {
      const { text, ...rest } = data
      onChange({ ...rest, content: newContent })
    }
  }

  return (
    <div className="editor-question-type">
      <div className="editor-type-header">
        <span className="editor-type-badge mc">Scelta multipla</span>
        <button className="btn-icon btn-remove" onClick={onRemove} title="Rimuovi domanda">x</button>
      </div>
      <ContentEditor content={content} onChange={updateContent} />
      <div className="editor-mc-options">
        {data.options.map((opt, i) => (
          <div key={i} className={`editor-mc-option ${data.answer === i ? 'correct' : ''}`}>
            <button
              className={`btn-correct ${data.answer === i ? 'active' : ''}`}
              onClick={() => onChange({ ...data, answer: i })}
              title="Segna come corretta"
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
              <button
                className="btn-icon btn-remove"
                onClick={() => {
                  const updated = data.options.filter((_, idx) => idx !== i)
                  const newAnswer = data.answer >= updated.length ? updated.length - 1 : data.answer > i ? data.answer - 1 : data.answer
                  onChange({ ...data, options: updated, answer: newAnswer })
                }}
              >x</button>
            )}
          </div>
        ))}
        <button className="btn-small" onClick={() => onChange({ ...data, options: [...data.options, 'Nuova opzione'] })}>+ Opzione</button>
      </div>
    </div>
  )
}

function FillerEditor({ data, onChange, onRemove }) {
  return (
    <div className="editor-question-type">
      <div className="editor-type-header">
        <span className="editor-type-badge filler">Completamento</span>
        <button className="btn-icon btn-remove" onClick={onRemove} title="Rimuovi domanda">x</button>
      </div>
      <EditableText
        value={data.text || ''}
        onChange={v => onChange({ ...data, text: v })}
        tag="p"
        className="content-text"
      />
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
      trueFalse: { type: 'trueFalse', "true": 'Affermazione vera.', "false": 'Affermazione falsa.' },
      multipleChoice: { type: 'multipleChoice', text: 'Domanda?', options: ['Opzione A', 'Opzione B', 'Opzione C', 'Opzione D'], answer: 0 },
      filler: { type: 'filler', text: 'Completa la ____.' }
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
      </div>
    </div>
  )
}

export default function ManipulatorPage() {
  const [testData, setTestData] = useState(null)
  const inputRef = useRef(null)

  function handleFile(file) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result)
        if (!parsed.title || !Array.isArray(parsed.questions)) {
          alert('JSON non valido: deve contenere "title" e "questions".')
          return
        }
        setTestData(parsed)
      } catch {
        alert('JSON non valido')
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
    setTestData({
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
    return (
      <div className="file-picker-container">
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
      </div>
    )
  }

  return (
    <div className="editor-page">
      <div className="toolbar no-print">
        <button onClick={exportJSON}>Esporta JSON</button>
        <button onClick={() => setTestData(null)}>Carica un altro file</button>
        <button onClick={() => { window.location.hash = '#/' }}>Vista stampa</button>
        <button onClick={() => { window.location.hash = '#/editor' }}>Editor</button>
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
