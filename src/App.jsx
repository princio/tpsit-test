import { useState, useEffect } from 'react'
import FilePicker from './components/FilePicker'
import TestSheet from './components/TestSheet'
import EditorPage from './components/EditorPage'
import ManipulatorPage from './components/ManipulatorPage'
import CorrectionPage from './components/CorrectionPage'
import OpenCorrectionPage from './components/OpenCorrectionPage'
import './styles/correction.css'
import './styles/open-correction.css'

function useHashRoute() {
  const [hash, setHash] = useState(window.location.hash || '#/')
  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash || '#/')
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])
  return hash
}

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function shuffleTest(test) {
  const questions = shuffle(test.questions).map(q => {
    if (q.type === 'multipleChoice') {
      if (q.multi && Array.isArray(q.answer)) {
        const correctSet = new Set(q.answer)
        const paired = q.options.map((opt, i) => ({ opt, correct: correctSet.has(i) }))
        const shuffledPaired = shuffle(paired)
        return {
          ...q,
          options: shuffledPaired.map(p => p.opt),
          answer: shuffledPaired.map((p, i) => p.correct ? i : -1).filter(i => i >= 0),
        }
      }
      const paired = q.options.map(opt => ({ opt, correct: opt === q.answer }))
      const shuffledPaired = shuffle(paired)
      return {
        ...q,
        options: shuffledPaired.map(p => p.opt),
        answer: shuffledPaired.find(p => p.correct)?.opt ?? q.answer,
      }
    }
    if (q.type === 'orderItems') {
      return { ...q, items: shuffle(q.items) }
    }
    return q
  })
  return { ...test, questions }
}

