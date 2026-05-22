/**
 * Schema canonico dei file di test (JSON) usato dall'intera webapp.
 * Tutte le pagine (FilePicker, TestSheet, ManipulatorPage, CorrectionPage,
 * OpenCorrectionPage) devono fare riferimento a questi tipi.
 *
 * Convenzione: i file `.json` caricati dall'utente devono soddisfare {@link TestData}.
 * Per un controllo a runtime usare {@link validateTest}.
 */

// ──────────────────────────────────────────────────────────────────────────────
// Content blocks
// ──────────────────────────────────────────────────────────────────────────────

export interface TextBlock {
  kind: 'text'
  /** Markdown-light: i `____` (>=2 underscore) diventano blank in domande filler;
   *  i testi tra backtick (\`...\`) diventano `<code>` inline. */
  value: string
}

export interface CodeBlock {
  kind: 'code'
  language?: string
  value: string
}

export interface MermaidBlock {
  kind: 'mermaid'
  value: string
}

export interface ImageBlock {
  kind: 'image'
  /** URL o data URI. */
  value: string
  alt?: string
}

/** Diagramma di Gantt mono-riga per scheduling.
 *  Le slice sono contigue (nessun gap): ogni slice ha solo `pid` e `duration`,
 *  e gli istanti `start`/`end` sono calcolati cumulativamente dal renderer.
 *  Ogni cella mostra `pid` al centro, `start` in basso a sinistra e `end` in
 *  basso a destra; la larghezza è proporzionale a `duration`. */
export interface GanttBlock {
  kind: 'gantt'
  slices: { pid: string; duration: number }[]
}

/** Tabella semplice. Le celle accettano lo stesso markdown-light di {@link TextBlock}
 *  (backtick → inline code). `headers` è opzionale: se assente, viene renderizzato
 *  un body-only. */
export interface TableBlock {
  kind: 'table'
  headers?: string[]
  rows: string[][]
}

export type ContentBlock =
  | TextBlock
  | CodeBlock
  | MermaidBlock
  | ImageBlock
  | GanttBlock
  | TableBlock

// ──────────────────────────────────────────────────────────────────────────────
// Domande
// ──────────────────────────────────────────────────────────────────────────────

interface BaseQuestion {
  /** Se true, la domanda viene esclusa dal rendering e dal conteggio. */
  skip?: boolean
  /** Se true, la domanda non viene riposizionata durante lo shuffle. */
  pin?: boolean
  /** Prompt testuale. Mutualmente esclusivo con {@link content}. */
  text?: string
  /** Prompt strutturato come blocchi (testo + codice + mermaid + immagini).
   *  Mutualmente esclusivo con {@link text}. */
  content?: ContentBlock[]
}

/** Vero/Falso. */
export interface TrueFalseQuestion extends BaseQuestion {
  type: 'trueFalse'
  /** `true` = "Vero" corretto, `false` = "Falso" corretto. Opzionale: se assente,
   *  la soluzione non viene evidenziata in modalità "Risposte". */
  answer?: boolean
}

/** Scelta multipla a risposta singola (default). */
export interface MultipleChoiceSingleQuestion extends BaseQuestion {
  type: 'multipleChoice'
  multi?: false
  options: string[]
  /** Indice (0-based) dell'opzione corretta. */
  answer?: number
}

/** Scelta multipla a risposta multipla (`multi: true`).
 *  Le opzioni elencate in `answer` sono tutte corrette. */
export interface MultipleChoiceMultiQuestion extends BaseQuestion {
  type: 'multipleChoice'
  multi: true
  options: string[]
  /** Indici (0-based) di tutte le opzioni corrette. */
  answer?: number[]
}

export type MultipleChoiceQuestion =
  | MultipleChoiceSingleQuestion
  | MultipleChoiceMultiQuestion

/** Completamento: ogni `____` nel `text` (o nei blocchi `text`/`code` di
 *  `content`) viene sostituito da un input. */
export interface FillerQuestion extends BaseQuestion {
  type: 'filler'
  /** Soluzioni per ciascun blank, in ordine di apparizione. È accettata anche
   *  una singola stringa quando il blank è uno solo. */
  answer?: string[] | string
  /** Numero di underscore (larghezza) di ciascun blank in stampa, in ordine di
   *  apparizione (parallelo a `answer`). Default per ciascun blank: 10 se
   *  l'entry corrispondente è mancante. Tenere una larghezza fissa evita di
   *  rivelare la lunghezza della soluzione. */
  blankSize?: number[]
}

/** Ordinamento: lo studente deve riordinare `items`. */
export interface OrderItemsQuestion extends BaseQuestion {
  type: 'orderItems'
  items: string[]
  /** `answer[k]` è l'indice dell'elemento in `items` che deve trovarsi
   *  nella posizione k della sequenza corretta. */
  answer: number[]
}

/** Risposta aperta (free-text). */
export interface OpenQuestion extends BaseQuestion {
  type: 'open'
  /** Soluzione di riferimento (opzionale). */
  answer?: string
  /** Numero di righe vuote da riservare nello sheet stampato. Default: 2. */
  linesNumber?: number
}

