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

function PrintView() {
  const [testData, setTestData] = useState(null)

  return (
    <>
      {testData && (
        <div className="toolbar no-print">
          <button onClick={() => window.print()}>Stampa</button>
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
        <TestSheet test={testData} />
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
