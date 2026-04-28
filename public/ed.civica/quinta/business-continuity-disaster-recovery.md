# Business continuity e disaster recovery: differenze, sinergie e valore per la resilienza aziendale

Spesso sono due concetti confusi, ma ricoprono ruoli complementari nella costruzione della resilienza organizzativa. Ecco come le norme e le direttive di settore (ISO 22301, NIS 2, GDPR) ne richiedono o implicano l'adozione, per affrontare eventi critici.

Un sistema di sicurezza completo si basa su tre pilastri: la gestione degli incidenti, il piano di risposta agli incidenti e il piano di continuità operativa.

Dopo aver delineato i fondamenti di una strategia di cyber security matura, è l'ora di approfondire **le differenze e le sinergie** tra **business continuity** e **disaster recovery**, due concetti spesso confusi, ma che ricoprono ruoli complementari nella costruzione della resilienza organizzativa.

La sicurezza delle informazioni e la continuità del business sono strettamente collegate alla capacità di affrontare eventi critici. Ecco gli obiettivi e le modalità di implementazione con esempi pratici.

## Business continuity e disaster recovery a confronto

I termini business continuity (BC) e disaster recovery (DR) talvolta si usano come sinonimi, sebbene esprimano concetti differenti ma complementari. Esaminiamo le differenze.

A caratterizzare la **business continuity** sono:

- **approccio proattivo**: si occupa di garantire la continuità delle operazioni aziendali anche di fronte a eventi critici (disastri naturali, cyber attacchi, problematiche di filiera, crisi reputazionali);
- **focus strategico**: comprende la definizione di strategie, scenari, procedure e risorse per assicurare il funzionamento dei processi chiave in scenari avversi;
- **scenario ampio**: non si limita all'IT, ma coinvolge vari reparti come logistica, produzione, risorse umane, comunicazioni esterne e interne;
- **business continuity plan (BCP)**: il documento che delinea ruoli, responsabilità, analisi dei rischi e misure di risposta preventiva.

A connotare la **disaster recovery** sono:

- **approccio reattivo**: si concentra sul ripristino dell'infrastruttura IT e dei dati a seguito di un'interruzione grave;
- **focus tecnico**: definisce procedure per recuperare rapidamente sistemi e dati, minimizzando il downtime;
- **scenario più focalizzato**: tipicamente associato all'ICT, ma può essere esteso anche ad altre risorse critiche (infrastrutture fisiche, personale, servizi essenziali);
- **disaster recovery plan (DRP)**: stabilisce le tempistiche e i metodi di ripristino (per esempio **RTO e RPO**), nonché le **procedure di backup** e failover.

In sintesi, la business continuity e il disaster recovery sono due concetti strettamente legati alla gestione della continuità operativa, ma hanno scopi e approcci differenti.

Vediamo di approfondirli anche a livello documentale in quanto gli strumenti di riferimento sono rispettivamente il Piano di business continuity e quello di disaster recovery.

## Differenze e sinergie: esempi concreti

**Esempi di business continuity** sono:

- interruzione della filiera di approvvigionamento;
- malfunzionamento di un impianto produttivo;
- crisi reputazionale e richiamo di prodotto.

**Esempi di disaster recovery** invece sono:

- cyber attacco ai sistemi di gestione logistica;
- guasto al sistema ERP aziendale;
- perdita di dati degli ordini dei clienti.

Vediamoli uno per uno. Dagli esempi emerge chiaramente l'**approccio proattivo** che il **BC** propone e l'**approccio reattivo** tipico del **DR**.

### Esempio di BC: interruzione della filiera di approvvigionamento

In questo scenario, un fornitore di materie prime subisce uno sciopero o un blocco logistico. Approccio BC:

- identificare fornitori alternativi dislocati in regioni diverse;
- creare scorte strategiche per coprire i periodi critici;
- testare regolarmente queste soluzioni attraverso esercitazioni e simulazioni.

### Malfunzionamento di un impianto produttivo (BC)

Per esempio, un guasto o un incendio ferma la produzione in uno stabilimento. Approccio BC:

