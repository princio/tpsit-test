import { useState, useEffect } from 'react'
import TestSheet from '@/components/pages/test-sheet/TestSheet'

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Shuffles `arr` but leaves items with `pin: true` in their original positions. */
function shuffleWithPins(arr) {
  const result = new Array(arr.length)
  const freeSlots = []
  const unpinned = []

  arr.forEach((item, i) => {
    if (item.pin) result[i] = item
    else { freeSlots.push(i); unpinned.push(item) }
  })

  const shuffled = shuffle(unpinned)
  freeSlots.forEach((slot, k) => { result[slot] = shuffled[k] })
  return result
}

function shuffleTest(test) {
  const questions = shuffleWithPins(test.questions).map(q => {
    if (q.type === 'multipleChoice' && !q.pin) {
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
      const paired = q.options.map((opt, i) => ({ opt, correct: i === q.answer }))
      const shuffledPaired = shuffle(paired)
      return {
        ...q,
        options: shuffledPaired.map(p => p.opt),
        answer: shuffledPaired.findIndex(p => p.correct),
      }
    }
    if (q.type === 'orderItems' && !q.pin) {
      return { ...q, items: shuffle(q.items) }
    }
    return q
  })
  return { ...test, questions }
}

/**
 * Print mode: builds N shuffled copies of `test`, lets the user tweak
 * typography, verify pages, and print. Test selection is owned at app level.
 *
 * @param {{ test: any }} props
 */
export default function PrintPage({ test }) {
  const [copies, setCopies] = useState(1)
  const [variants, setVariants] = useState(null)
  const [pageCounts, setPageCounts] = useState({})
  const [fontSize, setFontSize] = useState(13)
  const [gap, setGap] = useState(8)
  const [marginBottom, setMarginBottom] = useState(20)
  const [fontFamily, setFontFamily] = useState('Georgia, "Times New Roman", serif')
  const [showAnswers, setShowAnswers] = useState(false)
  const [showInstructions, setShowInstructions] = useState(true)
  const [showLegend, setShowLegend] = useState(true)
  const [maxPages, setMaxPages] = useState(null)
  const [fixAttempts, setFixAttempts] = useState({})
  const [variantKeys, setVariantKeys] = useState({})
  const [noShuffle, setNoShuffle] = useState(false)

  // Reset variants whenever the upstream test changes.
  useEffect(() => {
    setVariants(null)
    setPageCounts({})
    setFixAttempts({})
    setVariantKeys({})
    setMaxPages(null)
  }, [test])

  const fonts = [
    { label: 'Georgia', value: 'Georgia, "Times New Roman", serif' },
    { label: 'Arial', value: 'Arial, Helvetica, sans-serif' },
    { label: 'Helvetica', value: '"Helvetica Neue", Helvetica, sans-serif' },
    { label: 'Times New Roman', value: '"Times New Roman", Times, serif' },
    { label: 'Courier', value: '"Courier New", Courier, monospace' },
  ]

  function verifyPages() {
    const errors = []
    const expectedPerCopy = test.questions.filter(q => !q.skip).length

    const containers = document.querySelectorAll('.pages-container')
    containers.forEach((container, c) => {
      const rendered = container.querySelectorAll('.question-block').length
      if (rendered !== expectedPerCopy) {
        errors.push(`Copia ${c + 1}: ${rendered} domande invece di ${expectedPerCopy}`)
      }
    })

    const pageCounstArr = Object.values(pageCounts)
    if (pageCounstArr.length > 1 && new Set(pageCounstArr).size > 1) {
      const detail = pageCounstArr.map((n, i) => `Copia ${i + 1}: ${n}`).join(', ')
      errors.push(`Le copie hanno un numero diverso di pagine (${detail})`)
    }

    if (maxPages) {
      pageCounstArr.forEach((n, i) => {
        if (n > maxPages) {
          const attempts = fixAttempts[i] || 0
          errors.push(`Copia ${i + 1}: ${n} pagine (limite: ${maxPages}, tentativi: ${attempts}/50)`)
        }
      })
    }

    const pageContents = document.querySelectorAll('.page-content')
    pageContents.forEach((el, i) => {
      const maxHeight = el.getBoundingClientRect().height
      const scrollH = el.scrollHeight
      if (scrollH > maxHeight + 1) {
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
    const v = Array.from({ length: copies }, () => noShuffle ? test : shuffleTest(test))
    const keys = Object.fromEntries(v.map((_, i) => [i, 0]))
    setVariantKeys(keys)
    setVariants(v)
  }

  useEffect(() => {
    if (!maxPages || !variants) return
    if (noShuffle) return

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
      newVariants[idx] = shuffleTest(test)
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
      <div className="toolbar no-print">
        <div className="toolbar-group">
          <button className="toolbar-btn-primary" onClick={handleGenerate}>Genera</button>
          <button onClick={handlePrint}>Stampa</button>
          <button onClick={handleVerify}>Verifica</button>
          <button onClick={() => setShowAnswers(s => !s)}>{showAnswers ? 'Nascondi' : 'Risposte'}</button>
          <label className="toolbar-control" title="Mostra le istruzioni del test sotto l'intestazione">
            <input type="checkbox" checked={showInstructions} onChange={e => setShowInstructions(e.target.checked)} /> Istruzioni
          </label>
          <label className="toolbar-control" title="Mostra la legenda dei tipi di domanda">
            <input type="checkbox" checked={showLegend} onChange={e => setShowLegend(e.target.checked)} /> Legenda
          </label>
          <label className="toolbar-control">
            Copie
            <input
              type="number" min="1" max="99" value={copies}
              onChange={e => setCopies(Math.max(1, parseInt(e.target.value) || 1))}
              className="toolbar-input"
            />
          </label>
          <label className="toolbar-control" title="Mantieni l'ordine originale delle domande">
            <input
              type="checkbox"
              checked={noShuffle}
              onChange={e => setNoShuffle(e.target.checked)}
            /> No shuffle
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
      </div>

      {(variants || [test]).map((v, i) => {
        const prevCount = pageCounts[i - 1] ?? 0
        const needsBlank = i > 0 && prevCount % 2 !== 0
        return (
          <div key={`${i}-${variantKeys[i] || 0}`}>
            {needsBlank && <div className="page page-blank" />}
            <TestSheet
              index={i}
              test={v}
              fontSize={fontSize}
              gap={gap}
              marginBottom={marginBottom}
              fontFamily={fontFamily}
              showAnswers={showAnswers}
              showInstructions={showInstructions}
              showLegend={showLegend}
              onPagesCount={n => setPageCounts(c => ({ ...c, [i]: n }))}
            />
          </div>
        )
      })}
    </>
  )
}
