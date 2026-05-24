import { useState, useEffect } from 'react'
import HomePage from './components/HomePage'
import AppShell from './components/AppShell'
import PrintPage from './components/pages/print/PrintPage'
import ManipulatorPage from './components/pages/manipulator/ManipulatorPage'
import CorrectionPage from './components/pages/correction/CorrectionPage'
import ExcelExportPage from './components/pages/excel-export/ExcelExportPage'
import './styles/correction.css'

const MODES = ['edit', 'print', 'correction', 'excel']
const DEFAULT_MODE = 'print'

/** Legacy hash routes from previous app versions, mapped to new mode keys. */
const LEGACY_HASH_MAP = {
  '#/manipulate': '#/edit',
  '#/manipulate/': '#/edit',
}

function useHashRoute() {
  const [hash, setHash] = useState(window.location.hash || '#/')
  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash || '#/')
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])
  return hash
}

function parseMode(hash) {
  const mapped = LEGACY_HASH_MAP[hash] ?? hash
  const m = mapped.replace(/^#\//, '').split(/[/?]/)[0]
  return MODES.includes(m) ? m : null
}

export default function App() {
  const hash = useHashRoute()
  const [currentTest, setCurrentTest] = useState(null)

  function handleTestLoaded(test) {
    setCurrentTest(test)
    // If we're on the home route, jump to the default mode.
    if (parseMode(hash) == null) {
      window.location.hash = `#/${DEFAULT_MODE}`
    }
  }

  function handleBackToHome() {
    setCurrentTest(null)
    window.location.hash = '#/'
  }

  function handleModeChange(mode) {
    window.location.hash = `#/${mode}`
  }

  const mode = parseMode(hash)

  // No test selected → home page (Library).
  if (!currentTest) {
    return <HomePage onTestLoaded={handleTestLoaded} />
  }

  // Test selected but no/invalid mode in URL → default mode.
  const activeMode = mode ?? DEFAULT_MODE

  let content
  switch (activeMode) {
    case 'edit':
      content = <ManipulatorPage test={currentTest} onTestChange={setCurrentTest} />
      break
    case 'correction':
      content = <CorrectionPage test={currentTest} />
      break
    case 'excel':
      content = <ExcelExportPage test={currentTest} />
      break
    case 'print':
    default:
      content = <PrintPage test={currentTest} />
  }

  return (
    <AppShell
      test={currentTest}
      mode={activeMode}
      onModeChange={handleModeChange}
      onBackToHome={handleBackToHome}
    >
      {content}
    </AppShell>
  )
}
