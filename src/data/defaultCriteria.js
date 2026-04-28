// Default criteria template derived from GRIGLIA.md
// Each open question can override these via a `criteria` field in the test JSON

export const defaultCriteria = [
  {
    definition: "Conoscenze e Competenze tecniche operative",
    type: "concept",
    boolean_questions: [
      "Il concetto principale e' stato identificato correttamente?",
      "I dettagli tecnici sono accurati?",
      "La risposta copre tutti gli aspetti richiesti?",
      "Applica consapevolmente le conoscenze per risolvere il problema?"
    ],
    number: 1,
    required: true,
    severity: 2
  },
  {
    definition: "Competenze di rappresentazione grafica e simbolismo di settore",
    type: "expression",
    boolean_questions: [
      "Le unita' di misura sono appropriate?",
      "Gli schemi o grafici (se presenti) sono corretti?",
      "Il simbolismo tecnico e' usato correttamente?"
    ],
    number: 2,
    required: false,
    severity: 1
  },
  {
    definition: "Competenze Logico-Argomentative e uso del linguaggio specifico",
    type: "expression",
    boolean_questions: [
      "Il procedimento risolutivo e' esposto in forma chiara?",
      "Mostra capacita' di analisi e sintesi?",
      "Il linguaggio tecnico e' usato in modo appropriato?"
    ],
    number: 3,
    required: true,
    severity: 1
  }
]

export const rubricLevels = {
  i1: {
    label: "I1: Conoscenze e Competenze tecniche operative",
    levels: [
      { value: 5, desc: "Conoscenza completa, eccellente dettaglio. Svolgimento completo, senza imprecisioni." },
      { value: 4.5, desc: "Conoscenza completa, ottimo dettaglio. Svolgimento completo, pochissime imprecisioni." },
      { value: 4, desc: "Conoscenza completa, buon dettaglio. Svolgimento completo, poche imprecisioni/errori marginali." },
      { value: 3.5, desc: "Conoscenza non del tutto completa, discreto dettaglio. Svolgimento completo, alcune imprecisioni." },
      { value: 3, desc: "Conoscenza non del tutto completa, accettabile dettaglio. Svolgimento essenziale, alcune imprecisioni." },
      { value: 2.5, desc: "Conoscenza limitata ed imprecisa. Svolgimento non completo, pochi errori significativi." },
      { value: 2, desc: "Conoscenza molto limitata ed imprecisa. Svolgimento non completo, carenze rilevanti." },
      { value: 1.5, desc: "Molteplici e gravi lacune. Svolgimento non completo, molteplici carenze." },
      { value: 1, desc: "Conoscenze assenti. Consegna in bianco o svolgimento appena accennato." },
    ]
  },
  i2: {
    label: "I2: Rappresentazione grafica e simbolismo",
    levels: [
      { value: 5, desc: "Ricche ed appropriate." },
      { value: 4, desc: "Appropriate." },
      { value: 3, desc: "Elementari." },
      { value: 2, desc: "Commette gravi errori nelle tecniche di rappresentazione." },
      { value: 1, desc: "Consegna in bianco o competenze quasi assenti." },
    ]
  },
  i3: {
    label: "I3: Competenze Logico-Argomentative",
    levels: [
      { value: 5, desc: "Ottime competenze; contenuti articolati e completi." },
      { value: 4, desc: "Buone competenze; contenuti adeguati." },
      { value: 3, desc: "Sufficienti competenze; contenuti essenziali." },
      { value: 2, desc: "Competenze quasi assenti; contenuti disorganici." },
      { value: 1, desc: "Consegna in bianco / Competenze assenti." },
    ]
  }
}
