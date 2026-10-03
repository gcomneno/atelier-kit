# ADR-0009 - Uiverse.io come fonte esterna di design per GiadaWare UI

- **Stato:** Proposto
- **Data:** 2026-10-03
- **Autore:** @gcomneno
- **Progetto:** Atelier-Kit / GiadaWare UI
- **Tags:** design-system, ui, dipendenze, licensing, accessibilita

---

## 1. Contesto

GiadaWare UI e il layer grafico di Atelier-Kit. Ha bisogno di un catalogo
di pattern, componenti e micro-animazioni coerente, accessibile e
manutenibile, senza reinventare da zero ogni elemento.

Uiverse.io e una community di componenti UI (button, toggle, loader, card,
input, tooltip, checkbox, switch, skeleton, micro-animation) distribuiti
spesso con licenza permissiva. E una fonte rapida di ispirazione, ma la
qualita e disomogenea per:

- semantica HTML
- accessibilita (focus, ARIA, contrasto, tastiera)
- naming CSS
- complessita e dipendenze nascoste
- licenza per singolo componente

Adottare Uiverse come dipendenza runtime o come sorgente di copy/paste
in produzione introdurrebbe debito tecnico, rischio legale e
incoerenza di design.

---

## 2. Decisione

**Uiverse.io e una risorsa esterna candidata per GiadaWare UI.**

Nello specifico:

- **Non** e una dipendenza runtime.
- **Non** e una libreria da importare alla cieca.
- **Si** come catalogo di pattern e componenti da studiare e adattare.
- I componenti selezionati vanno portati dentro GiadaWare UI, ripuliti,
  normalizzati e resi coerenti con design token, accessibilita e stile.

**Modalita operativa:** `inspect-before-adopt`.
**Licenza:** verifica per singolo componente, solo licenze compatibili.

> Candidate external design source for GiadaWare UI - MIT, inspect-before-adopt.

---

## 3. Pipeline di adozione

```text
license-check -> discover -> inspect -> select -> sanitize -> adapt -> test -> own
```

Vietato: `copy/paste -> produzione`.

Ogni adozione passa dalla
[Uiverse Intake Checklist](../design-sources/uiverse-intake-checklist.md).

---

## 4. Conseguenze

### Positive

- Velocita di ispirazione e prototipazione.
- Varieta di pattern e micro-animazioni gia esplorate dalla community.
- Codice finale sempre proprietario, leggibile e governato.

### Negative

- Qualita disomogenea dei componenti di partenza.
- Debito di normalizzazione (CSS, ARIA, naming, JS).
- Rischio di dipendenze nascoste o semantica scorretta.

### Mitigazioni

- Checklist di intake obbligatoria.
- Test di accessibilita, visual regression, cross-browser.
- Code review dedicata sui componenti adottati.

---

## 5. Criteri di scarto

Un componente viene **scartato** se presenta anche solo uno dei seguenti:

- licenza non compatibile o non verificabile
- HTML non semantico e non correggibile senza riscrittura totale
- accessibilita non recuperabile (focus, tastiera, contrasto)
- dipendenze runtime esterne
- CSS non tokenizzabile
- JS non manutenibile o incompatibile con lo stack
- naming e API incoerenti con il resto del sistema

---

## 6. Alternative considerate

- **Uiverse come dipendenza runtime.** Scartata: nessun governo del
  codice, rischio licensing, incoerenza di design.
- **Ignorare Uiverse.** Scartata: costo di esplorazione troppo alto.
- **Fork di Uiverse.** Scartata: il valore e nel singolo pattern.

---

## 7. Riferimenti

- Uiverse.io - https://uiverse.io
- Checklist: [docs/design-sources/uiverse-intake-checklist.md](../design-sources/uiverse-intake-checklist.md)
- ADR correlati: [0008](0008-atelier-mark-editorial-inline-tokens.md)

---

## 8. Cronologia

| Data       | Stato    | Nota          |
|------------|----------|---------------|
| 2026-10-03 | Proposto | Prima stesura |
