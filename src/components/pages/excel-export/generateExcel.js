import * as XLSX from 'xlsx'
import { getWeight, getTotalWeight, computeTotals } from './scoring.js'

export default function generateExcel(test, cols, groups, weights, students) {
  const wb = XLSX.utils.book_new()
  const tw = getTotalWeight(groups, weights)
  const hasRows = test.rows?.length > 0

  const row0 = ['Domanda']
  const row1 = ['Colonna']
  const row2 = ['Tipo']
  const row3 = ['Atteso']
  const row4 = ['Peso']

  if (hasRows) { row0.push('Fila'); row1.push(''); row2.push(''); row3.push(''); row4.push('') }

  groups.forEach(g => {
    const w = getWeight(weights, g.qIdx)
    row0.push(g.qLabel + (g.cols.length > 1 ? ` (×${g.cols.length})` : ''))
    for (let i = 1; i < g.cols.length; i++) row0.push('')
    row4.push(w)
    for (let i = 1; i < g.cols.length; i++) row4.push('')
    g.cols.forEach(c => {
      row1.push(c.colLabel)
      row2.push(c.type)
      row3.push(c.expected)
    })
  })

  row0.push('TOT_R', '/10_R', 'TOT_D', '/10_D')
  row1.push('', '', '', '')
  row2.push('', '', '', '')
  row3.push(tw, '', tw, '')
  row4.push('', '', '', '')

  const aoa = [row0, row1, row2, row3, row4]

  students.forEach(student => {
    const { totCells, totQuestions } = computeTotals(student, groups, weights)
    const gradeCells = tw > 0 ? Math.round(totCells / tw * 10 * 10) / 10 : 0
    const gradeQuestions = tw > 0 ? Math.round(totQuestions / tw * 10 * 10) / 10 : 0
    const row = [student.name]
    if (hasRows) row.push(student.row || '')
    cols.forEach(c => {
      const v = student.scores[c.colLabel]
      row.push(v !== '' && v != null ? v : '')
    })
    row.push(
      Math.round(totCells * 100) / 100,
      gradeCells,
      Math.round(totQuestions * 100) / 100,
      gradeQuestions,
    )
    aoa.push(row)
  })

  const ws = XLSX.utils.aoa_to_sheet(aoa)

  const merges = []
  let cIdx = 1
  groups.forEach(g => {
    if (g.cols.length > 1) {
      merges.push({ s: { r: 0, c: cIdx }, e: { r: 0, c: cIdx + g.cols.length - 1 } })
      merges.push({ s: { r: 4, c: cIdx }, e: { r: 4, c: cIdx + g.cols.length - 1 } })
    }
    cIdx += g.cols.length
  })
  if (merges.length > 0) ws['!merges'] = merges

  ws['!cols'] = [
    { wch: 22 },
    ...cols.map(c => ({ wch: c.type === 'mqma' ? 7 : c.type === 'open' ? 8 : 10 })),
    { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 },
  ]

  XLSX.utils.book_append_sheet(wb, ws, 'Correzione')

  const hasNotes = students.some(s => Object.values(s.notes || {}).some(n => n))
  if (hasNotes) {
    const noteHeader = ['Studente', ...cols.map(c => c.colLabel)]
    const noteRows = students.map(s => [
      s.name,
      ...cols.map(c => s.notes?.[c.colLabel] || ''),
    ])
    const wsNotes = XLSX.utils.aoa_to_sheet([noteHeader, ...noteRows])
    wsNotes['!cols'] = [{ wch: 22 }, ...cols.map(() => ({ wch: 20 }))]
    XLSX.utils.book_append_sheet(wb, wsNotes, 'Note')
  }

  const safeTitle = (test.title || 'verifica').replace(/\s+/g, '-').toLowerCase()
  XLSX.writeFile(wb, `griglia-${safeTitle}.xlsx`)
}