export type Question =
  | TrueFalseQuestion
  | MultipleChoiceQuestion
  | FillerQuestion
  | OrderItemsQuestion
  | OpenQuestion

export type QuestionType = Question['type']

/** Separatore visivo tra sezioni/argomenti. Non contiene domande. */
export interface ConceptSeparator {
  concept: string
  pin?: boolean
}

/** Gruppo di domande con contenuto condiviso mostrato una sola volta prima di tutte le domande. */
export interface QuestionGroup {
  content?: ContentBlock[]
  questions: Question[]
  pin?: boolean
}

/** @deprecated Usa {@link ConceptSeparator} per i separatori e {@link QuestionGroup} per i gruppi. */
export interface ConceptGroup extends QuestionGroup {
  concept: string
}

/** Elemento di livello superiore in `TestData.questions`. */
export type QuestionItem = Question | ConceptSeparator | QuestionGroup

// ──────────────────────────────────────────────────────────────────────────────
// Test
// ──────────────────────────────────────────────────────────────────────────────

export interface TestData {
  title: string
  /** Anno di corso (es. "terza", "quarta", "quinta"). */
  classe?: string
  /** Materia (es. "sistema-operativo", "ed.civica"). */
  materia?: string
  /** Unità Didattica di Apprendimento — corrisponde alla cartella foglia. */
  uda?: string
  subtitle?: string
  instructions?: string
  /** Mix di domande piatte e/o gruppi `{ concept, questions }`. */
  questions: QuestionItem[]
}

// ──────────────────────────────────────────────────────────────────────────────
// Type guards
// ──────────────────────────────────────────────────────────────────────────────

export function isConceptSeparator(item: unknown): item is ConceptSeparator {
  return (
    !!item &&
    typeof item === 'object' &&
    typeof (item as ConceptSeparator).concept === 'string' &&
    !Array.isArray((item as QuestionGroup).questions)
  )
}

export function isQuestionGroup(item: unknown): item is QuestionGroup {
  return (
    !!item &&
    typeof item === 'object' &&
    Array.isArray((item as QuestionGroup).questions)
  )
}

/** @deprecated Usa {@link isConceptSeparator} o {@link isQuestionGroup}. */
export function isConceptGroup(item: unknown): item is ConceptGroup {
  return isQuestionGroup(item) && typeof (item as ConceptGroup).concept === 'string'
}

