import CodeBlock from './CodeBlock'
import MermaidDiagram from './MermaidDiagram'

function renderInlineText(text, fillerAnswers) {
  const parts = text.split(/(`[^`]+`|_{2,})/)
  let blankIndex = 0
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

export default function ContentRenderer({ content, questionIndex, fillerAnswers }) {
  return (
    <div className="question-content">
      {content.map((block, i) => {
        switch (block.kind) {
          case 'text':
            return <p key={i} className="content-text">{renderInlineText(block.value, fillerAnswers)}</p>
          case 'code':
            return <CodeBlock key={i} language={block.language} value={block.value} />
          case 'mermaid':
            return <MermaidDiagram key={i} value={block.value} id={`${questionIndex}-${i}`} />
          case 'image':
            return (
              <div key={i} className="content-image">
                <img src={block.value} alt={block.alt || 'Immagine'} />
              </div>
            )
          default:
            return null
        }
      })}
    </div>
  )
}
