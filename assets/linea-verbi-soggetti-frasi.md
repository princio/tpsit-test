# Analisi: Verbi, Soggetti, Frasi e Concetti — `big-picture/linea/`

---

## 1. `1.linea.md` — La linea di esecuzione

| Verbo | Soggetto | Frase | Concetto |
|---|---|---|---|
| **verrà eseguita** | la prossima linea di codice | La linea di esecuzione è la prossima linea di codice che verrà eseguita. | Definizione di linea di esecuzione |
| **chiameremo** | noi | Quella che chiameremo la linea di esecuzione. | Terminologia: linea di esecuzione |
| **dobbiamo aver chiaro** | noi | Per capire i thread dobbiamo aver ben chiaro la linea di esecuzione. | Prerequisito per comprendere i thread |
| **sarà** | la linea di esecuzione | La linea di esecuzione sarà quella evidenziata. | Convenzione di notazione |
| **sarà eseguita** | la prossima linea | La linea evidenziata sarà la prossima linea ad essere eseguita. | Semantica dell'evidenziazione |
| **non è stata eseguita** | la linea evidenziata | La linea evidenziata non è stata ancora eseguita. | Stato della linea evidenziata (non ancora eseguita) |
| **può essere evidenziata** | solo una linea | Solo una linea può essere evidenziata. | Unicità della linea di esecuzione |
| **vengono ignorate** | le linee vuote | Le linee vuote vengono ignorate. | Comportamento delle linee vuote |
| **parte** | il programma | Il programma parte dalla linea #1. | Punto di partenza dell'esecuzione |
| **avanza** | la linea di esecuzione | La linea di esecuzione avanza alla linea #2. | Avanzamento sequenziale |
| **salta** | la linea di esecuzione | La linea di esecuzione salta alla linea #5. | Salto condizionale (if/else) |
| **è (CERTA)** | la sequenza delle linee di esecuzione | La sequenza delle linee di esecuzione è CERTA dato un determinato input. | Determinismo della sequenza dato un input |

---

## 2. `2.prevedibilità.md` — Prevedibilità

| Verbo | Soggetto | Frase | Concetto |
|---|---|---|---|
| **sappiamo con certezza** | noi | Se è noto l'input, sappiamo con certezza quale sarà la sequenza della linea di esecuzione. | Prevedibilità con input noto |
| **sarà sicuramente sotto** | la prossima linea | La prossima linea sarà sicuramente sotto quella attuale. | Flusso sequenziale top-down |
| **non è sempre vero** | (questo) | Questo non è sempre vero, ad esempio nei loop. | Eccezione al flusso top-down: i loop |
| **si entra** | (si) | Si entra nel while dato che nome ha lunghezza zero. | Ingresso nel ciclo while (condizione vera) |
| **procede** | (la linea) | Procede alla richiesta dell'input. | Avanzamento dentro il corpo del loop |
| **riparte / torna su** | (la linea) | Riparte dalla linea #2, ovvero torna sù. | Ritorno all'inizio del loop (salto all'indietro) |
| **è SEMPRE PREVEDIBILE al 100%** | la sequenza della linea di esecuzione | Noto l'input, la sequenza della linea di esecuzione è SEMPRE PREVEDIBILE al 100%. | Determinismo assoluto in single-thread |

---

## 3. `3.linea_thread.md` — I thread e la linea di esecuzione

| Verbo | Soggetto | Frase | Concetto |
|---|---|---|---|
| **succede** | cosa | Cosa succede alla linea di esecuzione quando ho più di un solo thread? | Effetto dei thread sulla linea di esecuzione |
| **ha** | ogni processo | Ogni processo ha almeno un thread, detto main-thread. | Esistenza del main-thread in ogni processo |
| **crea** | questo script | Questo script crea un thread oltre il sempre-presente main-thread. | Creazione di un thread aggiuntivo |
| **viene creato** | un nuovo thread | Qui viene creato un nuovo thread oltre al main-thread. | Istante di creazione del thread (t1.start) |
| **eseguirà** | il main-thread | Il main-thread eseguirà ripetutamente la sequenza (#11, #12, #13). | Ciclo di esecuzione del main-thread |
| **eseguirà** | il thread-1 | Il thread-1 eseguirà ripetutamente la sequenza (#4, #5, #6). | Ciclo di esecuzione del thread secondario |
| **sono diventate 2** | le linee di esecuzione | Le linee di esecuzione sono diventate 2, UNA PER OGNI THREAD. | Moltiplicazione delle linee di esecuzione |
| **non vengono eseguite** | le linee di definizione della funzione | Le linee di definizione della funzione non vengono eseguite ma vengono lette dall'interprete python. | Differenza tra definizione e esecuzione di una funzione |

---

## 4. `4.Linee di esecuzione multiple.md` — Linee multiple

| Verbo | Soggetto | Frase | Concetto |
|---|---|---|---|
| **abbiamo** | noi | Abbiamo più linee di esecuzione contemporaneamente, una per ciascun thread. | Concorrenza: una linea di esecuzione per thread |
| **diventa IMPOSSIBILE prevedere** | (si) | Quando si hanno più thread, diventa IMPOSSIBILE prevedere la PROSSIMA linea di esecuzione. | Non-determinismo nel multi-threading |
| **dipende** | la scelta | La scelta dipende dalla libreria di threading. | Scheduling delegato alla libreria di threading |
| **permetterà di eseguirsi** | la libreria di threading | (La libreria) permetterà a ciascun thread di eseguirsi. | Garanzia di esecuzione per tutti i thread |
| **non permette di prevedere** | la libreria di threading | (La libreria) non permette di prevedere quale sarà la prossima linea di esecuzione ad essere eseguita. | Imprevedibilità dello scheduling |
| **non possiamo prevedere** | noi | Non possiamo prevedere quale delle due linee sarà eseguita. | Impossibilità di previsione con thread multipli |
