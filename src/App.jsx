import { useState, useEffect } from 'react'
import FilePicker from './components/FilePicker'
import TestSheet from './components/TestSheet'
import EditorPage from './components/EditorPage'
import ManipulatorPage from './components/ManipulatorPage'

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
      const paired = q.options.map(opt => ({ opt, correct: opt === q.answer }))
      const shuffledPaired = shuffle(paired)
      return {
        ...q,
        options: shuffledPaired.map(p => p.opt),
        answer: shuffledPaired.find(p => p.correct)?.opt ?? q.answer,
      }
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

  function handlePrint() {
    const v = Array.from({ length: copies }, () => shuffleTest(testData))
    setVariants(v)
    setTimeout(() => window.print(), 300)
  }

  return (
    <>
      {testData && (
        <div className="toolbar no-print">
          <button onClick={handlePrint}>Stampa</button>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            Copie:
            <input
              type="number" min="1" max="99" value={copies}
              onChange={e => setCopies(Math.max(1, parseInt(e.target.value) || 1))}
              style={{ width: '3.5rem', padding: '0.25rem 0.4rem', borderRadius: '4px', border: '1px solid #ccc', fontSize: '0.9rem' }}
            />
          </label>
          <button onClick={() => setTestData(null)}>Carica un altro test</button>
          <button onClick={() => { window.location.hash = '#/editor' }}>Editor</button>
          <button onClick={() => { window.location.hash = '#/manipulate' }}>Manipola</button>
        </div>
      )}

      {!testData && (
        <div className="toolbar no-print" style={{ justifyContent: 'flex-end' }}>
          <button onClick={() => { window.location.hash = '#/editor' }}>Editor</button>
          <button onClick={() => { window.location.hash = '#/manipulate' }}>Manipola</button>
        </div>
      )}

      {testData ? (
        (variants || [testData]).map((v, i) => {
          const prevCount = pageCounts[i - 1] ?? 0
          const needsBlank = i > 0 && prevCount % 2 !== 0
          return (
            <div key={i}>
              {needsBlank && <div className="page page-blank" />}
              <TestSheet test={v} onPagesCount={n => setPageCounts(c => ({ ...c, [i]: n }))} />
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

  return <PrintView />
}
