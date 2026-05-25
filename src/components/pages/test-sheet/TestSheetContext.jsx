import { createContext, useContext } from 'react'

const TestSheetContext = createContext({
  fontSize: 13,
  gap: 8,
  marginBottom: 10,
  fontFamily: 'Georgia, "Times New Roman", serif',
  showAnswers: false,
  correctionMode: false,
  studentScores: {},
  studentAnswers: {},
  onScore: null,   // (colLabel, value) => void
  onAnswer: null,  // (colLabel, rawValue) => void
  markedOptionOrigins: [], // original option indices selected by the student (for border highlight)
})

export function TestSheetProvider({
  fontSize, gap, marginBottom, fontFamily, showAnswers,
  correctionMode = false, studentScores = {}, studentAnswers = {},
  onScore = null, onAnswer = null,
  markedOptionOrigins = [],
  children,
}) {
  return (
    <TestSheetContext.Provider value={{
      fontSize, gap, marginBottom, fontFamily, showAnswers,
      correctionMode, studentScores, studentAnswers, onScore, onAnswer,
      markedOptionOrigins,
    }}>
      {children}
    </TestSheetContext.Provider>
  )
}

export function useTestSheet() {
  return useContext(TestSheetContext)
}
