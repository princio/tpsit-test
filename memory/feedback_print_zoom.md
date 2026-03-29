# Feedback: print-zoom-assumption

- **Type:** feedback
- **Date:** 2026-03-29

## Content

La paginazione del test assume zoom browser al 100%. Se lo zoom è diverso, i calcoli px/mm non tornano e la stampa è sbagliata. Questo è considerato colpa dell'utente — non aggiungere workaround o avvisi per questo.

## Why

Il measure pass misura in px (dipendente dallo zoom), la stampa è in mm fisici. Allinearli richiederebbe euristiche fragili.

## How to apply

Non aggiungere logica per rilevare o compensare lo zoom del browser nella paginazione.
