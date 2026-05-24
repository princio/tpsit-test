// Derives the score for a single column from raw student answers.
// Returns null if the answer hasn't been recorded (leave cell empty, allow manual entry).
export function computeScoreFromAnswer(col, question, answers) {
  if (!answers || !question) return null
  const raw = answers[col.colLabel]
  switch (col.type) {
    case 'mc':
      if (raw == null) return null
      return raw === question.answer ? 1 : 0
    case 'mqma':
      if (raw == null) return null
      return (!!raw === (Array.isArray(question.answer) && question.answer.includes(col.optIdx))) ? 1 : 0
    case 'tf':
      if (raw == null) return null
      return raw === question.answer ? 1 : 0
    default:
      return null
  }
}

export function makeStudent(name = '') {
  return { id: Date.now().toString() + Math.random(), name, row: '', scores: {}, notes: {}, answers: {} }
}

export function getWeight(weights, qIdx) {
  const v = weights[qIdx]
  if (v === '' || v == null) return 1
  return parseFloat(v) || 0
}

export function getTotalWeight(groups, weights) {
  return groups.reduce((s, g) => s + getWeight(weights, g.qIdx), 0)
}

export function computeTotals(student, groups, weights) {
  let totCells = 0, totQuestions = 0
  groups.forEach(g => {
    const w = getWeight(weights, g.qIdx)
    let sumScore = 0, sumMax = 0, allCorrect = true
    g.cols.forEach(c => {
      const cellMax = c.type === 'open' ? 3 : 1
      const v = student.scores[c.colLabel]
      const val = v !== '' && v != null ? parseFloat(v) || 0 : 0
      sumScore += val
      sumMax += cellMax
      if (val < cellMax) allCorrect = false
    })
    const pct = sumMax > 0 ? sumScore / sumMax : 0
    totCells += pct * w
    totQuestions += allCorrect ? w : 0
  })
  return { totCells, totQuestions }
}
