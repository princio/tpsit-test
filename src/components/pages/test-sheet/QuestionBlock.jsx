import ContentRenderer, { InlineText } from '@/components/shared/ContentRenderer'
import { useTestSheet } from './TestSheetContext'

/** @typedef {import('@/schema').Question} Question */

// ─── Correction cell primitives ───────────────────────────────────────────────

function ToggleCorrection({ value, onChange }) {
  const cls = value === 1 ? 'corr-cell-correct' : value === 0 ? 'corr-cell-wrong' : 'corr-cell-empty'
  return (
    <button className={`corr-cell ${cls}`} onClick={() => {
      if (value === '' || value == null) onChange(1)
      else if (value === 1) onChange(0)
      else onChange(1)
    }}>
      {value === 1 ? '1' : value === 0 ? '0' : '·'}
    </button>
  )
}

function LevelCorrection({ value, onChange }) {
  const labels = { 3: 'corr-cell-correct', 2: 'corr-cell-partial-high', 1: 'corr-cell-partial-low', 0: 'corr-cell-wrong' }
  const cls = value != null && value !== '' ? labels[value] ?? 'corr-cell-empty' : 'corr-cell-empty'
  return (
    <button className={`corr-cell ${cls}`} onClick={() => {
      if (value == null || value === '') onChange(3)
      else if (value >= 3) onChange(0)
      else onChange(value + 1)
    }}>
      {value != null && value !== '' ? String(value) : '·'}
    </button>
  )
}

// ─── Main block ───────────────────────────────────────────────────────────────

/**
 * @param {{ question: Question, index: number }} props
 */