function PrintView() {
  const [testData, setTestData] = useState(null)
  const [copies, setCopies] = useState(1)
  const [variants, setVariants] = useState(null)
  const [pageCounts, setPageCounts] = useState({})
  const [fontSize, setFontSize] = useState(13)
  const [gap, setGap] = useState(8)
  const [marginBottom, setMarginBottom] = useState(20)
  const [fontFamily, setFontFamily] = useState('Georgia, "Times New Roman", serif')
  const [showAnswers, setShowAnswers] = useState(false)
  const [maxPages, setMaxPages] = useState(null)
  const [fixAttempts, setFixAttempts] = useState({})
  const [variantKeys, setVariantKeys] = useState({})

  const fonts = [
    { label: 'Georgia', value: 'Georgia, "Times New Roman", serif' },
    { label: 'Arial', value: 'Arial, Helvetica, sans-serif' },
    { label: 'Helvetica', value: '"Helvetica Neue", Helvetica, sans-serif' },
    { label: 'Times New Roman', value: '"Times New Roman", Times, serif' },
    { label: 'Courier', value: '"Courier New", Courier, monospace' },
  ]

  function verifyPages() {
    const errors = []
    const expectedPerCopy = testData.questions.filter(q => !q.skip).length

    // Check question count per copy
    const containers = document.querySelectorAll('.pages-container')
    containers.forEach((container, c) => {
      const rendered = container.querySelectorAll('.question-block').length
      if (rendered !== expectedPerCopy) {
        errors.push(`Copia ${c + 1}: ${rendered} domande invece di ${expectedPerCopy}`)
      }
    })

    // Check all copies have the same number of pages
    const pageCounstArr = Object.values(pageCounts)
    if (pageCounstArr.length > 1 && new Set(pageCounstArr).size > 1) {
      const detail = pageCounstArr.map((n, i) => `Copia ${i + 1}: ${n}`).join(', ')
      errors.push(`Le copie hanno un numero diverso di pagine (${detail})`)
    }

    // Check maxPages limit
    if (maxPages) {
      pageCounstArr.forEach((n, i) => {
        if (n > maxPages) {
          const attempts = fixAttempts[i] || 0
          errors.push(`Copia ${i + 1}: ${n} pagine (limite: ${maxPages}, tentativi: ${attempts}/50)`)
        }
      })
    }

    // Check every page-content doesn't overflow
    const pageContents = document.querySelectorAll('.page-content')
    pageContents.forEach((el, i) => {
      const maxHeight = el.getBoundingClientRect().height
      const scrollH = el.scrollHeight
      if (scrollH > maxHeight + 1) { // +1px tolerance
        errors.push(`Pagina ${i + 1}: contenuto (${Math.round(scrollH)}px) supera l'area disponibile (${Math.round(maxHeight)}px) di ${Math.round(scrollH - maxHeight)}px`)
      }
    })

    return errors
  }

  function handleVerify() {
    const errors = verifyPages()
    if (errors.length === 0) {
      alert('Tutto OK: tutte le pagine rispettano i limiti.')
    } else {
      alert('ERRORI:\n\n' + errors.join('\n'))
    }
  }

  function handleGenerate() {
    const input = prompt('Numero massimo di pagine per copia (vuoto = nessun limite):')
    const parsed = parseInt(input)
    const limit = isNaN(parsed) || parsed < 1 ? null : parsed
    setMaxPages(limit)
    setFixAttempts({})
    setPageCounts({})
    const v = Array.from({ length: copies }, () => shuffleTest(testData))
    const keys = Object.fromEntries(v.map((_, i) => [i, 0]))
    setVariantKeys(keys)
    setVariants(v)
  }

  // Auto-fix: re-shuffle copies that exceed maxPages
  useEffect(() => {
    if (!maxPages || !variants) return

    const ready = variants.every((_, i) => pageCounts[i] != null)
    if (!ready) return

    const toFix = []
    for (let i = 0; i < variants.length; i++) {
      if (pageCounts[i] > maxPages && (fixAttempts[i] || 0) < 50) {
        toFix.push(i)
      }
    }

    if (toFix.length === 0) return

    const newVariants = [...variants]
    const newAttempts = { ...fixAttempts }
    const newKeys = { ...variantKeys }
    for (const idx of toFix) {
      newVariants[idx] = shuffleTest(testData)
      newAttempts[idx] = (newAttempts[idx] || 0) + 1
      newKeys[idx] = (newKeys[idx] || 0) + 1
    }
    setFixAttempts(newAttempts)
    setVariantKeys(newKeys)
    setVariants(newVariants)
  }, [pageCounts, maxPages])

  function handlePrint() {
    const errors = verifyPages()
    if (errors.length > 0) {
      alert('Stampa annullata. Errori:\n\n' + errors.join('\n'))
      return
    }

    const style = document.createElement('style')
    style.id = '__print-overrides'
    style.textContent = `@media print { .page { font-size: ${fontSize}px !important; font-family: ${fontFamily} !important; } .page-content { height: calc(297mm - 10mm - ${marginBottom}mm) !important; } .questions-list { gap: ${gap}px !important; } }`
    document.head.appendChild(style)
    window.print()
    document.head.removeChild(style)
  }

  return (
    <>
      {testData && (
        <div className="toolbar no-print">
          <div className="toolbar-group">
            <button className="toolbar-btn-primary" onClick={handleGenerate}>Genera</button>
            <button onClick={handlePrint}>Stampa</button>
            <button onClick={handleVerify}>Verifica</button>
            <button onClick={() => setShowAnswers(s => !s)}>{showAnswers ? 'Nascondi' : 'Risposte'}</button>
            <label className="toolbar-control">
              Copie
              <input
                type="number" min="1" max="99" value={copies}
                onChange={e => setCopies(Math.max(1, parseInt(e.target.value) || 1))}
                className="toolbar-input"
              />
            </label>
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
          <div className="toolbar-divider" />
          <div className="toolbar-group">
            <button onClick={() => setTestData(null)}>Altro test</button>
            <button onClick={() => { window.location.hash = '#/editor' }}>Editor</button>
            <button onClick={() => { window.location.hash = '#/manipulate' }}>Manipola</button>
            <button onClick={() => { window.location.hash = '#/correction' }}>Correzione</button>
            <button onClick={() => { window.location.hash = '#/open-correction' }}>Correzione aperta</button>
          </div>
        </div>
      )}

      {!testData && (
        <div className="toolbar no-print" style={{ justifyContent: 'flex-end' }}>
          <button onClick={() => { window.location.hash = '#/editor' }}>Editor</button>
          <button onClick={() => { window.location.hash = '#/manipulate' }}>Manipola</button>
          <button onClick={() => { window.location.hash = '#/correction' }}>Correzione</button>
          <button onClick={() => { window.location.hash = '#/open-correction' }}>Correzione aperta</button>
        </div>
      )}

      {testData ? (
        (variants || [testData]).map((v, i) => {
          const prevCount = pageCounts[i - 1] ?? 0
          const needsBlank = i > 0 && prevCount % 2 !== 0
          return (
            <div key={`${i}-${variantKeys[i] || 0}`}>
              {needsBlank && <div className="page page-blank" />}
              <TestSheet test={v} fontSize={fontSize} gap={gap} marginBottom={marginBottom} fontFamily={fontFamily} showAnswers={showAnswers} onPagesCount={n => setPageCounts(c => ({ ...c, [i]: n }))} />
            </div>
          )
        })
      ) : (
        <FilePicker onTestLoaded={setTestData} />
      )}
    </>
  )
}

export default function App() {
  const hash = useHashRoute()

  if (hash.startsWith('#/manipulate')) {
    return <ManipulatorPage />
  }

  if (hash.startsWith('#/editor')) {
    return <EditorPage />
  }

  if (hash.startsWith('#/open-correction')) {
    return <OpenCorrectionPage />
  }

  if (hash.startsWith('#/correction')) {
    return <CorrectionPage />
  }

  return <PrintView />
}
