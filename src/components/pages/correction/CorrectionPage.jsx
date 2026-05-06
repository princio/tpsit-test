import { useState, useEffect, useRef } from 'react'
import FilePicker from '@/components/shared/FilePicker'
import ContentRenderer from '@/components/shared/ContentRenderer'

/** @typedef {import('@/schema').TestData} TestData */
/** @typedef {import('@/schema').Question} Question */

const STORAGE_KEY = 'tpsit-corrections'
const TESTS_STORAGE_KEY = 'tpsit-tests'

function loadTests() {
  try { return JSON.parse(localStorage.getItem(TESTS_STORAGE_KEY)) || {} } catch { return {} }
}

function saveTest(testData) {
  const tests = loadTests()
  tests[testData.title] = testData
  localStorage.setItem(TESTS_STORAGE_KEY, JSON.stringify(tests))
}

function getQuestionTypeLabel(type) {
  switch (type) {
    case 'trueFalse': return 'Vero/Falso'
    case 'multipleChoice': return 'Scelta multipla'
    case 'filler': return 'Completamento'
    case 'open': return 'Risposta aperta'
    case 'orderItems': return 'Ordinamento'
    default: return type
  }
}

function getQuestionText(q) {
  if (q.text) return q.text
  if (q.content) {
    return q.content
      .filter(c => c.kind === 'text' || c.kind === 'code')
      .map(c => c.value)
      .join(' ')
  }
  return ''
}

function getQuestionContent(q) {
  if (q.content) return q.content
  if (q.text) return [{ kind: 'text', value: q.text }]
  return [{ kind: 'text', value: '(nessun testo)' }]
}

function getCorrectAnswer(q) {
  switch (q.type) {
    case 'trueFalse':
      // Handle both q.answer and q.true/q.false formats
      if (q.answer != null) return q.answer === true ? 'Vero' : 'Falso'
      if (q.true) return 'Vero'
      if (q.false) return 'Falso'
      return null
    case 'multipleChoice':
      if (q.multi && Array.isArray(q.answer)) {
        return q.answer.map(i => q.options[i]).join(', ')
      }
      if (typeof q.answer === 'number' && q.options) return q.options[q.answer]
      return q.answer != null ? String(q.answer) : null
    case 'filler':
      if (Array.isArray(q.answer)) return q.answer.join(', ')
      return q.answer != null ? String(q.answer) : null
    case 'orderItems':
      if (Array.isArray(q.answer) && q.items) {
        return q.answer.map(i => q.items[i]).join(' → ')
      }
      return null
    case 'open':
      return q.answer != null ? String(q.answer) : null
    default:
      return null
  }
}

function getCorrectAnswerList(q) {
  if (q.type === 'multipleChoice' && q.multi && Array.isArray(q.answer) && q.options) {
    return q.answer.map(i => q.options[i]).map(String)
  }
  if (q.type === 'filler' && Array.isArray(q.answer)) {
    return q.answer.map(String)
  }
  return null
}

function flattenQuestions(testData) {
  const questions = []
  if (Array.isArray(testData.questions)) {
    testData.questions.forEach(item => {
      if (item.concept && Array.isArray(item.questions)) {
        // Nested format: questions are under concept
        questions.push(...item.questions)
      } else {
        // Flat format: item itself is a question
        questions.push(item)
      }
    })
  }
  return questions
}

function groupQuestionsByType(questions) {
  const groups = {}
  questions.forEach((q, i) => {
    if (!groups[q.type]) groups[q.type] = []
    groups[q.type].push({ ...q, originalIndex: i })
  })
  return groups
}

function loadCorrections() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []
  } catch { return [] }
}

function saveCorrections(corrections) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(corrections))
}