export default function QuestionBlock({ question, index }) {
  const { fontSize, showAnswers, correctionMode, studentScores, studentAnswers, onScore, onAnswer } = useTestSheet()
  const content = question.content
    ? question.content
    : [{ kind: 'text', value: question.text }]

  // Flat index attached by buildRowTest; null when not in row-based print mode
  const fi = question._fi ?? null
  const baseLabel = fi !== null ? `D${fi + 1}` : null

  function scoreAndAnswer(colLabel, score, rawAnswer) {
    onScore?.(colLabel, score)
    onAnswer?.(colLabel, rawAnswer)
  }

  // ── Correction overlays ────────────────────────────────────────────────────

  function McCorrection({ options, answer, multi }) {
    return (
      <div className="mc-options" style={{ fontSize: `${fontSize}px` }}>
        {options.map((opt, i) => {
          if (multi) {
            // MQMA: store scores/answers by original option index, not shuffled position
            const origIdx = question._shuffle ? question._shuffle[i] : i
            const colLabel = `${baseLabel}[${origIdx + 1}]`
            const selected = !!studentAnswers[colLabel]
            const isCorrect = Array.isArray(answer) && answer.includes(i)
            const boxClass =
              (!selected && !isCorrect) ? '' :
              (!selected &&  isCorrect) ? ' mc-box-missed' :
              ( selected && !isCorrect) ? ' mc-box-wrong' :
                                          ' mc-box-correct'
            return (
              <span
                key={i}
                className="mc-option corr-option"
                onClick={() => {
                  const nowSelected = !selected
                  onAnswer?.(colLabel, nowSelected)
                  options.forEach((_, j) => {
                    const origJ = question._shuffle ? question._shuffle[j] : j
                    const jLabel = `${baseLabel}[${origJ + 1}]`
                    const jSel = j === i ? nowSelected : !!studentAnswers[jLabel]
                    const jIsCorrect = Array.isArray(answer) && answer.includes(j)
                    onScore?.(jLabel, (jSel === jIsCorrect) ? 1 : 0)
                  })
                }}
              >
                <span className={`mc-box mc-box-square${boxClass}`}>{(selected || isCorrect) ? '✕' : ''}</span>
                <span><InlineText value={opt} /></span>
              </span>
            )
          } else {
            // MC: store answer by original option index, not shuffled position
            const origIdx = question._shuffle ? question._shuffle[i] : i
            const selected = studentAnswers[baseLabel] === origIdx
            const correct = i === answer
            return (
              <span
                key={i}
                className={`mc-option corr-option${selected ? (correct ? ' corr-right' : ' corr-err') : ''}`}
                onClick={() => scoreAndAnswer(baseLabel, correct ? 1 : 0, origIdx)}
              >
                <span className="mc-box">{selected ? '✕' : ''}</span>
                <span><InlineText value={opt} /></span>
              </span>
            )
          }
        })}
      </div>
    )
  }

  function TfCorrection({ answer }) {
    const sel = studentAnswers[baseLabel]  // true = student clicked V, false = F
    const vScore = studentScores[baseLabel]
    return (
      <span className="tf-options">
        <span
          className={`tf-option corr-option${sel === true ? (answer === true ? ' corr-right' : ' corr-err') : ''}`}
          onClick={() => scoreAndAnswer(baseLabel, answer === true ? 1 : 0, true)}
        >V{sel === true && <span className="tf-mark">✕</span>}</span>
        <span
          className={`tf-option corr-option${sel === false && sel !== undefined ? (answer === false ? ' corr-right' : ' corr-err') : ''}`}
          onClick={() => scoreAndAnswer(baseLabel, answer === false ? 1 : 0, false)}
        >F{sel === false && sel !== undefined && <span className="tf-mark">✕</span>}</span>
        {vScore != null && vScore !== '' && (
          <span className={`corr-score-badge ${vScore === 1 ? 'corr-right' : 'corr-err'}`}>{vScore}</span>
        )}
      </span>
    )
  }

  function FillerCorrection({ answer }) {
    const answers = Array.isArray(answer) ? answer : [answer]
    return (
      <div className="corr-filler-row">
        {answers.map((_, bi) => {
          const colLabel = answers.length > 1 ? `${baseLabel}[${bi + 1}]` : baseLabel
          return (
            <ToggleCorrection
              key={bi}
              value={studentScores[colLabel]}
              onChange={v => onScore?.(colLabel, v)}
            />
          )
        })}
      </div>
    )
  }

  function OpenCorrection() {
    return (
      <LevelCorrection
        value={studentScores[baseLabel]}
        onChange={v => onScore?.(baseLabel, v)}
      />
    )
  }

  // ── Normal render (no correction) ──────────────────────────────────────────

  let isCorrected = true
  if (correctionMode && baseLabel) {
    if (question.type === 'multipleChoice') {
      if (question.multi) {
        isCorrected = question.options.every((_, i) => {
          const origI = question._shuffle ? question._shuffle[i] : i
          return studentAnswers[`${baseLabel}[${origI + 1}]`] != null
        })
      } else {
        isCorrected = studentAnswers[baseLabel] != null
      }
    } else if (question.type === 'trueFalse') {
      isCorrected = studentAnswers[baseLabel] != null
    } else if (question.type === 'filler') {
      const ans = Array.isArray(question.answer) ? question.answer : [question.answer]
      isCorrected = ans.some((_, bi) => {
        const lbl = ans.length > 1 ? `${baseLabel}[${bi + 1}]` : baseLabel
        return studentScores[lbl] != null && studentScores[lbl] !== ''
      })
    } else if (question.type === 'open') {
      isCorrected = studentScores[baseLabel] != null && studentScores[baseLabel] !== ''
    }
  }

  return (
    <div className={`question-block${correctionMode && baseLabel && !isCorrected ? ' question-pending' : ''}`}>
      <div className="question-number">
        <span>{index + 1}</span>
      </div>
      <div className={`question-body${question.type === 'filler' ? ' question-body-bottom' : ''}`}>
        <div className="question-body-content">
          {question.type === 'trueFalse' ? (
            <div className="question-inline-row">
              <ContentRenderer content={content} questionIndex={index} />
              {correctionMode && baseLabel ? (
                <TfCorrection answer={question.answer} />
              ) : (
                <span className="tf-options">
                  <span className={`tf-option${showAnswers && question.answer === true ? ' answer-correct' : ''}`}>V</span>
                  <span className={`tf-option${showAnswers && question.answer === false ? ' answer-correct' : ''}`}>F</span>
                </span>
              )}
            </div>
          ) : question.type === 'multipleChoice' ? (
            <div>
              <ContentRenderer content={content} questionIndex={index} />
              {correctionMode && baseLabel ? (
                <McCorrection options={question.options} answer={question.answer} multi={question.multi} />
              ) : (
                <div className="mc-options" style={{ fontSize: `${fontSize}px` }}>
                  {question.options.map((opt, i) => {
                    const isCorrect = showAnswers && (
                      question.multi
                        ? Array.isArray(question.answer) && question.answer.includes(i)
                        : question.answer === i
                    )
                    return (
                      <span key={i} className={`mc-option${isCorrect ? ' answer-correct' : ''}`}>
                        <span className={question.multi ? 'mc-box mc-box-square' : 'mc-box'} />
                        <span><InlineText value={opt} /></span>
                      </span>
                    )
                  })}
                </div>
              )}
            </div>
          ) : question.type === 'orderItems' ? (
            <div>
              <ContentRenderer content={content} questionIndex={index} />
              <div className="oi-items" style={{ fontSize: `${fontSize}px` }}>
                {question.items.map((item, i) => (
                  <span key={i} className="oi-item">
                    <span className="oi-box">{showAnswers ? question.answer.indexOf(i) + 1 : ''}</span>
                    <span><InlineText value={item} /></span>
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <>
              <ContentRenderer
                content={content}
                questionIndex={index}
                fillerAnswers={question.type === 'filler' ? question.answer : undefined}
                blankSizes={question.type === 'filler' ? question.blankSize : undefined}
              />
              {correctionMode && baseLabel && question.type === 'filler' && (
                <FillerCorrection answer={question.answer} />
              )}
              {showAnswers && question.answer != null && (
                <div className="answer-reveal">
                  {Array.isArray(question.answer) ? question.answer.join(', ') : question.answer}
                </div>
              )}
            </>
          )}

          {question.type === 'open' && (
            <div className="open-answer-lines">
              {Array.from({ length: question.linesNumber ?? 2 }).map((_, i) => (
                <span key={i} className="open-line" />
              ))}
              {correctionMode && baseLabel && (
                <OpenCorrection />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
