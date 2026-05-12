## Livello di astrazione

- Kernel → avvolge l'hardware.
Per capire cos'è il kernel, dovremmo immaginarci un computer senza.


Ogni applicazione viene scritta per un particolare Hardware.
Significa che ogni hardware espone delle funzioni proprie, che cambiano da hardware a hardware.
Invece di far si che l'applicazione si adatti a ciascun hardware, l'applicazione si adatta al Sistema Operativo, ed il sistema operativo si adatta all'hardware.



Codice sorgente → Funzioni esposte dell'hardware.

Ogni hardware espone le sue particolari funzioni.
- L'HW della cisco espone funzioni che hanno lo stesso scopo ma implementate in modo diverse.
- L'HW della intel espone funzioni che hanno lo stesso scopo ma implementate in modo diverse.

Questo significa che il codice sorgente deve adattarsi ad ogni funzione esposta dall'hardware:

```
if (cisco) {
    connect_cisco(...)
}
if (intel) {
    connect_intel(...)
}
```


Livello di astrazione




