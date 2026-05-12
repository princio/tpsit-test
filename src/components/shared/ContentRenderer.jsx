import CodeBlock from './CodeBlock'
import MermaidDiagram from './MermaidDiagram'
import GanttChart from './GanttChart'

function renderInlineText(text, fillerAnswers, startBlankIndex = 0) {
  const parts = text.split(/(`[^`]+`|_{2,})/)
  let blankIndex = startBlankIndex
  return parts.map((part, i) => {
    if (part.startsWith('`') && part.endsWith('`'))
      return <code key={i} className="inline-code">{part.slice(1, -1)}</code>
    if (/^_{2,}$/.test(part)) {
      const answer = fillerAnswers && fillerAnswers[blankIndex]
      blankIndex++
      const minWidth = answer ? `${Math.max(3, answer.length * 0.6)}rem` : undefined
      return <span key={i} className="inline-blank" style={minWidth ? { minWidth, width: minWidth } : undefined} />
    }
    return part
  })
}

function renderCell(value) {
  return renderInlineText(value ?? '', undefined, 0)
}

export default function ContentRenderer({ content, questionIndex, fillerAnswers }) {
  let blankOffset = 0
  return (
    <div className="question-content">
      {content.map((block, i) => {
        switch (block.kind) {
          case 'text': {
            const offset = blankOffset
            blankOffset += (block.value.match(/_{2,}/g) || []).length
            return <p key={i} className="content-text">{renderInlineText(block.value, fillerAnswers, offset)}</p>
          }
          case 'code':
            return <CodeBlock key={i} language={block.language} value={block.value} />
          case 'mermaid':
            return <MermaidDiagram key={i} value={block.value} id={`${questionIndex}-${i}`} />
          case 'gantt':
            return <GanttChart key={i} slices={block.slices} />
          case 'image':
            return (
              <div key={i} className="content-image">
                <img src={block.value} alt={block.alt || 'Immagine'} />
              </div>
            )
          case 'table': {
            const headers = Array.isArray(block.headers) ? block.headers : null
            const rows = Array.isArray(block.rows) ? block.rows : []
            return (
              <div key={i} className="content-table-wrapper">
                <table className="content-table">
                  {headers && headers.length > 0 && (
                    <thead>
                      <tr>
                        {headers.map((h, ci) => (
                          <th key={ci}>{renderCell(h)}</th>
                        ))}
                      </tr>
                    </thead>
                  )}
                  <tbody>
                    {rows.map((row, ri) => (
                      <tr key={ri}>
                        {row.map((cell, ci) => (
                          <td key={ci}>{renderCell(cell)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          }
          default:
            return null
        }
      })}
    </div>
  )
}
