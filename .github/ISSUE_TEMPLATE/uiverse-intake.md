---
name: "Uiverse Intake"
about: "Proposta di adozione di un componente da Uiverse.io verso GiadaWare UI"
title: "[Uiverse Intake] <nome componente>"
labels: ["design-system", "uiverse", "intake"]
assignees: []
---

<!--
Riferimenti:
- ADR-0009: docs/adr/0009-uiverse-external-design-source.md
- Checklist: docs/design-sources/uiverse-intake-checklist.md

Regola: inspect-before-adopt. Mai copy/paste in produzione.
-->

## 0. Metadati

| Campo | Valore |
|-------|--------|
| Nome componente | |
| URL Uiverse | |
| Autore | |
| Data | |
| Licenza | |
| Attribuzione | si/no |
| Referente interno | |

---

## 1. Licenza

- [ ] Licenza verificata
- [ ] Compatibile con la licenza del progetto
- [ ] Attribuzione documentata (se richiesta)
- [ ] Provenienza salvata (URL, autore, data)

---

## 2. HTML

- [ ] Elementi semantici corretti
- [ ] Nessun `div` al posto di `button`, `input`, `label`, `a`
- [ ] ARIA corretto e non ridondante
- [ ] DOM semplice e manutenibile

---

## 3. Accessibilita

- [ ] Navigazione da tastiera
- [ ] Focus visibile
- [ ] Contrasto WCAG AA minimo
- [ ] Label / testo accessibile presenti
- [ ] `prefers-reduced-motion` rispettato
- [ ] Ruoli ARIA corretti

---

## 4. CSS

- [ ] Nessun `!important` ingiustificato
- [ ] Mappato su design token
- [ ] Naming coerente con GiadaWare UI
- [ ] Responsive verificato
- [ ] RTL verificato (se applicabile)
- [ ] Nessuna dipendenza esterna nascosta

---

## 5. JavaScript

- [ ] Zero dipendenze runtime esterne
- [ ] Eventi aggiunti/rimossi correttamente
- [ ] Nessun memory leak evidente
- [ ] API a props chiara e tipizzata
- [ ] Compatibile con lo stack Atelier-Kit

---

## 6. Performance

- [ ] Animazioni GPU-friendly
- [ ] Nessun layout thrashing
- [ ] Peso contenuto ragionevole
- [ ] Peso contenuto ragionevole

---

## 7. Test

- [ ] Accessibilita (axe o equivalente)
- [ ] Visual regression
- [ ] Cross-browser
- [ ] Tema light
- [ ] Tema dark (se previsto)

---

## 8. Adattamento

- [ ] Codice portato dentro GiadaWare UI
- [ ] Ripulito e rinominato
- [ ] Collegato ai design token
- [ ] Documentato con link originale
- [ ] Inserito in Storybook / demo

---

## 9. Definition of Done

- [ ] Sezioni precedenti complete
- [ ] Nessun criterio di scarto violato
- [ ] Code review approvata
- [ ] Test verdi

---

## 10. Esito

**Decisione:** adottato / adattato / scartato / rinviato

**Motivazione:**

**Link alla PR:**
