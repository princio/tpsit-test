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

  useEffect(() => {
    if (codeRef.current) {
      try {
        const result = language && hljs.getLanguage(language)
          ? hljs.highlight(value, { language })
          : hljs.highlightAuto(value)
        codeRef.current.innerHTML = result.value
      } catch {
        codeRef.current.textContent = value
      }
    }
  }, [language, value])

  return (
    <pre className="code-block">
      <code ref={codeRef} className={language ? `language-${language}` : ''} />
    </pre>
  )
}
