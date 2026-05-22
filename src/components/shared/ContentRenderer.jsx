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

/**
 * Renders a single line of text with inline markdown:
 *   `code`  **bold**  *italic*  ~~strikethrough~~  ____  (blanks)
 *
 * @param {string} text
 * @param {string[] | undefined} fillerAnswers
 * @param {{ value: number }} counter  - shared mutable blank counter
 * @param {number[] | undefined} blankSizes
 */
function renderInlineMd(text, fillerAnswers, counter, blankSizes) {
  // Order matters: ** before * so bold is not misread as italic.
  const parts = text.split(/(`[^`]+`|_{2,}|\*\*[^*\n]+\*\*|\*[^*\n]+\*|~~[^~\n]+~~)/)
  return parts.map((part, i) => {
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2)
      return <code key={i} className="inline-code">{part.slice(1, -1)}</code>

    if (/^_{2,}$/.test(part)) {
      const idx = counter.value++
      const w = blankWidthFor(blankSizes, idx)
      return <span key={i} className="inline-blank" style={{ minWidth: w, width: w }} />
    }

    if (part.startsWith('**') && part.endsWith('**') && part.length > 4)
      return <strong key={i}>{part.slice(2, -2)}</strong>

    if (part.startsWith('*') && part.endsWith('*') && part.length > 2)
      return <em key={i}>{part.slice(1, -1)}</em>

    if (part.startsWith('~~') && part.endsWith('~~') && part.length > 4)
      return <del key={i}>{part.slice(2, -2)}</del>

    return part
  })
}

/**
 * Renders a full TextBlock value with block-level markdown:
 *   paragraphs (\n\n), bullet lists (- / *), numbered lists (1.), <br> for single \n.
 * Uses a shared `counter` so blank indices are consistent across paragraphs.
 */
function renderBlockMd(value, fillerAnswers, counter, blankSizes) {
  return value.split(/\n\n+/).flatMap((para, pi) => {
    const lines = para.split('\n')

    // Bullet list: every line starts with "- " or "* "
    if (lines.length > 0 && lines.every(l => /^[-*] /.test(l))) {
      return [
        <ul key={`ul-${pi}`} className="content-list">
          {lines.map((l, li) => (
            <li key={li}>{renderInlineMd(l.replace(/^[-*] /, ''), fillerAnswers, counter, blankSizes)}</li>
          ))}
        </ul>,
      ]
    }

    // Numbered list: every line starts with "N. "
    if (lines.length > 0 && lines.every(l => /^\d+\. /.test(l))) {
      return [
        <ol key={`ol-${pi}`} className="content-list">
          {lines.map((l, li) => (
            <li key={li}>{renderInlineMd(l.replace(/^\d+\. /, ''), fillerAnswers, counter, blankSizes)}</li>
          ))}
        </ol>,
      ]
    }

    // Regular paragraph — single \n becomes <br>
    const inlineContent = lines.flatMap((line, li) => [
      ...renderInlineMd(line, fillerAnswers, counter, blankSizes),
      ...(li < lines.length - 1 ? [<br key={`br-${pi}-${li}`} />] : []),
    ])
    return [<p key={`p-${pi}`} className="content-text">{inlineContent}</p>]
  })
}

function renderCell(value) {
  return renderInlineMd(value ?? '', undefined, { value: 0 }, undefined)
}

/**
 * Renders a plain string with inline markdown (bold, italic, strikethrough, code).
 * Use this wherever a bare string could contain markdown but isn't a full ContentBlock.
 */
export function InlineText({ value }) {
  return <>{renderInlineMd(value ?? '', undefined, { value: 0 }, undefined)}</>
}

export default function ContentRenderer({ content, questionIndex, fillerAnswers, blankSizes, skipKinds }) {
  const skip = Array.isArray(skipKinds) ? new Set(skipKinds) : null
  const counter = { value: 0 }

  return (
    <div className="question-content">
      {content.map((block, i) => {
        if (skip && skip.has(block.kind)) return null
        switch (block.kind) {
          case 'text':
            return <div key={i}>{renderBlockMd(block.value, fillerAnswers, counter, blankSizes)}</div>
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