- pianificare la produzione su siti ridondanti (interni o partner esterni);
- creare procedure di emergenza per ridurre al minimo i tempi di fermo;
- mantenere accordi "di assistenza reciproca" con concorrenti o terze parti.

### Crisi reputazionale e richiamo di prodotto (BC)

Un lotto di prodotti contaminati deve essere ritirato dal mercato. Approccio BC:

- implementare sistemi di tracciabilità avanzata per localizzare rapidamente i prodotti difettosi;
- coinvolgere un consulente specializzato per tutelare il brand e la fiducia dei clienti;
- definire una strategia di comunicazione di crisi (internamente ed esternamente).

### Esempio di DR: cyber attacco ai sistemi di gestione logistica

In questo scenario, un ransomware compromette l'accesso ai dati di ordini e spedizioni. Approccio DR:

- attivare siti di ripristino secondari e procedure di restore da backup;
- isolare i sistemi infetti per evitare la propagazione del malware;
- gestire manualmente gli ordini fino al ripristino completo.

### Guasto al sistema ERP aziendale (DR)

Per esempio, un crash del server blocca la pianificazione della produzione. Approccio DR:

- disporre di server ridondanti in cloud pronti a subentrare;
- prevedere un **RTO (Recovery Time Objective)** di poche ore, in linea con gli accordi contrattuali;
- eseguire regolarmente e frequentemente backup e prove di restore per verificare l'efficacia dei backup.

### Perdita di dati degli ordini dei clienti (DR)

Un errore o un attacco cancella i dati relativi agli ordini dell'ultimo mese. Approccio DR:

- utilizzare backup incrementali (offline o in cloud) per ripristinare i dati con un **RPO (Recovery Point Objective)** minimo;
- automatizzare le procedure di data recovery per ridurre i tempi di inattività.

## Misure preventive e aggiornamento dei piani

La prevenzione gioca un ruolo fondamentale sia in ottica BC sia DR. Alcuni esempi:

- **analisi di rischio e impatto (BIA)**: secondo ISO 22301, è indispensabile valutare tutte le modifiche di contesto (interno/esterno) che possano richiedere l'aggiornamento dei piani.
- **formazione e sensibilizzazione**: il personale deve conoscere procedure e ruoli specifici.
- **esercitazioni periodiche**: simulazioni o tabletop exercise per testare la validità dei piani e correggere eventuali criticità.
- **gestione dei fornitori**: adozione di SLA e contratti che garantiscano adeguate prestazioni di fornitura e tempi di ripristino.

## Confronto finale: BC e DR a colpo d'occhio

Le **differenze d'approccio** di business continuity e disaster recovery sono:

- per BC l'approccio è proattivo (garantire operatività);
- per DR l'approccio è reattivo (ripristinare IT e dati).

La **focalizzazione** è:

- strategica e trasversale all'intera organizzazione per BC;
- tecnica e concentrata su infrastruttura e sistemi per DR.

Il **documento di riferimento** è:

- BCP (Business Continuity Plan) per la business continuity;
- DRP (Disaster Recovery Plan) per il disaster recovery.

La dipendenza dalla causa:

- per BC: le azioni possono variare a seconda dello scenario (es. blocco filiera, incendio eccetera);
- per DR: le azioni sono simili, qualunque sia la causa (ma varia la modalità d'implementazione).

Standard correlati infine sono:

- per business continuity: **ISO 22301, ISO 27031, GDPR** (implicitamente), **NIS2** eccetera;
- per disaster recovery: ISO 22301 (anche per DR), ISO/IEC 27031, NIST SP 800-34, **Direttiva NIS 2** eccetera.

## L'obiettivo comune di BC e DR

Business continuity e disaster recovery convergono entrambi verso un **obiettivo comune**: rendere l'**organizzazione resiliente di fronte a eventi avversi**. Eppure, si distinguono per l'ampiezza del perimetro (BC è globale, DR è più focalizzato) e per l'approccio (proattivo vs reattivo).

Come evidenziato dalle diverse normative (ISO 22301, NIS2, GDPR), la capacità di garantire la disponibilità e l'integrità delle informazioni passa sia attraverso la pianificazione strategica (BC) sia attraverso la predisposizione di procedure tecniche di ripristino (DR).