function CorrectionForm({ testData, editingCorrection, onSave, onCancel }) {
  const searchRef = useRef(null)
  const [studentName, setStudentName] = useState(editingCorrection?.studentName || '')
  const [searchQuery, setSearchQuery] = useState('')
  const [onlyErrors, setOnlyErrors] = useState(false)
  const [scores, setScores] = useState(() => {
    if (editingCorrection) return { ...editingCorrection.scores }
    const initial = {}
    testData.questions.forEach((_, i) => { initial[i] = 1 })
    return initial
  })

  const allGroups = groupQuestionsByType(testData.questions)

  // Filter questions by search query (cerca anche nelle soluzioni) + errori
  const groups = {}
  const query = searchQuery.toLowerCase().trim()
  for (const [type, questions] of Object.entries(allGroups)) {
    let filtered = questions
    if (query) {
      filtered = filtered.filter(q => {
        const text = getQuestionText(q).toLowerCase()
        const sol = (getCorrectAnswer(q) || '').toString().toLowerCase()
        return text.includes(query) || sol.includes(query)
      })
    }
    if (onlyErrors) {
      filtered = filtered.filter(q => {
        const v = scores[q.originalIndex]
        return v !== '' && v != null && (parseFloat(v) || 0) < 1
      })
    }
    if (filtered.length > 0) groups[type] = filtered
  }

  // Counter errori: domande compilate con punteggio < 1
  const answeredEntries = Object.entries(scores).filter(([, v]) => v !== '' && v != null)
  const errorCount = answeredEntries.filter(([, v]) => (parseFloat(v) || 0) < 1).length
  const answeredCount = answeredEntries.length

  function setScore(index, value, focusSearch = true) {
    setScores(s => ({ ...s, [index]: value }))
    if (focusSearch) {
      requestAnimationFrame(() => searchRef.current?.focus())
    }
  }

  function setAllForType(type, value) {
    const qs = groups[type]
    setScores(s => {
      const updated = { ...s }
      qs.forEach(q => { updated[q.originalIndex] = value })
      return updated
    })
  }

  function handleSave() {
    if (!studentName.trim()) {
      alert('Inserisci il nome dell\'alunno.')
      return
    }
    const questionTexts = {}
    testData.questions.forEach((q, i) => {
      questionTexts[i] = getQuestionText(q)
    })
    const correction = {
      id: editingCorrection?.id || Date.now().toString(),
      studentName: studentName.trim(),
      testTitle: testData.title,
      scores,
      questionTexts,
      date: new Date().toISOString(),
    }
    onSave(correction)
  }

  const totalScore = Object.values(scores).reduce((sum, v) => sum + (parseFloat(v) || 0), 0)
  const totalQuestions = testData.questions.length
  const grade = totalQuestions > 0 ? (totalScore / totalQuestions * 10).toFixed(1) : '—'

  return (
    <div className="correction-form">
      <div className="correction-header-bar">
        <h2>{testData.title}</h2>
        <div className="correction-header-stats">
          <div className="correction-errors">
            Errori: <strong>{errorCount}</strong> / {answeredCount || totalQuestions}
          </div>
          <div className="correction-total">
            Totale: <strong>{totalScore.toFixed(1)}</strong> / {totalQuestions}
          </div>
          <div className="correction-grade">
            Voto: <strong>{grade}</strong> / 10
          </div>
        </div>
      </div>

      <div className="correction-student-row">
        <label>
          Nome alunno
          <input
            type="text"
            value={studentName}
            onChange={e => setStudentName(e.target.value)}
            placeholder="Nome e Cognome"
            className="correction-student-input"
            autoFocus
          />
        </label>
      </div>

      <div className="correction-search-row">
        <div className="correction-search-wrapper">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            ref={searchRef}
            placeholder="Cerca domanda o soluzione..."
            className="correction-search-input"
          />
          {searchQuery && (
            <button className="correction-search-clear" onClick={() => setSearchQuery('')}>✕</button>
          )}
        </div>
        <label className="correction-filter-toggle">
          <input
            type="checkbox"
            checked={onlyErrors}
            onChange={e => setOnlyErrors(e.target.checked)}
          />
          Solo errori ({errorCount})
        </label>
      </div>

      {Object.keys(groups).length === 0 && (query || onlyErrors) && (
        <p className="correction-no-results">
          {onlyErrors && !query && 'Nessun errore da mostrare.'}
          {query && !onlyErrors && `Nessuna domanda trovata per "${searchQuery}".`}
          {query && onlyErrors && `Nessun errore trovato per "${searchQuery}".`}
        </p>
      )}

      {Object.entries(groups).map(([type, questions]) => {
        const typeTotal = questions.reduce((sum, q) => sum + (parseFloat(scores[q.originalIndex]) || 0), 0)
        return (
          <div key={type} className="correction-type-group">
            <div className="correction-type-header">
              <h3>{getQuestionTypeLabel(type)} ({questions.length})</h3>
              <span className="correction-type-total">
                {typeTotal.toFixed(1)} / {questions.length}
              </span>
              <div className="correction-quick-btns">
                <button onClick={() => setAllForType(type, 1)} title="Tutti 1">Tutti 1</button>
                <button onClick={() => setAllForType(type, 0.5)} title="Tutti 0.5">Tutti 0.5</button>
                <button onClick={() => setAllForType(type, 0)} title="Tutti 0">Tutti 0</button>
                <button onClick={() => setAllForType(type, '')} title="Reset">Reset</button>
              </div>
            </div>
            <div className="correction-questions">
              {questions.map(q => {
                const answerList = getCorrectAnswerList(q)
                const answer = answerList ? null : getCorrectAnswer(q)
                const currentScore = scores[q.originalIndex]
                const presets = [0, 0.25, 0.5, 0.75, 1]
                const isCustom = currentScore !== '' && !presets.includes(parseFloat(currentScore))
                return (
                  <div key={q.originalIndex} className="correction-question-row">
                    <span className="correction-q-number">{q.originalIndex + 1}</span>
                    <div className="correction-q-info">
                      <div className="correction-q-text">
                        <ContentRenderer content={getQuestionContent(q)} questionIndex={q.originalIndex} fillerAnswers={q.type === 'filler' ? q.answer : undefined} />
                      </div>
                      {answerList && (
                        <ul className="correction-q-answer-list">
                          {answerList.map((v, i) => <li key={i}>{v}</li>)}
                        </ul>
                      )}
                      {answer && <span className="correction-q-answer">{answer}</span>}
                    </div>
                    <div className="correction-score-switch">
                      {presets.map(v => (
                        <button
                          key={v}
                          type="button"
                          className={`correction-switch-btn${parseFloat(currentScore) === v ? ' active' : ''}`}
                          onMouseDown={e => e.preventDefault()}
                          onClick={() => setScore(q.originalIndex, v)}
                        >
                          {v}
                        </button>
                      ))}
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={isCustom ? currentScore : ''}
                        placeholder="..."
                        onChange={e => setScore(q.originalIndex, e.target.value, false)}
                        onBlur={() => requestAnimationFrame(() => searchRef.current?.focus())}
                        className={`correction-switch-input${isCustom ? ' active' : ''}`}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      <div className="correction-actions">
        <button className="correction-btn-save" onClick={handleSave}>
          {editingCorrection ? 'Aggiorna' : 'Salva'}
        </button>
        {onCancel && <button className="correction-btn-cancel" onClick={onCancel}>Annulla</button>}
      </div>
    </div>
  )
}

function QuestionSummaryPanel({ testTitle, corrections }) {
  if (corrections.length < 2) return null

  // Get question texts from saved test data in localStorage
  const savedTests = loadTests()
  const savedTest = savedTests[testTitle]

  // Compute per-question stats
  const maxQ = Math.max(...corrections.map(c => Object.keys(c.scores).length))
  const textsSource = corrections.find(c => c.questionTexts) || {}
  const stats = Array.from({ length: maxQ }, (_, i) => {
    const values = corrections
      .map(c => c.scores[i])
      .filter(v => v !== '' && v != null)
      .map(v => parseFloat(v) || 0)
    const answered = values.length
    const avg = answered > 0 ? values.reduce((a, b) => a + b, 0) / answered : 0
    const correctCount = values.filter(v => v >= 1).length
    const pctCorrect = answered > 0 ? (correctCount / answered) * 100 : 0
    const q = savedTest?.questions?.[i]
    const text = q ? getQuestionText(q) : (textsSource.questionTexts?.[i] || '')
    const answer = q ? getCorrectAnswer(q) : null
    return { index: i, avg, pctCorrect, correctCount, answered, text, answer }
  }).filter(s => s.answered > 0)

  if (stats.length === 0) return null

  const sorted = [...stats].sort((a, b) => a.pctCorrect - b.pctCorrect)
  const hardest = sorted.filter(s => s.pctCorrect < 50)
  const easiest = sorted.filter(s => s.pctCorrect >= 50).reverse()

  function renderItem(s, colorClass) {
    return (
      <div key={s.index} className="question-summary-item">
        <span className="question-summary-num">D{s.index + 1}</span>
        <div className="question-summary-info">
          <span className="question-summary-text">{s.text || `Domanda ${s.index + 1}`}</span>
          {s.answer && <span className="question-summary-answer">{s.answer}</span>}
          <div className="question-summary-stats-row">
            <div className="question-summary-bar-track">
              <div className={`question-summary-bar-fill ${colorClass}`} style={{ width: `${s.pctCorrect}%` }} />
            </div>
            <span className="question-summary-pct">{s.pctCorrect.toFixed(0)}%</span>
            <span className="question-summary-detail">media {s.avg.toFixed(2)}</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="question-summary-panel">
      {hardest.length > 0 && (
        <div className="question-summary-section question-summary-hardest">
          <h4>Domande più sbagliate (&lt;50% corrette) — {hardest.length}</h4>
          <div className="question-summary-items">
            {hardest.map(s => renderItem(s, 'question-summary-bar-error'))}
          </div>
        </div>
      )}
      {easiest.length > 0 && (
        <div className="question-summary-section question-summary-easiest">
          <h4>Domande meno sbagliate (&ge;50% corrette) — {easiest.length}</h4>
          <div className="question-summary-items">
            {easiest.map(s => renderItem(s, 'question-summary-bar-ok'))}
          </div>
        </div>
      )}
    </div>
  )
}

function CorrectionsList({ corrections, onEdit, onDelete, onExport }) {
  if (corrections.length === 0) {
    return <p className="correction-empty">Nessuna correzione salvata.</p>
  }

  const byTest = {}
  corrections.forEach(c => {
    if (!byTest[c.testTitle]) byTest[c.testTitle] = []
    byTest[c.testTitle].push(c)
  })

  return (
    <div className="corrections-list">
      {Object.entries(byTest).map(([title, corrs]) => (
        <div key={title} className="corrections-test-group">
          <h3>{title}</h3>
          <table className="corrections-table">
            <thead>
              <tr>
                <th>Alunno</th>
                <th>Punteggio</th>
                <th>Voto</th>
                <th>Data</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {corrs.sort((a, b) => a.studentName.localeCompare(b.studentName)).map(c => {
                const total = Object.values(c.scores).reduce((s, v) => s + (parseFloat(v) || 0), 0)
                const max = Object.keys(c.scores).length
                const grade = max > 0 ? (total / max * 10).toFixed(1) : '—'
                return (
                  <tr key={c.id}>
                    <td>{c.studentName}</td>
                    <td>{total.toFixed(1)} / {max}</td>
                    <td className="corrections-grade">{grade}</td>
                    <td>{new Date(c.date).toLocaleDateString('it-IT')}</td>
                    <td className="corrections-actions-cell">
                      <button onClick={() => onEdit(c)}>Modifica</button>
                      <button onClick={() => onDelete(c.id)}>Elimina</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <button className="correction-btn-export" onClick={() => onExport(title, corrs)}>Esporta CSV</button>
          <QuestionSummaryPanel testTitle={title} corrections={corrs} />
        </div>
      ))}
    </div>
  )
}

function StatsView({ testData, corrections }) {
  const relevant = corrections.filter(c => c.testTitle === testData.title)

  if (relevant.length === 0) {
    return <p className="correction-empty">Nessuna correzione salvata per <strong>{testData.title}</strong>.</p>
  }

  const questions = testData.questions
  const totalStudents = relevant.length

  // Stats per domanda
  const perQuestion = questions.map((q, i) => {
    const values = relevant
      .map(c => c.scores[i])
      .filter(v => v !== '' && v != null)
      .map(v => parseFloat(v) || 0)
    const answered = values.length
    const sum = values.reduce((a, b) => a + b, 0)
    const avg = answered ? sum / answered : 0
    const correct = values.filter(v => v >= 1).length
    const wrong = values.filter(v => v < 1).length
    const dist = { 0: 0, 0.25: 0, 0.5: 0, 0.75: 0, 1: 0, other: 0 }
    values.forEach(v => {
      if (dist[v] != null) dist[v]++
      else dist.other++
    })
    const wrongStudents = relevant
      .filter(c => {
        const v = c.scores[i]
        return v !== '' && v != null && (parseFloat(v) || 0) < 1
      })
      .map(c => ({ name: c.studentName, score: parseFloat(c.scores[i]) || 0 }))
      .sort((a, b) => a.name.localeCompare(b.name))
    return { q, index: i, answered, avg, correct, wrong, dist, wrongStudents }
  })

  // Stats globali
  const classAvg = perQuestion.reduce((s, p) => s + p.avg, 0)
  const hardest = [...perQuestion].sort((a, b) => a.avg - b.avg).slice(0, 3)

  return (
    <div className="stats-view">
      <div className="correction-header-bar">
        <h2>Statistiche — {testData.title}</h2>
        <div className="correction-header-stats">
          <div className="correction-total">
            Alunni: <strong>{totalStudents}</strong>
          </div>
          <div className="correction-total">
            Media classe: <strong>{classAvg.toFixed(1)}</strong> / {questions.length}
          </div>
        </div>
      </div>

      {hardest.length > 0 && (
        <div className="stats-hardest">
          <h3>Domande più difficili</h3>
          <ol>
            {hardest.map(p => (
              <li key={p.index}>
                D{p.index + 1} — media {p.avg.toFixed(2)} ({p.wrong} errori su {p.answered})
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="stats-questions">
        {perQuestion.map(p => {
          const pctCorrect = p.answered ? (p.correct / p.answered) * 100 : 0
          return (
            <div key={p.index} className="stats-question-card">
              <div className="stats-question-header">
                <span className="stats-q-number">D{p.index + 1}</span>
                <div className="stats-q-text">
                  <ContentRenderer content={getQuestionContent(p.q)} questionIndex={p.index} fillerAnswers={p.q.type === 'filler' ? p.q.answer : undefined} />
                  {getCorrectAnswer(p.q) && (
                    <div className="stats-q-solution">Soluzione: <strong>{getCorrectAnswer(p.q)}</strong></div>
                  )}
                </div>
              </div>

              <div className="stats-metrics">
                <div className="stats-metric">
                  <span className="stats-metric-label">Media</span>
                  <span className="stats-metric-value">{p.avg.toFixed(2)}</span>
                </div>
                <div className="stats-metric">
                  <span className="stats-metric-label">Corrette</span>
                  <span className="stats-metric-value">{p.correct}/{p.answered}</span>
                </div>
                <div className="stats-metric">
                  <span className="stats-metric-label">Errori</span>
                  <span className="stats-metric-value stats-metric-errors">{p.wrong}</span>
                </div>
                <div className="stats-metric stats-metric-bar">
                  <div className="stats-bar-track">
                    <div className="stats-bar-fill" style={{ width: `${pctCorrect}%` }} />
                  </div>
                  <span className="stats-metric-value">{pctCorrect.toFixed(0)}%</span>
                </div>
              </div>

              <div className="stats-distribution">
                {[0, 0.25, 0.5, 0.75, 1].map(v => (
                  <div key={v} className="stats-dist-item">
                    <span className="stats-dist-label">{v}</span>
                    <span className="stats-dist-count">{p.dist[v]}</span>
                  </div>
                ))}
                {p.dist.other > 0 && (
                  <div className="stats-dist-item">
                    <span className="stats-dist-label">altro</span>
                    <span className="stats-dist-count">{p.dist.other}</span>
                  </div>
                )}
              </div>

              {p.wrongStudents.length > 0 && (
                <details className="stats-wrong-list">
                  <summary>Alunni con errori ({p.wrongStudents.length})</summary>
                  <ul>
                    {p.wrongStudents.map(s => (
                      <li key={s.name}>{s.name} <span className="stats-wrong-score">({s.score})</span></li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function CorrectionPage() {
  const [testData, setTestData] = useState(null)
  const [corrections, setCorrections] = useState(loadCorrections)
  const [editing, setEditing] = useState(null)
  const [view, setView] = useState('list') // 'list' | 'new' | 'edit' | 'stats'

  function handleTestLoaded(data) {
    // Normalize test data: flatten concept-grouped questions
    const normalized = {
      ...data,
      questions: flattenQuestions(data)
    }
    saveTest(normalized)
    setTestData(normalized)
  }

  useEffect(() => {
    saveCorrections(corrections)
  }, [corrections])

  function handleSave(correction) {
    setCorrections(prev => {
      const idx = prev.findIndex(c => c.id === correction.id)
      if (idx >= 0) {
        const updated = [...prev]
        updated[idx] = correction
        return updated
      }
      return [...prev, correction]
    })
    setView('list')
    setEditing(null)
  }

  function handleDelete(id) {
    if (!confirm('Eliminare questa correzione?')) return
    setCorrections(prev => prev.filter(c => c.id !== id))
  }

  function handleEdit(correction) {
    // Need to load the test to edit
    setEditing(correction)
    setView('edit')
  }

  function handleExportCSV(testTitle, corrs) {
    if (corrs.length === 0) return
    const maxQ = Math.max(...corrs.map(c => Object.keys(c.scores).length))
    const header = ['Alunno', ...Array.from({ length: maxQ }, (_, i) => `D${i + 1}`), 'Totale']
    const rows = corrs
      .sort((a, b) => a.studentName.localeCompare(b.studentName))
      .map(c => {
        const total = Object.values(c.scores).reduce((s, v) => s + (parseFloat(v) || 0), 0)
        const qScores = Array.from({ length: maxQ }, (_, i) => c.scores[i] ?? '')
        return [c.studentName, ...qScores, total.toFixed(1)]
      })
    const csv = [header, ...rows].map(r => r.join(';')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `correzioni-${testTitle.replace(/\s+/g, '-')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="correction-page">
      <div className="toolbar no-print">
        <div className="toolbar-group">
          <button className={view === 'list' ? 'toolbar-btn-primary' : ''} onClick={() => { setView('list'); setEditing(null) }}>Correzioni</button>
          <button className={view === 'new' ? 'toolbar-btn-primary' : ''} onClick={() => { setView('new'); setEditing(null); setTestData(null) }}>Nuova correzione</button>
          <button className={view === 'stats' ? 'toolbar-btn-primary' : ''} onClick={() => { setView('stats'); setEditing(null); setTestData(null) }}>Statistiche</button>
        </div>
        <div className="toolbar-divider" />
        <div className="toolbar-group">
          <button onClick={() => { window.location.hash = '#/' }}>Stampa</button>
          <button onClick={() => { window.location.hash = '#/manipulate' }}>Manipola</button>
        </div>
      </div>

      {view === 'list' && (
        <div className="correction-container">
          <CorrectionsList
            corrections={corrections}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onExport={handleExportCSV}
          />
        </div>
      )}

      {view === 'edit' && editing && !testData && (
        <div className="correction-container">
          <div className="correction-load-notice">
            <p>Per modificare la correzione di <strong>{editing.studentName}</strong>, carica il file del test originale.</p>
            <FilePicker onTestLoaded={handleTestLoaded} />
          </div>
        </div>
      )}

      {view === 'edit' && editing && testData && (
        <div className="correction-container">
          <CorrectionForm
            testData={testData}
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

      {view === 'new' && testData && (
        <div className="correction-container">
          <CorrectionForm
            testData={testData}
            onSave={handleSave}
            onCancel={() => { setView('list'); setEditing(null) }}
          />
        </div>
      )}

      {view === 'stats' && !testData && (
        <div className="correction-container">
          <p className="correction-load-notice">Carica il file del test per vedere le statistiche delle correzioni salvate.</p>
          <FilePicker onTestLoaded={setTestData} />
        </div>
      )}

      {view === 'stats' && testData && (
        <div className="correction-container">
          <StatsView testData={testData} corrections={corrections} />
        </div>
      )}
    </div>
  )
}
