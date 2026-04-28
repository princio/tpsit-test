import { useState, useRef } from 'react'
import { validateTest } from '../schema'

/** @typedef {import('../schema').TestData} TestData */

/**
 * @param {{ onTestLoaded: (test: TestData) => void }} props
 */
export default function FilePicker({ onTestLoaded }) {
  const [error, setError] = useState(null)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef(null)

  function handleFile(file) {
    if (!file) return
    setError(null)
    const reader = new FileReader()
    reader.onload = (e) => {
      let parsed
      try {
        parsed = JSON.parse(e.target.result)
      } catch {
        setError('Errore nel parsing del JSON. Controlla il formato del file.')
        return
      }
      try {
        const data = validateTest(parsed)
        onTestLoaded(data)
      } catch (err) {
        setError('JSON non conforme allo schema: ' + (err instanceof Error ? err.message : String(err)))
      }
    }
    reader.readAsText(file)
  }

  function handleChange(e) {
    handleFile(e.target.files[0])
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    handleFile(file)
  }

  function handleDragOver(e) {
    e.preventDefault()
    setDragging(true)
  }

  function handleDragLeave() {
    setDragging(false)
  }

  return (
    <div className="file-picker-container">
      <div
        className={`file-picker-card ${dragging ? 'dragging' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
      >
        <div className="file-picker-icon">&#128196;</div>
        <h2>Carica il file JSON del test</h2>
        <p>Trascina il file qui oppure clicca per selezionarlo</p>
        <input
          ref={inputRef}
          type="file"
          accept=".json"
          onChange={handleChange}
          style={{ display: 'none' }}
        />
        {error && <div className="file-picker-error">{error}</div>}
      </div>
    </div>
  )
}
