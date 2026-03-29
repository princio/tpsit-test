import { useState, useRef } from 'react'

export default function FilePicker({ onTestLoaded }) {
  const [error, setError] = useState(null)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef(null)

  function handleFile(file) {
    if (!file) return
    setError(null)
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result)
        if (!data.title || !Array.isArray(data.questions)) {
          setError('JSON non valido: deve contenere "title" e "questions".')
          return
        }
        // Flatten concept-grouped questions for compatibility
        const hasGroups = data.questions.some(q => q.concept && Array.isArray(q.questions))
        if (hasGroups) {
          // keep as-is, TestSheet handles both formats
        }
        onTestLoaded(data)
      } catch {
        setError('Errore nel parsing del JSON. Controlla il formato del file.')
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
