# Guida operativa: sito vetrina per uno zoo con Atelier-Kit

**Versione A** — percorso consigliato con `site:wizard` (scaffold + identità in un colpo).

Use case: cliente non tecnico (es. direttore di uno zoo) che manda testi e foto; l’operatore esegue i comandi e completa in studio.

Template di partenza: **`artwork`** (catalogo visivo → animali e aree del parco).

---

## Prima di iniziare

| Cosa serve | Note |
|------------|------|
| Node.js 18+ | Sulla macchina operatore |
| Repo `atelier-kit` | Es. `~/Progetti/atelier-kit` |
| Atelier Desktop | `cd atelier-kit/desktop && npm run tauri dev` |
| Account GitHub + Vercel | Solo in fase deploy (Passo 7) |

**Non fare:** Passo 1 (scaffold) **e** wizard sullo stesso sito in sequenza — il wizard ricrea la cartella da zero.

---

## Passo 0 — Reset (solo se vuoi ripartire pulito)

Elimina la cartella cliente se esiste già (contenuto incluso):

```bash
rm -rf ~/Progetti/zoo-delle-colline
```

---

## Passo 1 — Wizard: scaffold + identità sito

Esegui **da dentro** `atelier-kit`. Il wizard:

- copia il kit nella cartella cliente;
- applica titolo, tagline, lingua, email;
- rinomina titolo del primo oggetto e della prima collezione;
- lancia `content:validate` (non fa `npm install`).

```bash
cd ~/Progetti/atelier-kit

npm run site:wizard -- --yes \
  --target ../zoo-delle-colline \
  --template artwork \
  --language it \
  --site-title "Zoo delle Colline" \
  --tagline "Animali, natura e scoperta — a due passi da Bologna" \
  --email info@zoodellecolline.it \
  --first-item-title "Simba" \
  --collection-title "Savana africana"
```

### Opzionali utili per lo zoo

Aggiungi alla fine del comando se servono subito:

```bash
  --notice "Aperto tutti i weekend. Visite scolastiche su prenotazione dal lunedì al venerdì." \
  --whatsapp-phone "+393401234567"
```

### Cosa resta “demo” dopo il wizard

- Vocabolario catalogo ancora **work / works** → correggi in studio (Passo 4).
- Primo animale: titolo **Simba**, ma id file **`studio-study`** (URL `/items/studio-study`). Per un URL pulito, crea un item nuovo con `item:new` o rinomina in studio.
- Testi Signal Cloud, About, Footer, legali: starter in inglese o generico → personalizza in studio.
- Foto: placeholder finché non carichi quelle del cliente.

---

## Passo 2 — Install dipendenze + verifica struttura

```bash
cd ~/Progetti/zoo-delle-colline

npm install

npm run content:validate
npm run item:validate
```

Entrambi devono chiudere senza errori. Se falliscono, **non** andare avanti: incolla l’output e correggi.

---

## Passo 3 — Aggiungi altri animali (terminale)

Crea file item YAML per ogni animale. Il preset `default` va bene; meta e descrizione si completano in studio.

```bash
cd ~/Progetti/zoo-delle-colline

npm run item:new -- leone-simba "Simba" -- --preset default
npm run item:new -- pinguino-pippa "Pippa" -- --preset default
npm run item:new -- panda-rosa "Mì" -- --preset default
npm run item:new -- asino-bruno "Bruno" -- --preset default

npm run item:list
npm run item:validate
```

> **Nota:** Se hai già “Simba” dallo starter (`studio-study`), puoi eliminare il duplicato in studio oppure saltare `leone-simba` e editare solo lo starter.

### Foto (quando arrivano dal cliente)

Copia i file in:

```text
static/images/items/simba.jpg
static/images/items/pippa.jpg
…
```

Poi in studio → **Oggetti** → campo immagine, es. `/images/items/simba.jpg`.

---

## Passo 4 — Studio (Atelier Desktop)

### Avvia Desktop e libera la porta

Se un altro sito (es. Luna Argento) occupa ancora la 5173:

```bash
fuser -k 5173/tcp
```

Poi:

```bash
cd ~/Progetti/atelier-kit/desktop && npm run tauri dev
```

### In Atelier Desktop

1. **Choose site folder** → `~/Progetti/zoo-delle-colline`
2. **Stop dev server** (se era attivo per un altro sito)
3. **Open studio**

### In Atelier Studio — ordine consigliato

