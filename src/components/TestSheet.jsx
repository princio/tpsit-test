import { useRef, useState, useLayoutEffect } from 'react'
import QuestionBlock from './QuestionBlock'

function Header({ test }) {
  return (
    <>
      <header className="test-header">
        <div className="header-title">
          <h1>{test.title}</h1>
        </div>
        <div className="header-fields">
          <div className="header-field-nome">
            <span className="field-label">Nome</span>
          </div>
          <div className="header-field-bottom">
            <div className="header-field-data">
              <span className="field-label">Data</span>
            </div>
            <div className="header-field-classe">
              <span className="field-label">Classe</span>
            </div>
          </div>
        </div>
        <div className="header-voto">
          <span className="field-label">Voto</span>
        </div>
      </header>
    </>
  )
}

function flattenQuestions(questions) {
  const flat = []
  questions.forEach((item, i) => {
    if (item.concept && Array.isArray(item.questions)) {
      item.questions.forEach((q, j) => {
        flat.push({ question: q, index: j })
      })
    } else {
      flat.push({ question: item, index: i })
    }
  })
  return flat
}

export default function TestSheet({ test, onPagesCount }) {
  const measurePageRef = useRef(null)
  const headerRef = useRef(null)
  const [pages, setPages] = useState(null)

  const flatQuestions = flattenQuestions(test.questions)

  useLayoutEffect(() => {
    if (!measurePageRef.current || !headerRef.current) return

    // Altezza interna disponibile = altezza del .page meno padding top+bottom
    const pageEl = measurePageRef.current
    const style = getComputedStyle(pageEl)
    const paddingTop = parseFloat(style.paddingTop)
    const paddingBottom = parseFloat(style.paddingBottom)
    const pageHeight = pageEl.getBoundingClientRect().height - paddingTop - paddingBottom - 10
    const headerHeight = headerRef.current.getBoundingClientRect().height

    const questionEls = measurePageRef.current.querySelectorAll('[data-q-index]')
    const gap = parseFloat(getComputedStyle(measurePageRef.current.querySelector('.questions-list')).gap) || 8

    const pages = []
    let currentPage = []
    let usedHeight = headerHeight

    questionEls.forEach((el, i) => {
      const h = el.getBoundingClientRect().height + gap
      if (usedHeight + h > pageHeight && currentPage.length > 0) {
        pages.push(currentPage)
        currentPage = [i]
        usedHeight = h
      } else {
        currentPage.push(i)
        usedHeight += h
      }
    })
    if (currentPage.length > 0) pages.push(currentPage)

    setPages(pages)
    onPagesCount?.(pages.length)
  }, [test])

  // Measure pass: una singola .page invisibile, stesse dimensioni reali
  if (!pages) {
    return (
      <div className="pages-container" style={{ visibility: 'hidden', pointerEvents: 'none' }}>
        <div className="page" style={{ height: '297mm', overflow: 'hidden' }} ref={measurePageRef}>
          <div ref={headerRef}>
            <Header test={test} />
          </div>
          <div className="questions-list">
            {flatQuestions.map(({ question, index }, i) => (
              <div key={i} data-q-index={i}>
                <QuestionBlock question={question} index={index} />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="pages-container">
      {pages.map((pageIndices, pageNum) => (
        <div key={pageNum} className="page">
          {pageNum === 0 && <Header test={test} />}
          <div className="questions-list">
            {pageIndices.map(i => {
              const { question, index } = flatQuestions[i]
              return <QuestionBlock key={i} question={question} index={index} />
            })}
          </div>
          <div className="page-number no-print">{pageNum + 1} / {pages.length}</div>
        </div>
      ))}
    </div>
  )
}
