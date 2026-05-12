import ContentRenderer from '@/components/shared/ContentRenderer'
import { useTestSheet } from './TestSheetContext'

/** @typedef {import('@/schema').Question} Question */

/**
 * @param {{ question: Question, index: number }} props
 */
export default function QuestionBlock({ question, index }) {
  const { fontSize, showAnswers } = useTestSheet()
  const content = question.content
    ? question.content
    : [{ kind: 'text', value: question.text }]

  return (
    <div className="question-block">
      <div className="question-number">
        <span>{index + 1}</span>
      </div>
      <div className={`question-body${question.type === 'filler' ? ' question-body-bottom' : ''}`}>
        <div className="question-body-content">
          {question.type === 'trueFalse' ? (
            <div className="question-inline-row">
              <ContentRenderer content={content} questionIndex={index} />
              <span className="tf-options">
                <span className={`tf-option${showAnswers && question.answer === true ? ' answer-correct' : ''}`}>V</span>
                <span className={`tf-option${showAnswers && question.answer === false ? ' answer-correct' : ''}`}>F</span>
              </span>
            </div>
          ) : question.type === 'multipleChoice' ? (
            <div>
              <ContentRenderer content={content} questionIndex={index} />
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
                      {opt}
                    </span>
                  )
                })}
              </div>
            </div>
          ) : question.type === 'orderItems' ? (
            <div>
              <ContentRenderer content={content} questionIndex={index} />
              <div className="oi-items" style={{ fontSize: `${fontSize}px` }}>
                {question.items.map((item, i) => (
                  <span key={i} className="oi-item">
                    <span className="oi-box">{showAnswers ? question.answer.indexOf(i) + 1 : ''}</span>
                    {item}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <>
              <ContentRenderer content={content} questionIndex={index} fillerAnswers={question.type === 'filler' ? question.answer : undefined} />
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
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
