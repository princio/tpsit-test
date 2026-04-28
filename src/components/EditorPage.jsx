import { useState, useRef } from 'react'
import CodeBlock from './CodeBlock'
import MermaidDiagram from './MermaidDiagram'

/** @typedef {import('../schema').TestData} TestData */

// NOTA: questa pagina usa un formato legacy basato su `testData.sections[]`
// e su raggruppamenti `{ concept, trueFalse, filler, multipleChoice }` —
// NON conforme allo schema canonico in `src/schema.ts` (basato su
// `testData.questions[]`). Va riscritta per allinearsi a TestData.

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
          {block.kind === 'mermaid' && <MermaidDiagram value={block.value} id={`ed-${i}`} />}
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

function TrueFalseEditor({ data, onChange }) {
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
        <span className="editor-type-badge tf">V/F</span>
        <label className="editor-answer-toggle">
          Risposta:
          <button
            className={`btn-tf ${data.answer ? 'btn-true' : 'btn-false'}`}
            onClick={() => onChange({ ...data, answer: !data.answer })}
          >
            {data.answer ? 'VERO' : 'FALSO'}
          </button>
        </label>
      </div>
      <ContentEditor content={content} onChange={updateContent} />
    </div>
  )
}

function FillerEditor({ data, onChange }) {
  return (
    <div className="editor-question-type">
      <div className="editor-type-header">
        <span className="editor-type-badge filler">Completamento</span>
      </div>
      <EditableText
        value={data.text}
        onChange={v => onChange({ ...data, text: v })}
        tag="p"
        className="content-text"
      />
      <div className="editor-filler-answers">
        <span className="editor-label">Risposte (in ordine dei ____):</span>
        {data.answer.map((a, i) => (
          <input
            key={i}
            className="editable editable-inline"
            value={a}
            onChange={e => {
              const updated = [...data.answer]
              updated[i] = e.target.value
              onChange({ ...data, answer: updated })
            }}
          />
        ))}
        <button className="btn-icon" onClick={() => onChange({ ...data, answer: [...data.answer, ''] })}>+</button>
        {data.answer.length > 1 && (
          <button className="btn-icon btn-remove" onClick={() => onChange({ ...data, answer: data.answer.slice(0, -1) })}>-</button>
        )}
      </div>
    </div>
  )
}

function MultipleChoiceEditor({ data, onChange }) {
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

function ConceptEditor({ concept, onChange, onRemove }) {
  return (
    <div className="editor-concept">
      <div className="editor-concept-header">
        <EditableText
          value={concept.concept}
          onChange={v => onChange({ ...concept, concept: v })}
          tag="strong"
          className="editor-concept-title"
        />
        <button className="btn-icon btn-remove" onClick={onRemove} title="Rimuovi concetto">x</button>
      </div>
      {concept.trueFalse && (
        <TrueFalseEditor
          data={concept.trueFalse}
          onChange={v => onChange({ ...concept, trueFalse: v })}
        />
      )}
      {concept.filler && (
        <FillerEditor
          data={concept.filler}
          onChange={v => onChange({ ...concept, filler: v })}
        />
      )}
      {concept.multipleChoice && (
        <MultipleChoiceEditor
          data={concept.multipleChoice}
          onChange={v => onChange({ ...concept, multipleChoice: v })}
        />
      )}
    </div>
  )
}

function SectionEditor({ section, onChange, onRemove }) {
  function updateQuestion(i, updated) {
    const qs = [...section.questions]
    qs[i] = updated
    onChange({ ...section, questions: qs })
  }

  function removeQuestion(i) {
    onChange({ ...section, questions: section.questions.filter((_, idx) => idx !== i) })
  }

  function addQuestion() {
    const newQ = {
      concept: 'Nuovo concetto',
      trueFalse: { text: 'Affermazione vera o falsa.', answer: true },
      filler: { text: 'Completa la ____.', answer: ['frase'] },
      multipleChoice: { text: 'Domanda?', options: ['Opzione A', 'Opzione B', 'Opzione C', 'Opzione D'], answer: 0 }
    }
    onChange({ ...section, questions: [...section.questions, newQ] })
  }

  return (
    <div className="editor-section">
      <div className="editor-section-header">
        <EditableText
          value={section.title}
          onChange={v => onChange({ ...section, title: v })}
          tag="h2"
          className="editor-section-title"
        />
        <button className="btn-icon btn-remove" onClick={onRemove} title="Rimuovi sezione">x</button>
      </div>
      {section.questions.map((q, i) => (
        <ConceptEditor
          key={i}
          concept={q}
          onChange={v => updateQuestion(i, v)}
          onRemove={() => removeQuestion(i)}
        />
      ))}
      <button className="btn-small btn-add-concept" onClick={addQuestion}>+ Aggiungi concetto</button>
    </div>
  )
}

export default function EditorPage() {
  const [testData, setTestData] = useState(null)
  const inputRef = useRef(null)

  function handleFile(file) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        setTestData(JSON.parse(e.target.result))
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

  function updateSection(i, updated) {
    const sections = [...testData.sections]
    sections[i] = updated
    setTestData({ ...testData, sections })
  }

  function removeSection(i) {
    setTestData({ ...testData, sections: testData.sections.filter((_, idx) => idx !== i) })
  }

  function addSection() {
    const newSection = {
      title: 'Nuova sezione',
      questions: []
    }
    setTestData({ ...testData, sections: [...testData.sections, newSection] })
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
          <h2>Carica un JSON da modificare</h2>
          <p>Trascina il file qui oppure clicca per selezionarlo</p>
          <input
            ref={inputRef}
            type="file"
            accept=".json"
            onChange={e => handleFile(e.target.files[0])}
            style={{ display: 'none' }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="editor-page">
      <div className="toolbar no-print">
        <button onClick={exportJSON}>Esporta JSON</button>
        <button onClick={() => setTestData(null)}>Carica un altro file</button>
        <button onClick={() => { window.location.hash = '#/' }}>Vai alla vista stampa</button>
        <button onClick={() => { window.location.hash = '#/manipulate' }}>Manipola</button>
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

        {testData.sections?.map((section, i) => (
          <SectionEditor
            key={i}
            section={section}
            onChange={v => updateSection(i, v)}
            onRemove={() => removeSection(i)}
          />
        ))}

        <button className="btn-small btn-add-section" onClick={addSection}>+ Aggiungi sezione</button>
      </div>
    </div>
  )
}
