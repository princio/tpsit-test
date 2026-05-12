import { useRef, useState, useLayoutEffect, useCallback } from 'react'
import QuestionBlock from './QuestionBlock'
import { TestSheetProvider } from './TestSheetContext'

/** @typedef {import('@/schema').TestData} TestData */
/** @typedef {import('@/schema').Question} Question */

function Header({ index, test, showInstructions, showLegend }) {
  const hasInstructions =
    showInstructions && typeof test.instructions === 'string' && test.instructions.trim()
  return (
    <header className="test-header">
      <div className="test-header-row">
        <div className="header-title">
          <h1>{test.title} {index}</h1>
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
      </div>
      {hasInstructions && (
        <div className="test-instructions">{test.instructions}</div>
      )}
      {showLegend && <Legend />}
    </header>
  )
}

function Legend() {
  return (
    <div className="test-legend">
      <span className="test-legend-label">Legenda:</span>
      <span className="test-legend-item">
        <span className="mc-box" />
        <span>Risposta singola: una sola opzione</span>
      </span>
      <span className="test-legend-item">
        <span className="mc-box mc-box-square" />
        <span>Risposta multipla</span>
      </span>
      <span className="test-legend-item">
        <span className="oi-box">1</span>
        <span>Ordinamento</span>
      </span>
    </div>
  )
}

function flattenQuestions(questions) {
  const flat = []
  questions.forEach((item) => {
    if (item.concept && Array.isArray(item.questions)) {
      item.questions.forEach((q) => {
        if (!q.skip) flat.push({ question: q })
      })
    } else {
      if (!item.skip) flat.push({ question: item })
    }
  })
  flat.forEach((entry, i) => { entry.index = i })
  return flat
}

export default function TestSheet({ index, test, fontSize = 13, gap = 8, marginBottom = 10, fontFamily = 'Georgia, "Times New Roman", serif', showAnswers = false, showInstructions = true, showLegend = true, onPagesCount }) {
  const measureRef = useRef(null)
  const contentRef = useRef(null)
  const headerRef = useRef(null)
  const pagesRef = useRef(null)
  const [pages, setPages] = useState(null)
  const [debugInfo, setDebugInfo] = useState(null)

  const flatQuestions = flattenQuestions(test.questions)

  // Reset pages synchronously when layout params change → forces measure pass
  useLayoutEffect(() => {
    setPages(null)
  }, [test, fontSize, gap, marginBottom, fontFamily, showInstructions, showLegend])

  // Phase 1: Measure individual question heights and do initial pagination
  useLayoutEffect(() => {
    if (pages !== null) return
    if (!measureRef.current || !contentRef.current || !headerRef.current) return

    const availableHeight = contentRef.current.getBoundingClientRect().height

    const headerCs = getComputedStyle(headerRef.current)
    const headerHeight = headerRef.current.getBoundingClientRect().height
      + parseFloat(headerCs.marginBottom)

    const questionEls = contentRef.current.querySelectorAll('[data-q-index]')

    const result = []
    let currentPage = []
    let usedHeight = headerHeight

    questionEls.forEach((el, i) => {
      const qHeight = el.getBoundingClientRect().height
      const totalH = currentPage.length > 0 ? qHeight + gap : qHeight

      if (usedHeight + totalH > availableHeight && currentPage.length > 0) {
        result.push(currentPage)
        currentPage = [i]
        usedHeight = qHeight
      } else {
        currentPage.push(i)
        usedHeight += totalH
      }
    })
    if (currentPage.length > 0) result.push(currentPage)

    setPages(result)
    setDebugInfo({
      availableHeight: Math.round(availableHeight),
      headerHeight: Math.round(headerHeight),
    })
    onPagesCount?.(result.length)
  }, [pages])

  // Phase 2: After render, verify each page-content doesn't overflow.
  // If it does, move last question to next page.
  const verifyAndFix = useCallback(() => {
    if (!pagesRef.current || !pages) return
    const contentEls = pagesRef.current.querySelectorAll('.page-content')
    let fixed = false

    const newPages = pages.map(p => [...p])

    for (let i = 0; i < contentEls.length; i++) {
      const el = contentEls[i]
      if (el.scrollHeight > el.clientHeight + 1) {
        // Overflow: move last question to next page
        if (newPages[i].length <= 1) continue // can't move the only question
        const moved = newPages[i].pop()
        if (i + 1 < newPages.length) {
          newPages[i + 1].unshift(moved)
        } else {
          newPages.push([moved])
        }
        fixed = true
      }
    }

    if (fixed) {
      setPages(newPages)
      onPagesCount?.(newPages.length)
    }
  }, [pages, onPagesCount])

  useLayoutEffect(() => {
    if (pages) verifyAndFix()
  }, [pages, verifyAndFix])

  const pageStyle = { fontSize: `${fontSize}px`, fontFamily }
  const contentStyle = { height: `calc(297mm - 10mm - ${marginBottom}mm)`, overflow: 'visible' }

  const ctx = { fontSize, gap, marginBottom, fontFamily, showAnswers }

  // Measure pass
  if (!pages) {
    return (
      <TestSheetProvider {...ctx}>
        <div className="pages-container" style={{ visibility: 'hidden', pointerEvents: 'none', position: 'fixed', top: 0, left: 0 }}>
          <div className="page" style={{ ...pageStyle, height: '297mm' }} ref={measureRef}>
            <div ref={contentRef} style={contentStyle}>
              <div ref={headerRef}>
                <Header index={index} test={test} showInstructions={showInstructions} showLegend={showLegend} />
              </div>
              <div className="questions-list" style={{ gap: `${gap}px` }}>
                {flatQuestions.map(({ question, index }, i) => (
                  <div key={i} data-q-index={i}>
                    <QuestionBlock question={question} index={index} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </TestSheetProvider>
    )
  }

  return (
    <TestSheetProvider {...ctx}>
      <div className="pages-container" ref={pagesRef}>
        {pages.map((pageIndices, pageNum) => (
          <div key={pageNum} className="page" style={pageStyle}>
            <div className="page-content" style={contentStyle}>
              {pageNum === 0 && <Header test={test} showInstructions={showInstructions} showLegend={showLegend} />}
              <div className="questions-list" style={{ gap: `${gap}px` }}>
                {pageIndices.map(i => {
                  const { question, index } = flatQuestions[i]
                  return <QuestionBlock key={i} question={question} index={index} />
                })}
              </div>
            </div>
            <div className="page-number no-print">
              {pageNum + 1} / {pages.length} — {pageIndices.length} domande
              {debugInfo && pageNum === 0 && (
                <span style={{ marginLeft: '1rem', fontSize: '0.6rem', color: '#888' }}>
                  contenuto: {debugInfo.availableHeight}px | header: {debugInfo.headerHeight}px
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </TestSheetProvider>
  )
}
