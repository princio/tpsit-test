import ContentRenderer from './ContentRenderer'


export default function QuestionBlock({ question, index }) {
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
                <span className="tf-option">V</span>
                <span className="tf-option">F</span>
              </span>
            </div>
          ) : question.type === 'multipleChoice' ? (
            <div>
              <ContentRenderer content={content} questionIndex={index} />
              <div className="mc-options">
                {question.options.map((opt, i) => (
                  <span key={i} className="mc-option">
                    <span className="mc-box" />
                    {opt}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <ContentRenderer content={content} questionIndex={index} />
          )}

          {question.type === 'open' && (
            <div className="open-answer-lines">
              <span className="open-line" />
              <span className="open-line" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
