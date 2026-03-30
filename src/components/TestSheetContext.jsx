import { createContext, useContext } from 'react'

const TestSheetContext = createContext({
  fontSize: 13,
  gap: 8,
  marginBottom: 10,
  fontFamily: 'Georgia, "Times New Roman", serif',
})

export function TestSheetProvider({ fontSize, gap, marginBottom, fontFamily, children }) {
  return (
    <TestSheetContext.Provider value={{ fontSize, gap, marginBottom, fontFamily }}>
      {children}
    </TestSheetContext.Provider>
  )
}

export function useTestSheet() {
  return useContext(TestSheetContext)
}
