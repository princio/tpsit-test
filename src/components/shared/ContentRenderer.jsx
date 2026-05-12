import CodeBlock from './CodeBlock'
import MermaidDiagram from './MermaidDiagram'
import GanttChart from './GanttChart'

const DEFAULT_BLANK_SIZE = 10

function blankWidthFor(blankSizes, i) {
  const n = Array.isArray(blankSizes) && Number.isInteger(blankSizes[i]) && blankSizes[i] >= 2
    ? blankSizes[i]
    : DEFAULT_BLANK_SIZE
  return `${n * 0.55}rem`
}

function renderInlineText(text, fillerAnswers, startBlankIndex = 0, blankSizes) {
  const parts = text.split(/(`[^`]+`|_{2,})/)
  let blankIndex = startBlankIndex
  return parts.map((part, i) => {
    if (part.startsWith('`') && part.endsWith('`'))
      return <code key={i} className="inline-code">{part.slice(1, -1)}</code>
    if (/^_{2,}$/.test(part)) {
      const w = blankWidthFor(blankSizes, blankIndex)
      blankIndex++
      // Answer text is shown via `.answer-reveal` (when enabled), not inline.
      void (fillerAnswers && fillerAnswers[blankIndex - 1])
      return (
        <span key={i} className="inline-blank" style={{ minWidth: w, width: w }} />
      )
    }
    return part
  })
}

function renderCell(value) {
  return renderInlineText(value ?? '', undefined, 0)
}

export default function ContentRenderer({ content, questionIndex, fillerAnswers, blankSizes, skipKinds }) {
  let blankOffset = 0
  const skip = Array.isArray(skipKinds) ? new Set(skipKinds) : null
  return (
    <div className="question-content">
      {content.map((block, i) => {
        if (skip && skip.has(block.kind)) return null
        switch (block.kind) {
          case 'text': {
            const offset = blankOffset
            blankOffset += (block.value.match(/_{2,}/g) || []).length
            return <p key={i} className="content-text">{renderInlineText(block.value, fillerAnswers, offset, blankSizes)}</p>
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
