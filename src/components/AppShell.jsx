/**
 * Workspace shell: top bar with current test info + back-to-library button,
 * a tab row to switch modes (Modifica / Stampa / Correzione / Aperta), and a
 * slot for the active mode's content. Test selection persists across tabs.
 *
 * @param {{
 *   test: any,
 *   mode: 'edit' | 'print' | 'correction' | 'open-correction',
 *   onModeChange: (mode: string) => void,
 *   onBackToHome: () => void,
 *   children: React.ReactNode,
 * }} props
 */
export default function AppShell({ test, mode, onModeChange, onBackToHome, children }) {
  const tabs = [
    { key: 'edit', label: 'Modifica' },
    { key: 'print', label: 'Stampa' },
    { key: 'correction', label: 'Correzione' },
    { key: 'excel', label: 'Griglia' },
  ]

  const meta = [test?.classe, test?.materia, test?.uda].filter(Boolean).join(' / ')

  return (
    <div className="app-shell">
      <header className="app-shell-header no-print">
        <button
          type="button"
          className="app-shell-back"
          onClick={onBackToHome}
          title="Torna alla libreria"
        >
          ← Libreria
        </button>
        <div className="app-shell-title">
          <strong>{test?.title || 'Test'}</strong>
          {meta && <span className="app-shell-meta">{meta}</span>}
        </div>
        <nav className="app-shell-tabs" aria-label="Modalità">
          {tabs.map(t => (
            <button
              key={t.key}
              type="button"
              className={`app-shell-tab ${mode === t.key ? 'active' : ''}`}
              onClick={() => onModeChange(t.key)}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>
      <main className="app-shell-content">{children}</main>
    </div>
  )
}