| Sezione | Cosa fare |
|---------|-----------|
| **Sito** | Titolo, tagline, avviso orari, lingua `it` |
| **Catalogo** | `item_name_singular`: **animale** · `item_name_plural`: **animali** · nascondi prezzo/materiali/dimensioni se non servono |
| **Chi siamo** | Storia del parco, come visitare, scuole e gruppi |
| **Contatti** | Email e WhatsApp reali dello zoo |
| **Footer** | Copyright, riga legale, link privacy/cookie |
| **Segnali** | Es. tipo visita (famiglia/scuola), quando, cosa interessa (visita guidata, laboratorio…) |
| **Oggetti** | Testo, meta (habitat, dieta, curiosità), status (`in mostra`), foto per ogni animale |
| **Collezioni** | Crea aree: Savana africana, Mondo polare, Fattoria didattica, Bosco… **e assegna gli animali** |

> `item:new` crea gli oggetti ma **non** li mette nelle collezioni: le collezioni vanno configurate in studio.

Salva ogni sezione e usa **Anteprima** per controllare.

---

## Passo 5 — Preview

**Da Desktop:** **Open preview** (browser su `/`).

**Oppure da terminale:**

```bash
cd ~/Progetti/zoo-delle-colline && npm run dev
```

Apri `http://127.0.0.1:5173`.

### Checklist rapida preview

- [ ] Home: titolo zoo, collezioni, catalogo animali
- [ ] Pagina animale: testo, meta, Signal Cloud, Visitor Brief
- [ ] Contatti: email/WhatsApp aprono messaggio precompilato
- [ ] Footer: credito **Atelier-Kit** in basso a destra (non editabile)
- [ ] Mobile: pill/etichette non sforano lo schermo

---

## Passo 6 — Pre-publish

```bash
cd ~/Progetti/zoo-delle-colline

npm run content:validate
npm run content:doctor
npm run check
npm run build
```

In studio → **Pubblicazione** → **Run publish prep**.

Il doctor segnalerà placeholder (email fittizia, immagini placeholder, testi legali segnaposto): **normale** finché non inserisci i dati definitivi del cliente.

Per un controllo più severo prima del go-live:

```bash
npm run content:doctor -- --strict
```

---

## Passo 7 — Online (Vercel)

Leggi le istruzioni generate con lo scaffold:

```bash
cd ~/Progetti/zoo-delle-colline
cat DEPLOY.md
```

Flusso tipico:

1. `git init` (se non esiste già)
2. Commit del sito cliente
3. Push su GitHub (repo dedicato, es. `zoo-delle-colline`)
4. Import su [vercel.com](https://vercel.com) → deploy

Se hai già configurato il flusso Atelier:

```bash
npm run publish -- --deploy
```

---

## Passo 8 — Consegna al cliente (direttore dello zoo)

Messaggio tipo:

> Il sito è online. Per aggiornare un animale o un testo: apri **Atelier Desktop**, scegli la cartella del parco, clicca **Open studio**. Per foto nuove, inviale all’operatore o caricale in **Oggetti**.

Consegnare:

- URL pubblico (Vercel)
- Email / WhatsApp che ricevono i Visitor Brief
- Promemoria: niente terminali per il cliente

---

## Percorso alternativo B — Solo scaffold (senza wizard)

Usa solo se **non** vuoi il wizard. **Non** eseguire poi il Passo 1 di questa guida (wizard).

```bash
cd ~/Progetti/atelier-kit
npm run site:scaffold -- ../zoo-delle-colline --template artwork --language it --force

cd ~/Progetti/zoo-delle-colline
npm install
npm run content:validate
npm run item:validate
```

Poi identità, contatti e contenuti **solo** da studio (o YAML a mano). Continua dal **Passo 3** di questa guida.

---

## Troubleshooting

| Problema | Soluzione |
|----------|-----------|
| Studio mostra un altro sito (es. Luna) | Desktop → **Stop dev server** → riapri studio con cartella zoo |
| `[404] GET /favicon.ico` | Aggiorna kit (`site:upgrade`) — favicon default incluso |
| Wizard: `Unknown option: --force` | Il wizard **non** accetta `--force`; lo usa già internamente |
| `Target already exists` con scaffold | Aggiungi `--force` solo a `site:scaffold`, non al wizard |
| Porta 5173 occupata | `fuser -k 5173/tcp` oppure Stop dev server in Desktop |

---

## Riferimenti

- [Client scaffold](../usage/client-scaffold.md)
- [Site wizard](../usage/site-wizard.md)
- [Operator handoff playbook](../product/operator-handoff-playbook.md)
- [Collector showcase](collector-showcase.md) — altro use case con Signal Cloud per scambi

---

*Guida operatore Atelier-Kit · use case zoo · versione A (wizard)*
