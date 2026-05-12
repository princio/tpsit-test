import { useEffect, useMemo, useState } from 'react'
import { listTests, loadTest, triggerSync } from '@/api'

/** @typedef {import('@/api').TestSummary} TestSummary */

/**
 * Builds a nested tree from a list of tests keyed by `filePath`.
 * Leaves are TestSummary objects; intermediate nodes are plain objects.
 *
 * @param {TestSummary[]} tests
 * @returns {Record<string, any>}
 */
function buildTree(tests) {
  const root = {}
  for (const t of tests) {
    const parts = t.filePath.split('/')
    let cursor = root
    for (let i = 0; i < parts.length - 1; i++) {
      const seg = parts[i]
      cursor[seg] ??= { __dir: true, children: {} }
      cursor = cursor[seg].children
    }
    cursor[parts[parts.length - 1]] = { __file: true, test: t }
  }
  return root
}

/** Sorts entries: directories first, then files, both alphabetically. */
function sortedEntries(node) {
  return Object.entries(node).sort(([a, av], [b, bv]) => {
    const aDir = av.__dir ? 0 : 1
    const bDir = bv.__dir ? 0 : 1
    if (aDir !== bDir) return aDir - bDir
    return a.localeCompare(b)
  })
}

function TreeNode({ name, node, depth, expanded, toggleDir, onPickFile, loadingId }) {
  if (node.__file) {
    const t = node.test
    const isLoading = loadingId === t.id
    const valid = t.currentlyValid
    return (
      <button
        type="button"
        className={`library-file ${valid === false ? 'invalid' : ''} ${isLoading ? 'loading' : ''}`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => onPickFile(t)}
        disabled={isLoading}
        title={t.latestErrors || `${t.title} — ${t.filePath}`}
      >
        <span className="library-icon">{valid === false ? '⚠' : '📄'}</span>
        <span className="library-name">{name}</span>
        <span className="library-title">{t.title}</span>
      </button>
    )
  }

  const path = node.__path
  const open = expanded.has(path)
  return (
    <div className="library-dir">
      <button
        type="button"
        className="library-dir-header"
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => toggleDir(path)}
      >
        <span className="library-icon">{open ? '📂' : '📁'}</span>
        <span className="library-name">{name}</span>
      </button>
      {open && (
        <div>
          {sortedEntries(node.children).map(([childName, child]) => (
            <TreeNode
              key={childName}
              name={childName}
              node={{ ...child, __path: `${path}/${childName}` }}
              depth={depth + 1}
              expanded={expanded}
              toggleDir={toggleDir}
              onPickFile={onPickFile}
              loadingId={loadingId}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Library of tests served by the NestJS backend. Renders the public/ folder
 * as a navigable tree; clicking a JSON file loads the latest valid version
 * and calls `onTestLoaded(testData)`.
 *
 * @param {{
 *   onTestLoaded: (test: any) => void,
 *   title?: string,
 * }} props
 */
export default function Library({ onTestLoaded, title = 'Libreria test' }) {
  const [tests, setTests] = useState(null)
  const [error, setError] = useState(null)
  const [loadingId, setLoadingId] = useState(null)
  const [syncing, setSyncing] = useState(false)
  const [expanded, setExpanded] = useState(() => new Set())

  async function refresh() {
    setError(null)
    try {
      const data = await listTests()
      setTests(data)
      // Auto-expand top-level dirs on first load.
      setExpanded(prev => {
        if (prev.size > 0) return prev
        const next = new Set()
        for (const t of data) {
          const top = t.filePath.split('/')[0]
          if (top) next.add(top)
        }
        return next
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  function toggleDir(path) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  async function handlePickFile(t) {
    if (t.latestValidVersionId == null) {
      setError(`Il file "${t.filePath}" non ha una versione valida. ${t.latestErrors || ''}`)
      return
    }
    setLoadingId(t.id)
    setError(null)
    try {
      const data = await loadTest(t.id)
      onTestLoaded(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoadingId(null)
    }
  }

  async function handleSync() {
    setSyncing(true)
    setError(null)
    try {
      await triggerSync()
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSyncing(false)
    }
  }

  const tree = useMemo(() => (tests ? buildTree(tests) : null), [tests])

  return (
    <div className="library">
      <div className="library-header">
        <h3>{title}</h3>
        <button
          type="button"
          className="library-sync"
          onClick={handleSync}
          disabled={syncing}
          title="Ricarica la libreria dal filesystem"
        >
          {syncing ? '⟳ Sync...' : '⟳ Aggiorna'}
        </button>
      </div>

      {error && <div className="library-error">{error}</div>}

      {tests == null && !error && (
        <div className="library-empty">Caricamento…</div>
      )}

      {tests && tests.length === 0 && (
        <div className="library-empty">
          Nessun test trovato. Avvia il backend e clicca <em>Aggiorna</em>.
        </div>
      )}

      {tree && (
        <div className="library-tree">
          {sortedEntries(tree).map(([name, node]) => (
            <TreeNode
              key={name}
              name={name}
              node={{ ...node, __path: name }}
              depth={0}
              expanded={expanded}
              toggleDir={toggleDir}
              onPickFile={handlePickFile}
              loadingId={loadingId}
            />
          ))}
        </div>
      )}
    </div>
  )
}
