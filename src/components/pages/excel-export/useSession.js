import { useState, useEffect, useCallback, useRef } from 'react'
import { fetchSession, putSession, storageKey } from './api.js'
import { makeStudent } from './scoring.js'

const SAVE_LABELS = {
  pending: 'In attesa…',
  saving:  'Salvataggio…',
  saved:   '✓ Salvato',
  error:   '✗ Errore',
}

export function useSession(test) {
  const [students, setStudents] = useState([])
  const [weights, setWeights] = useState({})
  const [saveStatus, setSaveStatus] = useState('idle')
  const [ready, setReady] = useState(false)

  const saveTimerRef = useRef(null)
  const fadeTimerRef = useRef(null)

  // Load: try API first, fall back to localStorage
  useEffect(() => {
    let cancelled = false
    const lsKey = storageKey(test)
    ;(async () => {
      let s = [], w = {}
      try {
        const data = await fetchSession(test)
        if (data) {
          s = Array.isArray(data.students) ? data.students : []
          w = data.weights ?? {}
        } else {
          throw new Error('not found')
        }
      } catch {
        try {
          const saved = JSON.parse(localStorage.getItem(lsKey))
          if (saved) {
            if (Array.isArray(saved)) { s = saved }
            else { s = Array.isArray(saved.students) ? saved.students : []; w = saved.weights ?? {} }
          }
        } catch {}
      }
      if (!cancelled) { setStudents(s); setWeights(w); setReady(true) }
    })()
    return () => { cancelled = true }
  }, [test]) // eslint-disable-line react-hooks/exhaustive-deps

  // Autosave: debounce 600ms → PUT to API, also keep localStorage in sync
  useEffect(() => {
    if (!ready) return
    const lsKey = storageKey(test)
    localStorage.setItem(lsKey, JSON.stringify({ students, weights }))

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current)
    setSaveStatus('pending')

    saveTimerRef.current = setTimeout(async () => {
      setSaveStatus('saving')
      try {
        await putSession(test, students, weights)
        setSaveStatus('saved')
        fadeTimerRef.current = setTimeout(() => setSaveStatus('idle'), 2000)
      } catch {
        setSaveStatus('error')
      }
    }, 600)
  }, [ready, students, weights]) // eslint-disable-line react-hooks/exhaustive-deps

  const updateName = useCallback((id, name) => {
    setStudents(prev => prev.map(s => s.id === id ? { ...s, name } : s))
  }, [])

  const updateScore = useCallback((id, colLabel, value) => {
    setStudents(prev => prev.map(s =>
      s.id === id ? { ...s, scores: { ...s.scores, [colLabel]: value } } : s
    ))
  }, [])

  const updateNote = useCallback((id, colLabel, note) => {
    setStudents(prev => prev.map(s =>
      s.id === id ? { ...s, notes: { ...s.notes, [colLabel]: note } } : s
    ))
  }, [])

  const updateAnswer = useCallback((id, colLabel, value) => {
    setStudents(prev => prev.map(s =>
      s.id === id ? { ...s, answers: { ...s.answers, [colLabel]: value } } : s
    ))
  }, [])

  const updateRow = useCallback((id, row) => {
    setStudents(prev => prev.map(s => s.id === id ? { ...s, row } : s))
  }, [])

  const updateWeight = useCallback((qIdx, value) => {
    setWeights(prev => ({ ...prev, [qIdx]: value === '' ? '' : parseFloat(value) || 0 }))
  }, [])

  const addStudent = useCallback((name = '') => {
    const s = makeStudent(name)
    setStudents(prev => [...prev, s])
    return s.id
  }, [])

  const removeStudent = useCallback((id) => {
    setStudents(prev => prev.filter(s => s.id !== id))
  }, [])

  const saveLabel = SAVE_LABELS[saveStatus] ?? ''

  return {
    students, weights, ready, saveStatus, saveLabel,
    updateName, updateScore, updateNote, updateAnswer, updateRow, updateWeight,
    addStudent, removeStudent,
  }
}
