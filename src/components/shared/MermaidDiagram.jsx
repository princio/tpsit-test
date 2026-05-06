import { useRef, useEffect, useState } from 'react'
import mermaid from 'mermaid'

let initialized = false

export default function MermaidDiagram({ value, id }) {
  const containerRef = useRef(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!initialized) {
      mermaid.initialize({
        startOnLoad: false,
        theme: 'neutral',
        securityLevel: 'loose',
      })
      initialized = true
    }

    let cancelled = false

    async function render() {
      try {
        const uniqueId = `mermaid-${id}-${Date.now()}`
        const { svg } = await mermaid.render(uniqueId, value)
        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = svg
        }
      } catch (err) {
        if (!cancelled) {
          setError(`Errore nel diagramma Mermaid: ${err.message}`)
        }
      }
    }

    render()
    return () => { cancelled = true }
  }, [value, id])

  if (error) {
    return <div className="mermaid-error">{error}</div>
  }

  return <div ref={containerRef} className="mermaid-container" />
}
