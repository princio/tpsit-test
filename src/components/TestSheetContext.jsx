import { createContext, useContext } from 'react'

const TestSheetContext = createContext({
  fontSize: 13,
  gap: 8,
  marginBottom: 10,
  fontFamily: 'Georgia, "Times New Roman", serif',
  showAnswers: false,
})

export function TestSheetProvider({ fontSize, gap, marginBottom, fontFamily, showAnswers, children }) {
  return (
    <TestSheetContext.Provider value={{ fontSize, gap, marginBottom, fontFamily, showAnswers }}>
      {children}
    </TestSheetContext.Provider>
  )
}

export function useTestSheet() {
  return useContext(TestSheetContext)
}
