export const TYPE_LABELS = { mqma: 'MQMA', mc: 'MC', tf: 'V/F', filler: 'fill', open: 'aperta' }

/**
 * Given a question's options/answer and a shuffle map (shuffleMap[displayPos] = origIdx),
 * returns the options and answer in display order.
 * Storage always uses original JSON indices; this is for visualization only.
 */
export function applyOptionShuffle(options, answer, shuffleMap) {
  if (!shuffleMap || !Array.isArray(options)) {
    return { displayOptions: options, displayAnswer: answer }
  }
  const displayOptions = shuffleMap.map(origIdx => options[origIdx])
  if (Array.isArray(answer)) {
    const displayAnswer = shuffleMap.map((orig, di) => answer.includes(orig) ? di : -1).filter(d => d >= 0)
    return { displayOptions, displayAnswer }
  }
  const di = shuffleMap.indexOf(answer)
  return { displayOptions, displayAnswer: di >= 0 ? di : answer }
}

export const TYPE_ORDER = { tf: 0, mc: 1, mqma: 2, filler: 3, open: 4 }

export function flattenQuestions(testData) {
  const result = []
  if (!Array.isArray(testData.questions)) return result
  testData.questions.forEach(item => {
    if (item.pin) return
    if (Array.isArray(item.questions)) {
      item.questions.forEach(q => { if (!q.skip) result.push(q) })
    } else if (!item.skip) {
      result.push(item)
    }
  })
  return result
}

export function buildColumns(questions, answerShuffles = {}) {
  const cols = []
  questions.forEach((q, qi) => {
    const label = `D${qi + 1}`
    const shuffle = answerShuffles[qi]
    switch (q.type) {
      case 'multipleChoice':
        if (q.multi && Array.isArray(q.answer) && Array.isArray(q.options)) {
          const iterOrder = shuffle ?? q.options.map((_, i) => i)
          iterOrder.forEach(origIdx => {
            cols.push({
              qIdx: qi, qLabel: label,
              colLabel: `${label}[${origIdx + 1}]`,
              optIdx: origIdx,
              type: 'mqma',
              expected: q.answer.includes(origIdx) ? '✓' : '✗',
              maxPts: 1,
            })
          })
        } else {
          const { displayAnswer } = applyOptionShuffle(q.options, q.answer, shuffle)
          const letter = String.fromCharCode(65 + displayAnswer)
          cols.push({
            qIdx: qi, qLabel: label,
            colLabel: label,
            type: 'mc',
            expected: letter,
            maxPts: 1,
          })
        }
        break
      case 'trueFalse':
        cols.push({
          qIdx: qi, qLabel: label,
          colLabel: label,
          type: 'tf',
          expected: q.answer ? 'V' : 'F',
          maxPts: 1,
        })
        break
      case 'filler': {
        const answers = Array.isArray(q.answer) ? q.answer : [q.answer]
        answers.forEach((ans, bi) => {
          cols.push({
            qIdx: qi, qLabel: label,
            colLabel: answers.length > 1 ? `${label}[${bi + 1}]` : label,
            type: 'filler',
            expected: String(ans),
            maxPts: 1,
          })
        })
        break
      }
      case 'open':
        cols.push({
          qIdx: qi, qLabel: label,
          colLabel: label,
          type: 'open',
          expected: q.linesNumber ? `${q.linesNumber} righe` : '—',
          maxPts: 3,
        })
        break
      default:
        break
    }
  })
  return cols
}

export function groupCols(cols) {
  const groups = []
  cols.forEach(col => {
    const last = groups[groups.length - 1]
    if (last && last.qIdx === col.qIdx) {
      last.cols.push(col)
    } else {
      groups.push({ qIdx: col.qIdx, qLabel: col.qLabel, cols: [col] })
    }
  })
  return groups
}

export function sortGroupsByType(groups) {
  return [...groups].sort((a, b) => {
    const ta = TYPE_ORDER[a.cols[0]?.type] ?? 99
    const tb = TYPE_ORDER[b.cols[0]?.type] ?? 99
    return ta - tb
  })
}

export function orderGroupsByRow(groups, order) {
  const posMap = {}
  order.forEach((qIdx, pos) => { posMap[qIdx] = pos })
  return [...groups].sort((a, b) => (posMap[a.qIdx] ?? 999) - (posMap[b.qIdx] ?? 999))
}
