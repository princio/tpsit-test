import { useRef, useEffect } from 'react'
import hljs from 'highlight.js/lib/core'
import python from 'highlight.js/lib/languages/python'
import javascript from 'highlight.js/lib/languages/javascript'
import java from 'highlight.js/lib/languages/java'
import c from 'highlight.js/lib/languages/c'
import xml from 'highlight.js/lib/languages/xml'
import css from 'highlight.js/lib/languages/css'
import bash from 'highlight.js/lib/languages/bash'
import 'highlight.js/styles/github.css'

hljs.registerLanguage('python', python)
hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('java', java)
hljs.registerLanguage('c', c)
hljs.registerLanguage('html', xml)
hljs.registerLanguage('xml', xml)
hljs.registerLanguage('css', css)
hljs.registerLanguage('bash', bash)

export default function CodeBlock({ language, value }) {
  const codeRef = useRef(null)
  const lines = value.split('\n')

  useEffect(() => {
    if (!codeRef.current) return
    const codeEls = codeRef.current.querySelectorAll('.code-line-content')
    lines.forEach((line, i) => {
      const el = codeEls[i]
      if (!el) return
      try {
        const result = language && hljs.getLanguage(language)
          ? hljs.highlight(line || ' ', { language, ignoreIllegals: true })
          : hljs.highlightAuto(line || ' ')
        el.innerHTML = result.value
      } catch {
        el.textContent = line
      }
    })
  }, [language, value])

  return (
    <pre className="code-block">
      <code className={language ? `language-${language}` : ''} ref={codeRef}>
        {lines.map((_, i) => (
          <span key={i} className="code-line">
            <span className="code-line-number">{i + 1}</span>
            <span className="code-line-content" />
          </span>
        ))}
      </code>
    </pre>
  )
}
