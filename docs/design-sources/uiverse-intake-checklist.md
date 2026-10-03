# Uiverse Intake Checklist - GiadaWare UI

Checklist operativa per componenti da Uiverse.io in GiadaWare UI.

Rif: [ADR-0009](../adr/0009-uiverse-external-design-source.md).

> Regola: **inspect-before-adopt**. Mai copy/paste in produzione.

---

## Pipeline

```text
license-check -> discover -> inspect -> select -> sanitize -> adapt -> test -> own
```

---

## 0. Metadati

| Campo | Valore |
|-------|--------|
| Nome | |
| URL Uiverse | |
| Autore | |
| Data | |
| Licenza | |
| Attribuzione | si/no |
| Referente | |

---

## 1. Licenza

- [ ] Licenza verificata
- [ ] Compatibile con il progetto
- [ ] Attribuzione documentata (se richiesta)
- [ ] Provenienza salvata (URL, autore, data)

---

## 2. HTML

- [ ] Elementi semantici corretti
- [ ] Nessun `div` al posto di `button`, `input`, `label`, `a`
- [ ] Attributi ARIA corretti e non ridondanti
- [ ] Struttura DOM semplice
- [ ] Nessun wrapper superfluo

---

## 3. Accessibilita

- [ ] Navigazione completa da tastiera
- [ ] Focus visibile e coerente
- [ ] Contrasto adeguato (WCAG AA minimo)
- [ ] Label, `aria-label` o testo accessibile presenti
- [ ] `prefers-reduced-motion` rispettato
- [ ] Ruoli ARIA corretti
- [ ] Stato comunicato (es. `aria-pressed`, `aria-checked`)

---

## 4. CSS

- [ ] Nessun `!important` ingiustificato
- [ ] Colori, spazi, raggi, tipografia mappati su design token
- [ ] Naming coerente con GiadaWare UI
- [ ] Responsive verificato
- [ ] RTL verificato (se applicabile)
- [ ] Nessuna dipendenza esterna nascosta (font, CDN, reset)
- [ ] Nessun conflitto con reset o stili globali

---

## 5. JavaScript

- [ ] Zero dipendenze runtime esterne
- [ ] Eventi aggiunti e rimossi correttamente
- [ ] Nessun memory leak evidente
- [ ] API a props chiara e tipizzata
- [ ] Compatibile con lo stack di Atelier-Kit
- [ ] Nessun `setTimeout`/`setInterval` non gestito
- [ ] Nessuna manipolazione DOM diretta non necessaria

---

## 6. Performance

- [ ] Animazioni GPU-friendly (`transform`, `opacity`)
- [ ] Nessun layout thrashing
- [ ] Peso contenuto ragionevole
- [ ] Nessun asset non ottimizzato

---

## 7. Test

- [ ] Accessibilita (axe o equivalente)
- [ ] Visual regression
- [ ] Cross-browser
- [ ] Tema light
- [ ] Tema dark (se previsto)
- [ ] Test manuale tastiera + screen reader

---

## 8. Adattamento e normalizzazione

- [ ] Codice portato dentro GiadaWare UI
- [ ] Ripulito da classi, ID e stili superflui
- [ ] Rinominato secondo le convenzioni interne
- [ ] Collegato ai design token
- [ ] Documentato con link originale
- [ ] Inserito in Storybook / demo interna

---

## 9. Definition of Done

- [ ] Sezioni precedenti complete
- [ ] Nessun criterio di scarto dell ADR violato
- [ ] Code review approvata
- [ ] Documentazione aggiornata
- [ ] Test verdi
- [ ] Inserito nel catalogo ufficiale di GiadaWare UI

---

## 10. Esito

| Esito | Note |
|-------|------|
| Adottato | |
| Adattato | |
| Scartato | |
| Rinviato | |

**Motivazione:**

---

## Appendice - Criteri di scarto rapidi

- licenza non verificabile o incompatibile
- HTML non semantico e non correggibile
- accessibilita non recuperabile
- dipendenze runtime esterne
- CSS non tokenizzabile
- JS non manutenibile o incompatibile con lo stack