export function isQuestion(item: unknown): item is Question {
  return (
    !!item &&
    typeof item === 'object' &&
    typeof (item as Question).type === 'string'
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

/** Espande i gruppi in una lista piatta di domande, scartando quelle con `skip: true`. */
export function flattenQuestions(test: TestData): Question[] {
  const out: Question[] = []
  for (const item of test.questions) {
    if (isQuestionGroup(item)) {
      for (const q of item.questions) if (!q.skip) out.push(q)
    } else if (isQuestion(item) && !item.skip) {
      out.push(item)
    }
  }
  return out
}

// ──────────────────────────────────────────────────────────────────────────────
// Validazione runtime
// ──────────────────────────────────────────────────────────────────────────────

const QUESTION_TYPES: readonly QuestionType[] = [
  'trueFalse',
  'multipleChoice',
  'filler',
  'orderItems',
  'open',
]

/**
 * Valida un payload sconosciuto contro {@link TestData} e lo restituisce tipato.
 * Lancia un `Error` con messaggio descrittivo (path + motivo) al primo problema.
 */
export function validateTest(data: unknown): TestData {
  if (!data || typeof data !== 'object')
    throw new Error('Il file deve essere un oggetto JSON.')

  const t = data as Partial<TestData>
  if (typeof t.title !== 'string' || !t.title.trim())
    throw new Error('Manca il campo "title" (stringa non vuota).')
  if (!Array.isArray(t.questions))
    throw new Error('Manca il campo "questions" (array).')
  if (t.subtitle != null && typeof t.subtitle !== 'string')
    throw new Error('"subtitle" deve essere una stringa.')
  if (t.instructions != null && typeof t.instructions !== 'string')
    throw new Error('"instructions" deve essere una stringa.')

  t.questions.forEach((item, i) => {
    if (isConceptSeparator(item)) {
      if (!item.concept.trim())
        throw new Error(`questions[${i}].concept: deve essere una stringa non vuota.`)
      if (item.pin != null && typeof item.pin !== 'boolean')
        throw new Error(`questions[${i}].pin: deve essere boolean.`)
    } else if (isQuestionGroup(item)) {
      if (item.content != null && !Array.isArray(item.content))
        throw new Error(`questions[${i}].content: deve essere un array di blocchi.`)
      if (item.pin != null && typeof item.pin !== 'boolean')
        throw new Error(`questions[${i}].pin: deve essere boolean.`)
      item.questions.forEach((q: unknown, j: number) =>
        validateQuestion(q, `questions[${i}].questions[${j}]`),
      )
    } else {
      validateQuestion(item as Question, `questions[${i}]`)
    }
  })

  return t as TestData
}

function validateQuestion(q: unknown, path: string): void {
  if (!q || typeof q !== 'object')
    throw new Error(`${path}: deve essere un oggetto.`)

  const obj = q as Record<string, unknown>
  if (typeof obj.type !== 'string' || !QUESTION_TYPES.includes(obj.type as QuestionType))
    throw new Error(
      `${path}: "type" deve essere uno tra ${QUESTION_TYPES.join(', ')} ` +
        `(trovato: ${JSON.stringify(obj.type)}).`,
    )

  if (obj.text != null && typeof obj.text !== 'string')
    throw new Error(`${path}: "text" deve essere una stringa.`)
  if (obj.content != null && !Array.isArray(obj.content))
    throw new Error(`${path}: "content" deve essere un array di blocchi.`)
  if (obj.skip != null && typeof obj.skip !== 'boolean')
    throw new Error(`${path}: "skip" deve essere boolean.`)
  if (obj.pin != null && typeof obj.pin !== 'boolean')
    throw new Error(`${path}: "pin" deve essere boolean.`)

  switch (obj.type) {
    case 'trueFalse':
      if (obj.answer != null && typeof obj.answer !== 'boolean')
        throw new Error(`${path}: "answer" di trueFalse deve essere boolean.`)
      break

    case 'multipleChoice': {
      if (!Array.isArray(obj.options) || obj.options.length < 2)
        throw new Error(`${path}: "options" deve essere un array di almeno 2 stringhe.`)
      if (!obj.options.every(o => typeof o === 'string'))
        throw new Error(`${path}: "options" deve contenere solo stringhe.`)
      const n = obj.options.length

      if (obj.multi === true) {
        if (obj.answer != null) {
          if (!Array.isArray(obj.answer))
            throw new Error(`${path}: "answer" di multipleChoice multi deve essere un array.`)
          // Normalizza: stringhe → indici (per retro-compatibilità).
          const normalized = obj.answer.map((x, k) => {
            if (typeof x === 'string') {
              const i = (obj.options as string[]).indexOf(x)
              if (i < 0) throw new Error(`${path}: "answer[${k}]"=${JSON.stringify(x)} non corrisponde ad alcuna option.`)
              return i
            }
            if (!Number.isInteger(x) || (x as number) < 0 || (x as number) >= n)
              throw new Error(`${path}: "answer[${k}]" deve essere indice 0..${n - 1} (o testo dell'opzione).`)
            return x as number
          })
          if (normalized.length < 2)
            throw new Error(`${path}: "answer" di multipleChoice con multi=true deve contenere almeno 2 indici (altrimenti la domanda non è a risposta multipla — usa multi=false).`)
          obj.answer = normalized
        }
      } else {
        if (obj.answer != null) {
          // Normalizza: stringa → indice (per retro-compatibilità).
          if (typeof obj.answer === 'string') {
            const i = (obj.options as string[]).indexOf(obj.answer)
            if (i < 0) throw new Error(`${path}: "answer"=${JSON.stringify(obj.answer)} non corrisponde ad alcuna option.`)
            obj.answer = i
          } else if (!Number.isInteger(obj.answer) || (obj.answer as number) < 0 || (obj.answer as number) >= n) {
            throw new Error(
              `${path}: "answer" di multipleChoice deve essere un indice intero in 0..${n - 1} (o testo dell'opzione).`,
            )
          }
        }
      }
      break
    }

    case 'filler':
      if (obj.answer != null && !Array.isArray(obj.answer) && typeof obj.answer !== 'string')
        throw new Error(`${path}: "answer" di filler deve essere stringa o array di stringhe.`)
      if (Array.isArray(obj.answer) && !obj.answer.every(x => typeof x === 'string'))
        throw new Error(`${path}: "answer" di filler deve contenere solo stringhe.`)
      break

    case 'orderItems': {
      if (!Array.isArray(obj.items) || obj.items.length < 2)
        throw new Error(`${path}: "items" deve essere un array di almeno 2 stringhe.`)
      if (!obj.items.every(x => typeof x === 'string'))
        throw new Error(`${path}: "items" deve contenere solo stringhe.`)
      const m = obj.items.length
      if (
        !Array.isArray(obj.answer) ||
        obj.answer.length !== m ||
        !obj.answer.every(x => Number.isInteger(x) && (x as number) >= 0 && (x as number) < m)
      )
        throw new Error(
          `${path}: "answer" di orderItems deve essere una permutazione di 0..${m - 1}.`,
        )
      break
    }

    case 'open':
      if (obj.answer != null && typeof obj.answer !== 'string')
        throw new Error(`${path}: "answer" di open deve essere stringa.`)
      if (obj.linesNumber != null && (!Number.isInteger(obj.linesNumber) || (obj.linesNumber as number) < 1))
        throw new Error(`${path}: "linesNumber" di open deve essere un intero >= 1.`)
      break
  }
}
