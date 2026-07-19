/** Catalogo messaggi operator-facing (italiano). */
export default {
  studio: {
    layout: {
      eyebrow: 'Atelier-Kit studio',
      title: 'Modifica locale',
      nav: {
        dashboard: 'Panoramica',
        siteGroup: 'Vetrina e impostazioni',
        contentGroup: 'Editoriale',
        publishGroup: 'Metti online',
        site: 'Sito',
        identity: 'Identità',
        appearance: 'Aspetto',
        hero: 'Banner',
        contact: 'Contatto',
        social: 'Social',
        layout: 'Layout',
        footer: 'Footer',
        about: 'Chi siamo',
        catalog: 'Catalogo',
        items: 'Oggetti',
        news: 'Novità',
        collections: 'Collezioni',
        signals: 'Signal Cloud',
        readiness: 'Pubblicazione',
        help: 'Aiuto',
        preview: 'Anteprima',
        systemGroup: 'Sistema',
        system: 'Configura Studio',
        language: 'Lingua',
        shutdown: 'Arresta studio'
      }
    },
    dashboard: {
      pageTitle: 'Studio · Panoramica',
      intro:
        'Quattro aree, come nel menu a sinistra: scegli dove lavorare. Ogni box apre la prima pagina del gruppo.',
      zonesLegend: 'Aree Studio',
      zones: {
        site: {
          eyebrow: 'Vetrina',
          title: 'Vetrina e impostazioni',
          description: 'Come appare il sito pubblico: identità, colori, layout e contatti.'
        },
        content: {
          eyebrow: 'Editoriale',
          title: 'Pagine e opere',
          description: 'Testi, catalogo, oggetti, collezioni, news e Signal Cloud visitatore.'
        },
        publish: {
          eyebrow: 'Online',
          title: 'Metti online',
          description: 'Anteprima del sito e controlli pre-lancio.'
        },
        system: {
          eyebrow: 'Sistema',
          title: 'Configura Studio',
          description: 'Lingua, guida operatore e chiusura dello Studio.'
        }
      }
    },
    system: {
      pageTitle: 'Studio · Sistema',
      intro:
        'Scegli la lingua dell’interfaccia, oppure chiudi lo Studio quando hai finito di modificare.',
      language: {
        pageTitle: 'Studio · Lingua',
        intro: 'La lingua vale per le etichette di Studio e per l’interfaccia del sito visitatori. I contenuti che scrivi nei file YAML non vengono tradotti automaticamente.',
        title: 'Lingua interfaccia',
        description: 'Scegli la lingua per menu, pulsanti e messaggi di sistema.',
        field: 'Lingua',
        languages: {
          it: 'Italiano',
          en: 'Inglese'
        },
        save: 'Salva lingua'
      },
      shutdown: {
        pageTitle: 'Studio · Arresta studio',
        intro: 'Arresta il server di sviluppo quando hai finito di modificare. I file salvati restano sul disco.',
        title: 'Arresta studio',
        description: 'Chiude il server di authoring locale avviato con npm run studio o studio:launch.',
        hint: 'Puoi anche premere Ctrl+C nel terminale dove gira il server.',
        action: 'Arresta server studio',
        confirm: 'Arrestare il server Studio? Le modifiche salvate restano su disco, ma dovrai riavviare Studio per continuare a modificare.',
        stopping: 'Arresto studio in corso…',
        success: 'Studio arrestato',
        stopped: 'Studio arrestato',
        fallback: 'Studio arrestato. Puoi chiudere questa scheda.',
        unavailable: 'L’arresto dello studio è disponibile solo in modalità authoring locale.'
      }
    },
    forms: {
      legend: '<span class="legend-required">*</span> Campo obbligatorio · <span class="legend-optional">(opzionale)</span> Campo facoltativo',
      required: 'Campo obbligatorio',
      optional: '(opzionale)',
      requiredWhenEnabled: 'Obbligatorio se attivo',
      atLeastOne: 'Scegli almeno uno'
    },
    editorial: {
      toolbar: 'Enfasi testo',
      inlineFont: 'Font inline',
      preview: 'Anteprima',
      tags: {
        accent: 'Accento',
        intro: 'Intro',
        heading: 'Titolo',
        muted: 'Tenue'
      }
    },
    accessGuide: {
      title: 'Accesso consigliato',
      intro: 'Come usare lo studio in sicurezza e pubblicare le modifiche online.',
      localOnly:
        'Avvia con npm run studio:launch dalla cartella del sito. Non esporre il server di sviluppo in rete.',
      productionReadonly:
        '/studio è disabilitato sul sito Vercel live. Non impostare mai ATELIER_STUDIO=1 in produzione.',
      previewFirst:
        'Apri Anteprima in un’altra scheda per controllare le pagine pubbliche dopo ogni salvataggio.',
      publishWhenReady:
        'Apri Stato pubblicazione nello studio e clicca Metti online quando i contenuti sono pronti.',
      keepBackups:
        'Fai commit su Git (o copia la cartella) prima di modifiche grandi. Le foto sono in static/images/items/.',
      desktopClient:
        'Per clienti non tecnici, consegna Atelier Desktop (vedi desktop/README.md). Avvia lo studio in localhost senza terminale.'
    },
    help: {
      pageTitle: 'Studio · Aiuto',
      intro:
        'Guida operativa ad Atelier-Kit Studio: dove trovare ogni impostazione, come salvare le modifiche e cosa controllare prima di pubblicare.',
      tocTitle: 'Sommario',
      toc: {
        workflow: 'Flusso di lavoro',
        site: 'Vetrina e impostazioni sito',
        atelierMark: 'Atelier Mark',
        content: 'Contenuti editoriali',
        itemPage: 'Scheda oggetto (pagina dettaglio)',
        publish: 'Anteprima e pubblicazione',
        upgrade: 'Aggiornamento siti clienti',
        limits: 'Cosa resta solo nei file YAML',
        safety: 'Sicurezza e accesso'
      },
      workflow: {
        title: 'Flusso consigliato',
        intro: 'Percorso tipico dalla modifica al controllo sul sito pubblico.',
        steps: {
          1: 'Scegli l’area dal menu a sinistra (o dalla Panoramica). Ogni pagina salva file YAML nel progetto.',
          2: 'Compila i campi e premi Salva. I campi con * sono obbligatori; (opzionale) puoi lasciarli vuoti.',
          3: 'Apri Anteprima in un’altra scheda e ricarica dopo ogni salvataggio importante.',
          4: 'Per liste ordinate (oggetti, collezioni, news) usa le frecce ↑↓ e Salva ordinamento.',
          5: 'Prima del lancio passa da Pronto al lancio: Content Doctor, validazione e publish prep.'
        }
      },
      site: {
        title: 'Vetrina e impostazioni sito',
        intro: 'Identità, aspetto e struttura del sito pubblico. Le modifiche si vedono su home, catalogo e sidebar.'
      },
      pages: {
        identity:
          'Nome sito, tagline (con enfasi Atelier Mark opzionale), titolo intro, testo home intro, lingua visitatori, URL e immagine social.',
        appearance: 'Preset colori, cinque colori editabili, font Google e sfondo opzionale.',
        hero: 'Banner in home: immagine, testo e visibilità.',
        layout: 'Preset layout, blocchi home/sidebar/menu e ordine widget.',
        contact: 'Email e WhatsApp per la scheda visitatore sulle pagine degli oggetti.',
        social: 'Link Instagram, Facebook, X e GitHub nell’header e nel footer.',
        footer: 'Colonne link, copyright e riga legale.'
      },
      atelierMark: {
        title: 'Atelier Mark — enfasi inline nei testi',
        intro:
          'Atelier Mark colora parole o applica un preset font supportato nei testi brevi del sito — senza HTML, CSS personalizzato o URL font. Testo senza { resta invariato.',
        whereTitle: 'Dove funziona',
        where: {
          1: 'Studio → Sito → Identità → Tagline.',
          2: 'Studio → Sito → Identità → Titolo intro (heading hero in home).',
          3: 'Studio → Sito → Identità → Testo home intro (per paragrafo).'
        },
        syntaxTitle: 'Sintassi',
        syntax: {
          1: '{accent}…{/accent} — colore accento',
          2: '{intro}…{/intro} — colore titolo intro',
          3: '{heading}…{/heading} — colore titoli',
          4: '{muted}…{/muted} — testo tenue',
          5: '{font:fraunces}…{/font} — preset font supportato. Parentesi graffe letterali: {{ e }}. I tag non si annidano. Tag sconosciuti o non chiusi bloccano Salva.'
        },
        studioTitle: 'In Studio',
        studio: {
          1: 'Apri Sito → Identità e usa la barra strumenti sopra tagline, titolo intro o testo home intro.',
          2: 'Seleziona il testo e scegli un ruolo colore o uno dei preset font inline supportati.',
          3: 'Controlla l’anteprima live sotto il campo con il preset aspetto corrente.'
        },
        validationNote:
          'Markup non valido blocca Salva. Esegui npm run content:doctor prima del publish. Riferimento completo: docs/usage/editorial-markup.md nel repo del Kit.'
      },
      content: {
        title: 'Contenuti editoriali',
        intro: 'Testi e catalogo: ogni voce corrisponde a un file sotto content/ o config/.',
        orderNote:
          'L’ordine manuale in catalogo (Oggetti / Collezioni / News) scrive sort_order nei file YAML e vale su home, sidebar e liste pubbliche.'
      },
      contentPages: {
        about: 'Pagina /about: titolo, intro, sezioni e ritratto opzionale.',
        catalog: 'Intro catalogo, ordinamento e limite card in home.',
        items: 'Nomi oggetto, elenco oggetti, modifica scheda, riordino card, creazione ed eliminazione.',
        collections: 'Gruppi curati di oggetti, ordine sul sito e ordine degli oggetti nella pagina collezione.',
        news: 'Post /news: creazione, modifica, riordino ed eliminazione.',
        signals: 'Signal Cloud globali: domande a scelta singola sulle pagine degli oggetti e nel messaggio visitatore.'
      },
      itemPage: {
        title: 'Scheda oggetto — pagina dettaglio pubblica',
        intro:
          'La pagina /items/{id} unisce il contenuto dell’oggetto e impostazioni condivise. Non tutto si configura nella stessa schermata Studio.',
        inStudioTitle: 'Nella scheda Studio → Oggetti → {id}',
        inStudio: {
          1: 'Titolo, sottotitolo, stato, descrizione e avviso.',
          2: 'Immagine: upload JPG/PNG/WebP o percorso in static/images/items/.',
          3: 'Dettagli oggetto: voci editabili e riordinabili; usa Gruppo › Voce (o >) per raggruppare in evidenza sul sito.',
          4: 'Elimina oggetto rimuove il file YAML e l’eventuale foto caricata.'
        },
        elsewhereTitle: 'Altrove in Studio',
        elsewhere: {
          1: 'Signal Cloud → domande/risposte mostrate sotto la scheda (uguali per tutti gli oggetti).',
          2: 'Sito → Contatto → email/WhatsApp e etichette pulsanti della scheda visitatore.',
          3: 'Sito → Aspetto → colori e font della pagina.',
          4: 'Catalogo + ordine in Oggetti → navigazione «precedente / successiva» e posizione card.',
          5: 'Collezioni → in quali gruppi compare l’oggetto.'
        },
        previewNote:
          'Usa Anteprima oggetto in cima alla scheda Studio per aprire /items/{id} in una nuova scheda.'
      },
      publish: {
        title: 'Anteprima e pubblicazione',
        intro: 'Controlla il sito visitatore e la readiness prima di andare online.',
        preview: 'sito pubblico locale (ricarica dopo i salvataggi).',
        readiness: 'Content Doctor, publish prep e deploy Vercel quando il repo è pronto.'
      },
      upgrade: {
        title: 'Aggiornamento siti clienti',
        intro:
          'Una nuova release del Kit non aggiorna da sola i siti già online. Ogni sito cliente ha il proprio progetto: va sincronizzato e ridistribuito a mano.',
        steps: {
          1: 'Pubblica il Kit: merge su main, tag git vX.Y.Z e release su GitHub.',
          2: 'Nella cartella del sito cliente: npm run site:upgrade -- --from ../atelier-kit --dry-run per vedere il piano.',
          3: 'Applica con npm run site:upgrade -- --from ../atelier-kit (oppure aggiungi --yes).',
          4: 'Restano intatti config/, content/ e static/images/items/. Per personalizzazioni in src/, elenca i path in .atelier-kit-preserve.',
          5: 'Poi npm install (se cambiano dipendenze), npm run check, npm run build e publish o push verso Vercel.'
        },
        note: 'La versione applicata e distribuibile viene registrata in .atelier-kit-version. Dettagli in docs/usage/client-scaffold.md.'
      },
      commands: {
        title: 'Comandi da terminale',
        intro: 'Utili se lavori fuori dallo Studio o in CI. Eseguili dalla cartella del progetto.',
        validate: {
          cmd: 'npm run content:validate',
          desc: 'Controlla struttura YAML, id, immagini mancanti e riferimenti incrociati.'
        },
        doctor: {
          cmd: 'npm run content:doctor -- --strict',
          desc: 'Promemoria editoriali; con --strict blocca se ci sono note da correggere.'
        },
        publish: {
          cmd: 'npm run publish -- --deploy',
          desc: 'Validazione, check, build e deploy su Vercel (quando configurato).'
        },
        upgrade: {
          cmd: 'npm run site:upgrade -- --from ../atelier-kit',
          desc: 'Sincronizza src/ e scripts/ da un Kit più recente senza toccare config e contenuti.'
        }
      },
      limits: {
        title: 'Cosa resta solo nei file YAML',
        intro: 'Alcune opzioni avanzate non hanno ancora un campo in Studio.',
        items: {
          1: 'Dettagli oggetto oltre un livello di raggruppamento (Gruppo › Voce): content/items/{id}.yaml.',
          2: 'Link preview esterno sull’oggetto (campo preview con href e label).',
          3: 'Testi legali completi: config/legal.yaml.'
        }
      }
    },
    site: {
      pageTitle: 'Studio · Impostazioni sito',
      intro:
        'Modifica qui identità, aspetto e contatti del sito pubblico. Le modifiche vengono salvate nei file del progetto. Dopo il salvataggio, aggiorna la scheda anteprima se la homepage non si aggiorna subito.',
      appearance: {
        title: 'Aspetto del sito',
        intro: 'Colori, tipografia e immagine opzionale per la vetrina pubblica.',
        preset: 'Preset colori',
        fontPreset: 'Font del sito',
        fontPresetHint: 'Caricata da Google Fonts sul sito pubblico. «Sistema» usa il sans-serif del dispositivo, senza richieste esterne.',
        fontPreviewTitle: 'Titolo di esempio',
        fontPreviewBody: 'Testo di anteprima per catalogo, card e paragrafi.',
        baseColor: 'Sfondo base',
        baseColorHint: 'Sfondo pagina, gradiente e aree dietro header e footer sul sito pubblico.',
        accentColor: 'Bagliore accent',
        accentColorHint: 'Link, pulsanti, bagliori e tinte decorative su header, card e sidebar.',
        textColor: 'Colore testo',
        textColorHint: 'Paragrafi, didascalie e testi corpo su tutte le pagine pubbliche.',
        headingColor: 'Colore titoli',
        headingColorHint: 'Titoli di sezione, card catalogo e altri titoli secondari sul sito pubblico.',
        headerTitleColor: 'Colore titolo header',
        headerTitleColorHint: 'Nome sito o testo accanto al logo nella barra di navigazione.',
        introTitleColor: 'Colore titolo introduttivo',
        introTitleColorHint: 'Titolo principale in homepage sotto l’header.',
        cardColor: 'Colore card',
        cardColorHint: 'Card catalogo, collezioni e pannelli in rilievo.',
        preview: 'Sfondo',
        previewHeading: 'Titolo',
        previewCard: 'Card',
        backgroundImage: 'Immagine di sfondo',
        backgroundHint: 'JPG, PNG o WebP. Salvata in static/images/site/background.*',
        backgroundVsBanner:
          'Usa questo campo per uno sfondo a tutta pagina o una fascia alta sotto l’header. Se il sito ha una home personalizzata, potrebbe usare solo questo asset al posto del hero banner.',
        currentBackground: 'Attuale: {path}',
        removeBackground: 'Rimuovi immagine di sfondo',
        backgroundFit: 'Layout sfondo',
        backgroundFitTop: 'Alto (cover)',
        backgroundFitCenter: 'Centro (cover)',
        backgroundFitContain: 'Adatta (contain)',
        backgroundFitHint: 'Come l’immagine di sfondo riempie la pagina dietro i contenuti.',
        save: 'Salva aspetto'
      },
      identity: {
        title: 'Identità del sito',
        intro: 'Titolo header, titolo home, sottotitolo e messaggi visibili in homepage.',
        headerTitle: 'Titolo del sito per l’intestazione',
        headerTitleHint: 'Mostrato nella barra di navigazione in alto. Lascia vuoto per nascondere il testo se c’è un logo.',
        introTitle: 'Titolo introduttivo',
        introTitleHint: 'Titolo principale in homepage, sotto l’header.',
        headerLogo: 'Logo header (opzionale)',
        headerLogoHint: 'JPG, PNG o WebP. Salvato in static/images/site/header-logo.*',
        headerLogoAlt: 'Descrizione logo',
        currentHeaderLogo: 'Attuale: {path}',
        removeHeaderLogo: 'Rimuovi logo header',
        favicon: 'Favicon / icona scheda browser',
        faviconHint: 'JPG, PNG o WebP. Salvata in static/images/site/favicon.*. Lascia vuoto per usare l’icona predefinita di Atelier-Kit.',
        currentFavicon: 'Favicon attuale: {path}',
        removeFavicon: 'Rimuovi favicon personalizzata',
        tagline: 'Sottotitolo',
        taglineHint: 'Riga breve sotto il titolo introduttivo in home. Lascia vuoto per nascondere.',
        heroIntro: 'Testo introduttivo in home',
        heroIntroHint:
          'Un Invio va a capo; una riga vuota separa i paragrafi. Modifica solo il testo: stile e impaginazione restano quelli del tema.',
        heroSignature: 'Firma',
        heroSignatureHint:
          'Saluto o chiusura personale in home, mostrata sotto il testo introduttivo e allineata a destra. Lascia vuoto per nascondere.',
        footerNote: 'Nota a piè di pagina',
        footerNoteHint: 'Testo breve in home quando non c\'è footer multi-colonna. Il credit Atelier-Kit viene aggiunto automaticamente e non è rimovibile.',
        save: 'Salva impostazioni'
      },
      heroBanner: {
        title: 'Banner (opzionale)',
        intro: 'Fascia visiva sotto il testo introduttivo nella home predefinita del kit. Disattivala per nasconderla senza perdere l’immagine.',
        show: 'Mostra hero banner in home',
        backgroundImageActive:
          'Hai già un’immagine di sfondo in Aspetto. Alcune home personalizzate usano solo quella e ignorano il hero banner.',
        upload: 'Carica immagine banner',
        uploadHint: 'JPEG, PNG o WebP. Paesaggio consigliato (circa 3:1).',
        removeHeroImage: 'Rimuovi immagine hero',
        bannerDescription: 'Descrizione',
        bannerDescriptionHint:
          'Testo sovrapposto al banner, centrato e in carattere grande. Lascia vuoto per nascondere.',
        caption: 'Didascalia (opzionale)',
        captionHint: 'Testo in basso sull’immagine del banner, centrato.',
        href: 'Link (opzionale, es. /news/anteprima)',
        hrefHint: 'Percorso interno: rende l’immagine cliccabile (es. /news, /collections).',
        save: 'Salva hero banner'
      },
      contact: {
        title: 'Contatti',
        intro: 'Email nel Visitor Brief e contatto WhatsApp opzionale.',
        emailLegend: 'Email',
        emailEnabled: 'Abilita contatto email',
        emailAddress: 'Email di contatto',
        emailLabel: 'Etichetta pulsante email',
        emailSubjectPrefix: 'Prefisso oggetto email',
        whatsappLegend: 'WhatsApp',
        whatsappEnabled: 'Abilita contatto WhatsApp',
        whatsappPhone: 'Numero WhatsApp',
        whatsappLabel: 'Etichetta pulsante WhatsApp',
        save: 'Salva contatti'
      },
      social: {
        title: 'Social',
        intro: 'Link opzionali mostrati nell’header del sito. Lascia vuoto un campo per nascondere quell’icona.',
        instagram: 'URL Instagram',
        facebook: 'URL Facebook',
        x: 'URL X (Twitter)',
        github: 'URL GitHub',
        githubHint: 'Qualsiasi URL GitHub http o https valido, inclusa una pagina GitHub Sponsors.',
        save: 'Salva social'
      },
      footer: {
        title: 'Footer legale',
        intro:
          'Footer multi-colonna con copyright e disclaimer. Visibile su tutto il sito.',
        copyright: 'Riga copyright',
        legalLine: 'Riga legale (es. P.IVA)',
        showSocial: 'Mostra icone social nel footer',
        showSocialHint:
          'Le icone compaiono solo se hai configurato almeno un URL in Studio → Social.',
        showSocialNoLinks:
          'Impostazione salvata. «Mostra icone social» è attivo, ma non ci sono ancora URL in Social: le icone non verranno mostrate finché non ne aggiungi almeno uno.',
        columnLegend: 'Colonna {number}',
        columnTitle: 'Titolo colonna',
        columnTitleHint: 'Lascia vuoto per saltare questa colonna.',
        linkLabel: 'Etichetta link {number}',
        linkHref: 'URL o percorso link',
        save: 'Salva footer'
      },
      layout: {
        title: 'Layout',
        intro:
          'Scegli uno o più punti in cui mostrare about, news, collezioni e catalogo.',
        blocksLegend: 'Elementi in home',
        blocksHint:
          'Ogni elemento attivo richiede almeno una destinazione. Una destinazione sidebar abilita il layout a due colonne.',
        placements: 'Destinazioni',
        placementMain: 'Colonna principale',
        placementSidebar: 'Sidebar',
        placementMenu: 'Menù',
        blockName: 'Nome elemento',
        blockNameHint: 'Lascia vuoto per usare il nome predefinito.',
        latestNewsCount: 'Numero news',
        save: 'Salva layout'
      },
      nextSteps: {
        title: 'Prima di pubblicare',
        intro: 'Controlla lo stato di pubblicazione nello studio e metti online con un pulsante.',
        link: 'Apri stato pubblicazione'
      }
    },
    readiness: {
      pageTitle: 'Studio · Stato pubblicazione',
      intro:
        'Leggi le note del Content Doctor, prova prima il sito con Test build e poi, quando sei pronto, mettilo online. I messaggi restano in linguaggio semplice — niente comandi da terminale.',
      doctorTitle: 'Content Doctor',
      doctorOk: 'Niente di evidente da rivedere.',
      doctorReview: 'Rivedi le note qui sotto prima di pubblicare.',
      publishTitle: '1. Test build (consigliato)',
      publishIntro:
        'Verifica che il sito possa essere costruito correttamente senza pubblicarlo. È un controllo facoltativo ma consigliato prima di mettere online.',
      publishRun: 'Test build',
      publishRunning: 'Test build in corso…',
      publishOk: 'Test build riuscito. Puoi mettere online quando sei pronto.',
      publishFailed:
        'Test build non riuscito. Leggi i dettagli qui sotto e correggi prima di pubblicare.',
      liveTitle: '2. Metti online',
      liveIntro:
        'Esegue la pubblicazione reale: controlla i contenuti, salva le modifiche e aggiorna il sito visibile ai visitatori.',
      liveBlocked: 'La pubblicazione non è ancora configurata su questo computer.',
      livePendingSummary: '{count} aggiornamento/i pronti da pubblicare.',
      livePendingDetails: 'Mostra file modificati',
      livePendingEmpty:
        'Nessuna modifica locale nuova. Puoi comunque aggiornare il sito live dall’ultima versione salvata.',
      liveCommitsAhead: '{count} aggiornamento/i salvati in attesa di andare online.',
      liveRun: 'Metti online',
      liveRunning: 'Aggiornamento sito live…',
      liveOk: 'Sito live aggiornato.',
      liveOkUrl: 'Sito live aggiornato: {url}',
      liveFailed: 'Impossibile aggiornare il sito live.',
      liveFailedPreflight:
        'Vercel non è pronto: nessuna modifica è stata salvata o inviata. Chiedi all’operatore di collegare il progetto e verificare l’accesso Vercel.',
      liveFailedPrep:
        'Controlli contenuto o build non riusciti. Nulla è stato inviato online. Leggi i dettagli e correggi prima di riprovare.',
      liveFailedCommit:
        'Impossibile salvare le modifiche in locale. Chiedi all’operatore di verificare Git su questo computer.',
      liveFailedPush:
        'Impossibile inviare le modifiche al repository online. Chiedi all’operatore di verificare l’accesso Git.',
      liveFailedDeployAfterPush:
        'Contenuti pubblicati su GitHub, ma sito NON messo online. Chiedi all’operatore di controllare Vercel.',
      liveConfirm: 'Mettere online {count} aggiornamento/i adesso? Verranno controllati i contenuti e aggiornato il sito live.',
      liveConfirmRedeploy: 'Aggiornare il sito live dall’ultima versione salvata?',
      liveCommitMessage: 'Aggiornamento da studio',
      livePhasePreflight: '→ Verifica collegamento e accesso Vercel',
      livePreflightOk: 'Vercel pronto per il deploy non interattivo.',
      livePhasePrep: '→ Controllo contenuti e build del sito',
      livePrepOk: 'Controlli e build OK.',
      livePhaseCommit: '→ Salvataggio modifiche',
      liveCommitOk: 'Modifiche salvate.',
      liveSkipCommit: '→ Nessun file nuovo da salvare (invio aggiornamenti esistenti).',
      liveNoCommitNeeded: '→ Nessun nuovo salvataggio necessario.',
      livePhasePush: '→ Invio aggiornamenti online',
      livePushOk: 'Aggiornamenti inviati.',
      livePhaseDeploy: '→ Aggiornamento sito live',
      liveDeployOk: 'Deploy di produzione completato.',
      outputDetails: 'Dettagli tecnici',
      testOutputDetails: 'Dettagli tecnici del Test build',
      liveOutputDetails: 'Dettagli tecnici della pubblicazione',
      liveIssues: {
        noRepo:
          'Questa cartella non è ancora collegata al backup online. L’operatore lo configura durante la consegna.',
        noRemote:
          'La pubblicazione online non è ancora collegata. Contatta l’operatore — collega GitHub e hosting in fase di setup.',
        vercelLinkMissing:
          'Collegamento Vercel assente. L’operatore deve eseguire “vercel link” dalla cartella del progetto prima di riprovare.',
        vercelLinkUnreadable:
          'Il collegamento Vercel non è leggibile. L’operatore deve controllare i permessi di .vercel/project.json.',
        vercelLinkInvalid:
          'Il collegamento Vercel non è valido. L’operatore deve ricrearlo in modo sicuro con “vercel link”.',
        vercelProjectMissing: 'Nel collegamento Vercel manca l’identificatore del progetto.',
        vercelScopeMissing: 'Nel collegamento Vercel manca l’identificatore dello scope.',
        vercelCliMissing:
          'La CLI Vercel non è installata. L’operatore deve installarla prima di riprovare.',
        vercelCliUnusable:
          'La CLI Vercel è presente ma non è utilizzabile o è incompatibile. L’operatore deve ripararla o aggiornarla prima di riprovare.',
        vercelAuthMissing:
          'La CLI Vercel è installata, ma l’autenticazione è assente o non valida. L’operatore deve autenticarsi di nuovo.',
        vercelProjectUnresolved:
          'Il progetto collegato non è accessibile nello scope Vercel configurato. L’operatore deve verificare progetto, team e permessi.'
      }
    },
    collections: {
      pageTitle: 'Studio · Collezioni',
      intro: 'Scegli una collezione da modificare, riordina l’elenco sul sito o creane una nuova.',
      title: 'Collezioni',
      count: '{count} file di collezione in content/collections/',
      createLink: '+ Crea nuova collezione',
      empty: 'Nessuna collezione ancora.',
      itemCount: '{count} oggetti',
      orderLegend: 'Ordine sul sito',
      orderHint:
        'Le frecce riordinano le collezioni in home, sidebar e pagina /collections. Salva per scrivere sort_order nei file YAML.',
      saveOrder: 'Salva ordinamento',
      deletedSuccess: 'Collezione «{title}» eliminata.',
      missingCollection: 'La collezione «{id}» non esiste più. Potrebbe essere stata eliminata.'
    },
    collectionsNew: {
      pageTitle: 'Studio · Nuova collezione',
      intro:
        'Crea un nuovo file in content/collections/. Usa lettere minuscole, numeri e trattini per l’id, ad esempio entita-estate.',
      title: 'Nuova collezione',
      introPanel: 'Scegli quali oggetti appartengono a questo gruppo.',
      id: 'Id collezione',
      idHint: 'Non modificabile in seguito. Diventa nome file e slug URL.',
      idPattern: 'Usa solo lettere minuscole, numeri e trattini.',
      titleField: 'Titolo collezione',
      description: 'Descrizione collezione',
      includedItems: 'Oggetti inclusi',
      noItems: 'Nessun oggetto disponibile.',
      createItemFirst: 'Crea prima un oggetto',
      create: 'Crea collezione',
      cancel: 'Annulla'
    },
    collectionsEdit: {
      intro:
        'Modifica testo pubblico, scegli gli oggetti e imposta l’ordine nella pagina collezione.',
      collectionId: 'Id collezione: {id}',
      titleField: 'Titolo collezione',
      description: 'Descrizione collezione',
      itemOrder: 'Ordine oggetti',
      orderHint: 'L’ordine sotto viene usato nella pagina pubblica della collezione.',
      noItemsSelected: 'Nessun oggetto selezionato. Aggiungili dall’elenco sotto.',
      addItems: 'Aggiungi oggetti',
      add: 'Aggiungi',
      remove: 'Rimuovi',
      save: 'Salva collezione',
      back: 'Torna alle collezioni',
      delete: 'Elimina collezione',
      deleteConfirm:
        'Eliminare la collezione «{title}» ({id})? Verrà rimosso il file YAML. L\'operazione non si può annullare da qui.'
    },
    items: {
      pageTitle: 'Studio · Oggetti',
      intro: 'Scegli un oggetto da modificare, riordina le card del catalogo o creane una nuova.',
      title: 'Oggetti',
      count: '{count} file in content/items/',
      createLink: '+ Crea nuovo oggetto',
      namesLegend: 'Nomi oggetti',
      namesHint: 'Scegli come chiamare un singolo oggetto e il relativo plurale nelle pagine pubbliche.',
      singular: 'Nome oggetto (singolare)',
      plural: 'Nome oggetto (plurale)',
      saveNames: 'Salva nomi oggetti',
      empty: 'Nessun oggetto ancora.',
      orderLegend: 'Ordine nel catalogo',
      orderHint:
        'Usato sul sito quando in Catalogo è impostato «Manuale». Le frecce riordinano le card degli oggetti; salva per applicare.',
      saveOrder: 'Salva ordinamento',
      deletedSuccess: 'Oggetto «{title}» eliminato.',
      missingItem: 'L\'oggetto «{id}» non esiste più. Potrebbe essere stata eliminata.'
    },
    itemsNew: {
      pageTitle: 'Studio · Nuovo oggetto',
      intro:
        'Crea un nuovo file in content/items/. Usa lettere minuscole, numeri e trattini per l’id, ad esempio anello-argento.',
      title: 'Nuovo oggetto',
      introPanel: 'I campi meta iniziali dipendono dal preset scelto.',
      id: 'Id oggetto',
      idHint: 'Non modificabile in seguito. Diventa nome file e slug URL.',
      idPattern: 'Usa solo lettere minuscole, numeri e trattini.',
      titleField: 'Titolo oggetto',
      preset: 'Preset meta',
      description: 'Descrizione',
      photo: 'Foto (opzionale)',
      photoHint: 'JPG, PNG o WebP. Salvata come static/images/items/{id}.jpg',
      create: 'Crea oggetto',
      cancel: 'Annulla'
    },
    itemsEdit: {
      intro:
        'Modifica i contenuti pubblici dell\'oggetto. Carica una foto qui o usa il campo percorso immagine per casi avanzati.',
      preview: 'Anteprima oggetto',
      itemId: 'Id oggetto: {id}',
      uploadPhoto: 'Carica foto',
      uploadHint:
        'Salvata come static/images/items/{id}.jpg (o .png / .webp). Il percorso immagine si aggiorna automaticamente.',
      imagePath: 'Percorso immagine',
      imageAlt: 'Descrizione immagine',
      gallery: 'Galleria oggetto',
      galleryHint:
        'Riordina le immagini mostrate nella pagina oggetto. La riga con ruolo «cover» diventa la copertina; altrimenti viene usata la prima immagine.',
      galleryFile: 'Percorso immagine',
      galleryAlt: 'Descrizione immagine',
      galleryRole: 'Ruolo',
      galleryAdd: '+ Aggiungi immagine',
      galleryRemove: 'Rimuovi',
      galleryMoveUp: 'Sposta l’immagine {position} verso l’alto',
      galleryMoveDown: 'Sposta l’immagine {position} verso il basso',
      galleryEmpty: 'Nessuna immagine in galleria. Aggiungine una con il pulsante sotto.',
      galleryUpload: 'Aggiungi immagine alla galleria',
      galleryUploadHint:
        'Carica un JPG, PNG o WebP alla volta. Salvata in static/images/items/ senza sostituire immagini esistenti.',
      titleField: 'Titolo oggetto',
      subtitle: 'Sottotitolo',
      status: 'Stato',
      priceMode: 'Modalità prezzo',
      description: 'Descrizione',
      notice: 'Avviso oggetto',
      noticeHint: 'Lascia vuoto per nascondere l’avviso nella pagina dell’oggetto.',
      details: 'Dettagli oggetto',
      detailsHint:
        'Aggiungi, rinomina e riordina le voci mostrate nel blocco Dettagli sulla pagina pubblica. Usa «Gruppo › Voce» (o «Gruppo > Voce») per creare un titolo in evidenza con sottovoci indentate. I menu a tendina propongono nomi e valori già usati nel catalogo.',
      detailsEmpty: 'Nessuna voce di dettaglio. Aggiungine una con il pulsante sotto.',
      detailLabel: 'Nome voce',
      detailValue: 'Valore',
      detailAdd: '+ Aggiungi voce',
      detailRemove: 'Rimuovi',
      save: 'Salva oggetto',
      back: 'Torna agli oggetti',
      delete: 'Elimina oggetto',
      deleteConfirm:
        'Eliminare l\'oggetto «{title}» ({id})? Verranno rimossi il file YAML e l\'eventuale foto caricata. L\'operazione non si può annullare da qui.'
    },
    news: {
      pageTitle: 'Studio · News',
      intro: 'Scegli un post da modificare, riordina l\'elenco sul sito o creane uno nuovo.',
      title: 'News',
      count: '{count} file post in content/news/',
      createLink: '+ Crea nuovo post',
      empty: 'Nessun post ancora.',
      orderLegend: 'Ordine sul sito',
      orderHint:
        'Le frecce riordinano i post in home, sidebar e pagina /news. Salva per scrivere sort_order nei file YAML. A parità di ordine manuale, vale la data più recente.',
      saveOrder: 'Salva ordinamento',
      deletedSuccess: 'Post «{title}» eliminato.',
      missingPost: 'Il post «{id}» non esiste più. Potrebbe essere stato eliminato.'
    },
    newsNew: {
      pageTitle: 'Studio · Nuovo post',
      intro:
        'Crea un nuovo post in content/news/. Usa lettere minuscole, numeri e trattini per l’id, ad esempio spring-announcement.',
      title: 'Nuovo post',
      introPanel: 'I post compaiono su /news, dal più recente.',
      id: 'Id post',
      idHint: 'Non modificabile in seguito. Diventa nome file e slug URL.',
      idPattern: 'Usa solo lettere minuscole, numeri e trattini.',
      titleField: 'Titolo post',
      date: 'Data di pubblicazione',
      dateHint: 'Formato YYYY-MM-DD.',
      excerpt: 'Estratto (opzionale)',
      excerptHint: 'Breve teaser nella lista news.',
      body: 'Testo',
      photo: 'Foto (opzionale)',
      photoHint: 'JPG, PNG o WebP. Salvata come static/images/news/{id}.jpg',
      imageAlt: 'Descrizione immagine',
      create: 'Crea post',
      cancel: 'Annulla'
    },
    newsEdit: {
      intro:
        'Modifica i contenuti pubblici del post. Carica una foto qui o usa il campo percorso immagine per casi avanzati.',
      preview: 'Anteprima post',
      postId: 'Id post: {id}',
      uploadPhoto: 'Carica foto',
      uploadHint:
        'Salvata come static/images/news/{id}.jpg (o .png / .webp). Il percorso immagine si aggiorna automaticamente.',
      imagePath: 'Percorso immagine',
      imageAlt: 'Descrizione immagine',
      titleField: 'Titolo post',
      date: 'Data di pubblicazione',
      excerpt: 'Estratto',
      excerptHint: 'Breve teaser nella lista news. Lascia vuoto per usare la prima riga del testo.',
      body: 'Testo',
      save: 'Salva post',
      back: 'Torna alle news',
      delete: 'Elimina post',
      deleteConfirm:
        'Eliminare il post «{title}» ({id})? Verranno rimossi il file YAML e l\'eventuale foto caricata. L\'operazione non si può annullare da qui.'
    },
    about: {
      pageTitle: 'Studio · Chi siamo',
      intro:
        'Modifica la pagina pubblica /about. Usala per storia, processo e background dello studio. La visibilità in home si regola da Sito → Layout.',
      titleField: 'Titolo pagina',
      introField: 'Introduzione',
      portraitLegend: 'Ritratto autore (opzionale)',
      showPortrait: 'Mostra la foto nella pagina Chi siamo',
      portraitUpload: 'Carica foto',
      portraitUploadHint: 'JPEG, PNG o WebP. Se disattivi la visualizzazione, la foto resta salvata ma non compare sul sito.',
      portraitAlt: 'Testo alternativo foto',
      portraitCaption: 'Didascalia visibile della foto',
      portraitCaptionHint: 'Opzionale. Supporta Atelier Mark e compare sotto il ritratto.',
      sectionLegend: 'Sezione opzionale',
      sectionHeading: 'Titolo sezione',
      sectionBody: 'Testo sezione',
      save: 'Salva pagina'
    },
    catalog: {
      pageTitle: 'Studio · Catalogo',
      intro:
        'Come si presenta il catalogo sul sito pubblico: testi, ordinamento e anteprima in home. I contenuti delle singole schede si gestiscono in Oggetti.',
      presentationLegend: 'Pagina catalogo',
      eyebrow: 'Eyebrow catalogo in home',
      eyebrowHint: 'Etichetta facoltativa sopra il titolo della sezione catalogo in home. La pagina /catalog usa la label configurata in Sito → Layout.',
      introField: 'Testo introduttivo',
      introHint: 'Mostrato nella sezione catalogo in home e su /catalog. Lascia vuoto per il testo predefinito del tema (solo su /catalog).',
      listingLegend: 'Elenco',
      sort: 'Ordinamento',
      sortManual: 'Manuale (come da ordine nella scheda oggetto, poi titolo)',
      sortTitleAsc: 'Titolo A → Z',
      sortTitleDesc: 'Titolo Z → A',
      homeLimit: 'Limite in home',
      homeLimitHint: 'Quante card mostrare in home quando il catalogo è in colonna principale. 0 = tutte, massimo {max}.',
      save: 'Salva impostazioni catalogo'
    },
    signals: {
      pageTitle: 'Studio · Signal Cloud',
      intro:
        'Modifica domande per i visitatori ed etichette risposta. Gli id domanda e risposta restano fissi così le pagine degli oggetti esistenti restano stabili.',
      question: 'Domanda',
      hint: 'Suggerimento',
      answer: 'Risposta · {id}',
      faqTitle: 'FAQ pubblica',
      faqQuestionHint:
        'La domanda pubblica riutilizza la domanda della Signal Cloud qui sopra. Non viene duplicata.',
      faqVisible: 'Mostra nella pagina FAQ pubblica',
      faqAnswer: 'Risposta pubblica',
      faqAnswerHint: 'Obbligatoria quando questa FAQ è visibile.',
      faqGroup: 'Gruppo',
      faqGroupHint: 'Titolo facoltativo per raggruppare FAQ correlate.',
      faqOrder: 'Ordine',
      faqOrderHint: 'Numero intero facoltativo. I numeri più bassi compaiono prima.',
      save: 'Salva Signal Cloud',
      enabled: 'Mostra sulle pagine degli oggetti',
      remove: 'Rimuovi signal',
      removeConfirm:
        'Rimuovere il signal "{id}"? Verrà eliminato da config/signal-clouds.yaml. Ripristina da Git se serve.'
    },
    common: {
      preview: 'Anteprima',
      localOnly: 'Solo locale.',
      productionReadonly: 'Produzione in sola lettura.',
      previewFirst: 'Anteprima prima.',
      publishWhenReady: 'Pubblica quando pronto.',
      keepBackups: 'Conserva backup.',
      desktopClient: 'Atelier Desktop (clienti).'
    }
  },
  presets: {
    appearance: {
      warm: 'Atelier caldo (predefinito)',
      neutral: 'Carta neutra',
      dark: 'Studio scuro',
      noir: 'Noir',
      intimate: 'Editoriale intimo',
      space: 'Universo condiviso',
      'funny-coloured': 'Colorato e assurdo',
      custom: 'Colori personalizzati'
    },
    font: {
      system: 'Sistema (sans-serif locale)',
      inter: 'Inter (sans-serif moderno)',
      'source-serif': 'Source Serif 4 (serif editoriale)',
      fraunces: 'Fraunces (serif artigianale)',
      'dm-sans': 'DM Sans (sans-serif pulito)',
      lora: 'Lora (serif elegante)'
    },
    items: {
      default: 'Oggetto generico',
      handmade: 'Artigianato / craft',
      artwork: 'Opera / arte visiva',
      jewelry: 'Gioielleria',
      print: 'Stampa / edizione',
      furniture: 'Mobili / design oggetti',
      writing: 'Scrittura / progetto creativo'
    }
  },
  fields: {
    id: 'Id',
    collectionId: 'Id collezione',
    itemId: 'Id oggetto',
    siteTitle: 'Titolo del sito',
    tagline: 'Sottotitolo',
    language: 'Lingua',
    notice: 'Avviso pubblico',
    footerNote: 'Nota a piè di pagina',
    emailAddress: 'Email di contatto',
    emailLabel: 'Etichetta pulsante email',
    emailSubjectPrefix: 'Prefisso oggetto email',
    whatsappPhone: 'Numero WhatsApp',
    whatsappLabel: 'Etichetta pulsante WhatsApp',
    collectionTitle: 'Titolo collezione',
    collectionDescription: 'Descrizione collezione',
    itemTitle: 'Titolo oggetto',
    newsId: 'Id post',
    newsTitle: 'Titolo post',
    newsDate: 'Data di pubblicazione',
    newsBody: 'Testo post',
    description: 'Descrizione',
    itemNameSingular: 'Nome oggetto (singolare)',
    itemNamePlural: 'Nome oggetto (plurale)',
    aboutTitle: 'Titolo pagina Chi siamo'
  },
  server: {
    saveSuccess: 'Salvato. Validazione strutturale superata. Aggiorna la scheda anteprima per vedere le modifiche.',
    saveValidationProblem: 'Salvato, ma la validazione ha segnalato un problema:\n{output}',
    saveSiteError: 'Impossibile salvare le impostazioni sito.',
    saveLanguageError: 'Impossibile salvare la lingua.',
    saveContactError: 'Impossibile salvare i contatti.',
    saveSocialError: 'Impossibile salvare i link social.',
    saveFooterError: 'Impossibile salvare il footer.',
    saveLayoutError: 'Impossibile salvare il layout.',
    saveAppearanceError: 'Impossibile salvare l’aspetto.',
    saveHeroBannerError: 'Impossibile salvare l’hero banner.',
    saveAboutError: 'Impossibile salvare la pagina Chi siamo.',
    saveCatalogError: 'Impossibile salvare le impostazioni catalogo.',
    saveCloudsError: 'Impossibile salvare Signal Cloud.',
    removeCloudError: 'Impossibile rimuovere il signal.',
    cloudRemoved: 'Signal rimosso. Aggiorna l’anteprima per verificare le pagine degli oggetti.',
    saveItemError: 'Impossibile salvare l\'oggetto.',
    saveItemNamesError: 'Impossibile salvare i nomi degli oggetti.',
    saveItemOrderError: 'Impossibile salvare l\'ordine degli oggetti.',
    deleteItemError: 'Impossibile eliminare l\'oggetto.',
    saveCollectionError: 'Impossibile salvare la collezione.',
    saveCollectionOrderError: 'Impossibile salvare l\'ordine delle collezioni.',
    deleteCollectionError: 'Impossibile eliminare la collezione.',
    saveNewsOrderError: 'Impossibile salvare l\'ordine dei post news.',
    deleteNewsError: 'Impossibile eliminare il post news.',
    createItemError: 'Impossibile creare l\'oggetto.',
    createCollectionError: 'Impossibile creare la collezione.',
    createNewsError: 'Impossibile creare il post news.',
    itemNotFound: 'Oggetto non trovato',
    collectionNotFound: 'Collezione non trovata',
    saveNewsError: 'Impossibile salvare il post news.',
    newsNotFound: 'Post news non trovato'
  },
  errors: {
    required: '{label} è obbligatorio.',
    idFormat: '{label} deve usare solo lettere minuscole, numeri e trattini.',
    yamlObject: '{path} deve contenere un oggetto YAML.',
    itemExists: 'Esiste già un oggetto con id "{id}".',
    itemOrderEmpty: 'L’ordine degli oggetti non può essere vuoto.',
    itemOrderDuplicate: 'L’ordine degli oggetti contiene id duplicati.',
    itemOrderIncomplete: 'L’ordine deve includere tutti gli oggetti del catalogo.',
    itemInCollections:
      'Impossibile eliminare l\'oggetto: è usato nelle collezioni {collections}. Rimuovila prima da quelle collezioni.',
    collectionExists: 'Esiste già una collezione con id "{id}".',
    collectionNotFound: 'Collezione non trovata.',
    collectionOrderEmpty: 'L’ordine collezioni non può essere vuoto.',
    collectionOrderDuplicate: 'L’ordine collezioni contiene id duplicati.',
    collectionOrderIncomplete: 'L’ordine deve includere tutte le collezioni.',
    newsOrderEmpty: 'L’ordine news non può essere vuoto.',
    newsOrderDuplicate: 'L’ordine news contiene id duplicati.',
    newsOrderIncomplete: 'L’ordine deve includere tutti i post news.',
    newsNotFound: 'Post news «{id}» non trovato.',
    metaLabelRequired: 'Ogni voce di dettaglio deve avere un nome.',
    galleryRowMismatch: 'Il numero di campi della galleria non corrisponde.',
    galleryImageFileRequired: 'Ogni riga galleria deve avere un percorso immagine.',
    galleryImagesRequired: 'Aggiungi almeno un’immagine alla galleria.',
    collectionNeedsItems: 'Scegli almeno un oggetto per questa collezione.',
    newsExists: 'Esiste già un post news con id "{id}".',
    newsDateInvalid: 'La data di pubblicazione deve usare il formato YYYY-MM-DD.',
    imageType: 'Usa un’immagine JPG, PNG o WebP.',
    imageRequired: 'Scegli un file immagine da caricare.',
    imageSize: 'L’immagine deve essere di 5 MB o meno.',
    missingCatalog: 'config/catalog.yaml non contiene un oggetto catalog.',
    missingAbout: 'config/about.yaml non contiene un oggetto about.',
    missingSignalClouds: 'config/signal-clouds.yaml non contiene signal_clouds.',
    missingSite: 'config/site.yaml non contiene un oggetto site.',
    aboutTitleRequired: 'Il titolo pagina Chi siamo è obbligatorio.',
    catalogHomeLimitInvalid: 'Il limite in home deve essere 0 (tutte) o un numero intero da 1 a {max}.',
    catalogHomeLimitMax: 'Il limite in home non può superare {max}.',
    heroBannerImageRequired: 'Carica un’immagine banner oppure disattiva la visualizzazione.',
    contactEmailRequired: 'L’email di contatto è obbligatoria quando il contatto email è abilitato.',
    contactWhatsappRequired: 'Il numero WhatsApp è obbligatorio quando il contatto WhatsApp è abilitato.',
    socialUrlInvalid: 'Inserisci un URL http o https valido per {network}.',
    footerLinkHrefRequired: 'Il link "{label}" nella colonna "{column}" richiede un URL o percorso.',
    footerLinkHrefInvalid:
      'Il link "{label}" nella colonna "{column}" deve iniziare con "/" o essere un URL http o https valido.',
    layoutPresetInvalid: 'Il preset layout deve essere single-column o catalog-sidebar.',
    layoutLatestNewsCountInvalid: 'Il numero di ultime news deve essere un intero da 1 a {max}.',
    layoutBlockPlacementsInvalid: 'Ogni destinazione deve essere colonna principale, sidebar o menù.',
    layoutBlockPlacementsRequired: 'Ogni elemento abilitato richiede almeno una destinazione.'
  },
  doctor: {
    foundCount: 'Content Doctor ha trovato {count} elemento/i da rivedere prima di pubblicare:',
    foundNothing: 'Content Doctor non ha trovato nulla di evidente da rivedere prima di pubblicare.',
    fileLabel: 'File: {source}',
    currentLabel: 'Attuale: "{detail}"',
    footerReminders: 'Queste note sono promemoria, non errori. Il sito può funzionare in locale.',
    footerValidate: 'Controlla la struttura con: npm run content:validate',
    footerStrict: 'Blocca la pubblicazione su queste note con: npm run content:doctor -- --strict',
    footerVerbose: 'Mostra dettagli tecnici con: npm run content:doctor -- --verbose',
    missingFile: {
      title: 'File mancante',
      problem: 'Manca un file di contenuto obbligatorio.',
      action: 'Ripristina il file o ricrea i contenuti seguendo la documentazione Atelier-Kit.'
    },
    unreadableFile: {
      title: 'File illeggibile',
      problemFormat: 'Questo file ha un problema di formattazione.',
      problemStructure: 'Questo file non è stato letto come file di contenuto normale.',
      actionFormat: 'Apri il file e correggi il problema indicato sotto, oppure confrontalo con un file di esempio funzionante.',
      actionStructure: 'Apri il file e verifica che la struttura corrisponda agli altri file config o oggetto.'
    },
    fields: {
      siteName: 'Titolo sito',
      siteTagline: 'Sottotitolo sito',
      siteNotice: 'Avviso sito',
      siteFooter: 'Nota piè di pagina',
      siteLanguage: 'Lingua sito',
      emailLabel: 'Etichetta pulsante email',
      emailAddress: 'Email contatto',
      emailSubject: 'Prefisso oggetto email',
      whatsappLabel: 'Etichetta pulsante WhatsApp',
      whatsappPhone: 'Numero WhatsApp',
      itemId: 'Id oggetto',
      itemTitle: 'Titolo oggetto',
      itemDescription: 'Descrizione oggetto',
      itemSubtitle: 'Sottotitolo oggetto',
      itemStatus: 'Stato oggetto',
      itemNotice: 'Avviso oggetto',
      itemImageAlt: 'Descrizione immagine',
      newsId: 'Id post',
      newsTitle: 'Titolo post',
      newsExcerpt: 'Estratto post',
      newsBody: 'Testo post',
      metaLabel: 'Campo dettaglio',
      signalQuestion: 'Domanda visitatore',
      signalHint: 'Suggerimento domanda',
      signalAnswer: 'Scelta risposta',
      signalQuestionId: 'Id domanda visitatore',
      contentField: 'Campo contenuto'
    },
    warnings: {
      starterText: {
        problem: '{title} sembra ancora testo segnaposto o demo.',
        action: 'Apri {source} e aggiorna {field} con contenuto reale.'
      },
      defaultQuestionLabel: 'Domanda {index}',
      metaFallbackLabel: 'Dettaglio {index}',
      siteDemoTitle: {
        title: 'Titolo sito',
        problem: 'Il titolo pubblico contiene ancora la parola "demo".',
        action: 'Apri config/site.yaml e imposta il nome reale che i visitatori devono vedere.'
      },
      editorialMarkup: {
        title: 'Markup editoriale',
        problem: 'Un campo testo del sito contiene tag Atelier Mark non validi: {detail}',
        action:
          'Apri Studio → Identità sito e correggi i tag evidenziati, oppure rimuovi le parentesi { e }.'
      },
      siteNoticeStarter: {
        title: 'Banner avviso sito',
        problem: 'I visitatori vedono ancora un avviso demo in cima al sito.',
        action:
          'Apri config/site.yaml e sostituisci l’avviso con testo reale, oppure svuotalo se non ti serve un banner.'
      },
      siteNoticeActive: {
        title: 'Banner avviso sito',
        problem: 'Un banner avviso è ancora visibile ai visitatori.',
        action: 'Apri config/site.yaml e conferma che il testo dell’avviso sia intenzionale prima di pubblicare.'
      },
      contactEmailPlaceholder: {
        title: 'Email contatto',
        problem: 'I visitatori contatterebbero ancora l’indirizzo demo hello@example.com.',
        action: 'Apri config/contact.yaml e imposta l’email reale per i messaggi Visitor Brief.'
      },
      whatsappMissingPhone: {
        title: 'Contatto WhatsApp',
        problem: 'Il contatto WhatsApp è attivo, ma non c’è un numero utilizzabile.',
        action: 'Apri config/contact.yaml e aggiungi un numero, oppure disattiva WhatsApp.'
      },
      signalCloudOptions: {
        title: 'Domanda visitatore "{label}"',
        problem: 'Questa domanda visitatore richiede almeno due scelte di risposta.',
        action: 'Apri config/signal-clouds.yaml e aggiungi altre opzioni di risposta per questa domanda.'
      },
      metaPlaceholder: {
        title: '{label} su "{itemTitle}"',
        problem: '"{label}" sembra ancora testo segnaposto.',
        action: 'Apri {source} e sostituisci "{label}" con informazioni reali su questo oggetto.'
      },
      itemsFolderMissing: {
        title: 'Cartella oggetti',
        problem: 'Il sito non ha ancora una cartella oggetti.',
        action: 'Crea almeno un oggetto con npm run item:new oppure aggiungi un file YAML in content/items/.'
      },
      itemsFolderEmpty: {
        title: 'Cartella oggetti',
        problem: 'Il sito non contiene ancora oggetti.',
        action: 'Crea almeno un oggetto con npm run item:new prima di pubblicare.'
      },
      itemFieldStarter: {
        title: '{fieldTitle} per "{itemTitle}"',
        problem: '{fieldTitle} sembra ancora testo segnaposto o demo.',
        action: 'Apri {source} e aggiorna {fieldTitle} con contenuto reale.'
      },
      itemTestId: {
        title: 'Oggetto "{itemTitle}"',
        problem: 'Questo id oggetto sembra una voce di test o esempio.',
        action: 'Crea un oggetto reale con npm run item:new oppure rinomina l’id prima di pubblicare.'
      },
      itemPlaceholderImage: {
        title: 'Immagine per "{itemTitle}"',
        problem: 'Questo oggetto usa ancora l’immagine segnaposto neutra.',
        action: 'Aggiungi una foto reale in static/images/items/ e aggiorna il percorso nel file dell’oggetto.'
      },
      itemDraftStatus: {
        title: 'Stato pubblicazione per "{itemTitle}"',
        problem: 'Questo oggetto è ancora contrassegnata come "{status}".',
        action:
          'Apri il file dell’oggetto e imposta uno stato pronto per il pubblico, ad es. "available", oppure rimuovi lo stato se non lo usi.'
      },
      itemShortDescription: {
        title: 'Descrizione per "{itemTitle}"',
        problem: 'La descrizione dell\'oggetto è molto breve e può sembrare incompleta ai visitatori.',
        action: 'Apri il file dell’oggetto e aggiungi una descrizione più chiara dell’oggetto, opera o progetto.'
      },
      itemNoMeta: {
        title: 'Dettagli per "{itemTitle}"',
        problem: 'Questo oggetto non ha ancora campi dettaglio aggiuntivi.',
        action: 'Aggiungi dettagli utili come materiale, dimensioni, disponibilità o tecnica nel file dell’oggetto.'
      },
      newsFieldStarter: {
        title: '{fieldTitle} per "{postTitle}"',
        problem: '{fieldTitle} sembra ancora testo starter o segnaposto.',
        action: 'Apri {source} e aggiorna {fieldTitle} con contenuto reale.'
      },
      newsTestId: {
        title: 'Id post per "{postTitle}"',
        problem: 'L’id del post sembra ancora una voce di test o esempio.',
        action: 'Rinomina id e file prima di pubblicare, oppure conferma che sia intenzionale.'
      },
      newsPlaceholderImage: {
        title: 'Immagine per "{postTitle}"',
        problem: 'Il post usa ancora un percorso immagine segnaposto.',
        action: 'Carica una foto reale in Studio o aggiorna image_file nel file post.'
      },
      newsShortBody: {
        title: 'Testo per "{postTitle}"',
        problem: 'Il testo del post è molto breve.',
        action: 'Aggiungi più contesto così i visitatori capiscono l’annuncio.'
      }
    }
  },
  publish: {
    title: 'Preparazione publish Atelier-Kit',
    intro: 'Esegue validazione, doctor, check e build.',
    stepValidation: 'Validazione strutturale',
    stepDoctor: 'Content Doctor',
    stepCheck: 'Controlli Type e Svelte',
    stepBuild: 'Build di produzione',
    stepDeploy: 'Deploy produzione Vercel',
    complete: 'Preparazione publish completata.',
    previewHint: 'Anteprima in locale con: npm run preview',
    deployHint: 'Deploy su Vercel con: npm run publish -- --deploy'
  },
  validate: {
    ok: 'Validazione contenuti Atelier-Kit OK.',
    yamlMustBeObject: '{path} deve contenere un oggetto YAML.',
    yamlReadError: 'Impossibile leggere {path}: {message}',
    missingField: '{source}: "{field}" mancante o non valido.',
    duplicate: '{label} duplicato: {value}',
    metaMustBeArray: '{source}: "{pathLabel}" deve essere un array quando presente.',
    metaEntryMustBeObject: '{source}: "{entryPath}" deve essere un oggetto.',
    metaEntryNeedsValueOrChildren:
      '{source}:{entryPath}: la voce meta deve avere un "value" non vuoto oppure "children" non vuoti.',
    missingSiteObject: '{source}: manca l’oggetto "site".',
    editorialMarkupInvalid: '{source}: markup Atelier Mark non valido: {detail}',
    appearanceMustBeObject: '{source}: site.appearance deve essere un oggetto quando presente.',
    appearancePresetInvalid: '{source}: site.appearance.preset deve essere uno tra: warm, neutral, dark, noir, intimate, space, funny-coloured, custom.',
    appearanceColorInvalid: '{source}: site.appearance.{field} deve essere un colore hex come #f8f0e4.',
    appearanceBackgroundInvalid: '{source}: site.appearance.background_image deve essere un percorso sotto /images/site/.',
    appearanceFontPresetInvalid:
      '{source}: site.appearance.font_preset deve essere uno tra: system, inter, source-serif, fraunces, dm-sans, lora.',
    appearanceBackgroundFitInvalid:
      '{source}: site.appearance.background_fit deve essere uno tra: top, center, contain.',
    siteUrlInvalid: '{source}: site.url deve essere un URL http o https valido.',
    ogImageInvalid: '{source}: site.og_image deve essere una stringa non vuota quando presente.',
    ogImageUrlInvalid: '{source}: site.og_image deve essere un URL http o https valido.',
    ogImagePathInvalid: '{source}: site.og_image deve essere un percorso sotto /images/ o un URL https completo.',
    siteFaviconInvalid: '{source}: site.favicon deve essere un percorso sotto /images/site/ quando presente.',
    missingCatalogObject: '{source}: manca l’oggetto "catalog".',
    catalogSortInvalid:
      '{source}: catalog.sort deve essere uno tra: manual, title_asc, title_desc.',
    catalogHomeLimitInvalid:
      '{source}: catalog.home_limit deve essere un intero tra 1 e {max} quando presente (oppure ometti il campo per mostrarle tutte).',
    catalogEyebrowInvalid: '{source}: catalog.eyebrow deve essere una stringa quando presente.',
    catalogIntroInvalid: '{source}: catalog.intro deve essere una stringa quando presente.',
    routeSegmentUnsupported:
      '{source}: route_segment non è supportato in Atelier-Kit 1.0. Gli oggetti vivono sotto /items.',
    missingSignalCloudsArray: '{source}: manca l’array "signal_clouds".',
    cloudMustBeObject: '{source}: ogni cloud deve essere un oggetto.',
    cloudOptionsRequired: '{source}:{cloudId}: options deve essere un array non vuoto.',
    optionMustBeObject: '{source}:{cloudId}: ogni option deve essere un oggetto.',
    cloudFaqMustBeObject:
      '{source}:{cloudId}: faq deve essere un oggetto quando presente.',
    cloudFaqVisibleMustBeBoolean:
      '{source}:{cloudId}: faq.visible deve essere true o false quando presente.',
    cloudFaqAnswerRequired:
      '{source}:{cloudId}: faq.answer è obbligatoria e non può essere vuota quando faq.visible è true.',
    cloudFaqAnswerMustBeString:
      '{source}:{cloudId}: faq.answer deve essere una stringa quando presente.',
    cloudFaqGroupMustBeString:
      '{source}:{cloudId}: faq.group deve essere una stringa quando presente.',
    cloudFaqOrderMustBeInteger:
      '{source}:{cloudId}: faq.order deve essere un numero intero non negativo quando presente.',
    missingAboutObject: '{source}: manca l’oggetto "about".',
    sectionMustBeObject: '{sectionSource}: la sezione deve essere un oggetto.',
    missingContactObject: '{source}: manca l’oggetto "contact".',
    contactEmailMustBeObject: '{source}: "contact.email" deve essere un oggetto quando presente.',
    contactWhatsappMustBeObject: '{source}: "contact.whatsapp" deve essere un oggetto quando presente.',
    missingSocialObject: '{source}: manca l’oggetto "social".',
    socialLinksMustBeArray: '{source}: "social.links" deve essere un array.',
    socialLinkMustBeObject: '{source}: il link deve essere un oggetto.',
    socialLinkIdInvalid: '{source}: id deve essere uno tra: instagram, facebook, x, github (ricevuto "{id}").',
    socialLinkUrlInvalid: '{source}: url deve essere un URL http o https valido.',
    missingFooterObject: '{source}: manca l’oggetto "footer".',
    footerColumnsMustBeArray: '{source}: "footer.columns" deve essere un array se presente.',
    footerColumnMustBeObject: '{source}: la colonna deve essere un oggetto.',
    footerColumnLinksMustBeArray: '{source}: links deve essere un array se presente.',
    footerLinkMustBeObject: '{source}: il link deve essere un oggetto.',
    footerLinkHrefInvalid: '{source}: href deve iniziare con "/" o essere un URL http o https valido.',
    footerLinkLabelRequired: '{source}: l’etichetta del link non può essere vuota se href è impostato.',
    footerFieldMustBeString: '{source}: footer.{field} deve essere una stringa se presente.',
    footerShowSocialInvalid: '{source}: footer.show_social deve essere true o false se presente.',
    missingLayoutObject: '{source}: manca l’oggetto "layout".',
    layoutPresetInvalid: '{source}: layout.preset deve essere "single-column" o "catalog-sidebar".',
    layoutBlocksMustBeObject: '{source}: layout.blocks deve essere un oggetto quando presente.',
    layoutBlockMustBeObject: '{source}: il blocco layout deve essere un oggetto.',
    layoutBlockIdInvalid: '{source}: id blocco layout non valido.',
    layoutBlockEnabledInvalid: '{source}: enabled deve essere true o false quando presente.',
    layoutBlockPlacementInvalid: '{source}: placement deve essere "main", "sidebar" o "menu" quando presente.',
    layoutBlockPlacementsMustBeArray: '{source}: placements deve essere un array quando presente.',
    layoutBlockPlacementsItemInvalid: '{source}: ogni destinazione deve essere "main", "sidebar" o "menu".',
    layoutBlockPlacementsDuplicate: '{source}: placements non deve contenere duplicati.',
    layoutBlockPlacementsAmbiguous: '{source}: placement e placements non devono essere presenti insieme.',
    layoutBlockPlacementsRequired: '{source}: un blocco abilitato deve avere almeno una destinazione.',
    layoutBlockLabelInvalid: '{source}: label deve essere una stringa quando presente.',
    layoutHomeMustBeObject: '{source}: layout.home deve essere un oggetto quando presente.',
    layoutHomeShowInvalid:
      '{source}: layout.home.show deve essere "collections", "catalog" o "both" quando presente.',
    layoutSidebarMustBeObject: '{source}: layout.sidebar deve essere un oggetto quando presente.',
    layoutSidebarFlagInvalid:
      '{source}: layout.sidebar.{field} deve essere true o false quando presente.',
    layoutLatestNewsCountInvalid:
      '{source}: layout.sidebar.latest_news_count deve essere un intero da 1 a {max} quando presente.',
    missingLegalObject: '{source}: manca l’oggetto "legal".',
    legalPagesMustBeObject: '{source}: "legal.pages" deve essere un oggetto.',
    legalPageMustBeObject: '{source}: la pagina deve essere un oggetto.',
    itemsDirMissing: 'La cartella content/items non esiste.',
    itemsDirEmpty: 'content/items deve contenere almeno un file .yaml oggetto.',
    imageFileMustStartWithSlash: '{source}: image_file deve iniziare con "/".',
    imageFileMissing: '{source}: image_file non esiste in static/: {imageFile}',
    collectionIdInvalid: '{source}: id deve usare solo lettere minuscole, numeri e trattini singoli.',
    collectionIdFilenameMismatch: '{source}: id deve corrispondere al nome file "{expectedId}".',
    collectionItemsRequired: '{source}: "items" deve essere un array non vuoto.',
    collectionItemRefInvalid: '{itemSource}: il riferimento oggetto deve essere una stringa non vuota.',
    collectionItemRefUnknown: '{itemSource}: id oggetto sconosciuto "{itemId}".',
    newsIdInvalid: '{source}: l’id deve usare solo lettere minuscole, numeri e trattini singoli.',
    newsIdFilenameMismatch: '{source}: l’id deve corrispondere al nome file "{expectedId}".',
    newsDateInvalid: '{source}: la data deve usare il formato YYYY-MM-DD.',
    newsSortOrderInvalid:
      '{source}: sort_order deve essere un numero intero quando presente.',
    newsReadingFormatInvalid:
      '{source}: reading_format deve essere uno tra: book (ricevuto "{value}").'
  },
  wizard: {
    usageTitle: 'Utilizzo:',
    fieldRequired: 'Questo campo è obbligatorio.',
    chooseUseCase: 'Scegli un caso d’uso:',
    templatePrompt: 'Numero o id template:',
    chooseValidTemplate: 'Scegli un numero o id template valido.',
    setupSummary: 'Riepilogo configurazione:',
    mode: 'Modalità',
    target: 'Destinazione',
    template: 'Template',
    siteTitle: 'Titolo sito',
    tagline: 'Sottotitolo',
    language: 'Lingua',
    email: 'Email',
    whatsapp: 'WhatsApp',
    whatsappDisabled: 'disattivato',
    firstItemTitle: 'Titolo primo oggetto',
    collectionTitle: 'Titolo collezione',
    complete: 'Configurazione guidata completata.',
    nextSteps: 'Prossimi passi:',
    replaceBeforePublish: 'Sostituisci immagini demo e testo segnaposto rimanente prima di pubblicare.',
    strictDoctorHint: 'Per un controllo pre-lancio, esegui: npm run content:doctor -- --strict',
    validationSkipped: 'Validazione saltata finché non installi le dipendenze nel nuovo sito cliente.',
    introTitle: 'Configurazione guidata Atelier-Kit',
    introBody: 'Rispondi a poche domande per generare contenuti iniziali del sito.',
    introNote: 'Potrai modificare i file in seguito se serve.',
    targetFolder: 'Cartella destinazione (percorso relativo)',
    whatsappPhone: 'Numero WhatsApp (opzionale)',
    notice: 'Avviso pubblico sito (opzionale, vuoto = nascosto)',
    firstItemOptional: 'Titolo primo oggetto (opzionale)',
    collectionOptional: 'Titolo collezione (opzionale)',
    confirmProceed: 'Procedere con questa configurazione?',
    templates: {
      writing: 'Scrittura / vetrina autore',
      artwork: 'Arte visiva / vetrina opere',
      handmade: 'Artigianato / craft',
      jewelry: 'Gioielli',
      collector: 'Collezionismo / vetrina scambi',
      furniture: 'Mobili / design oggetti'
    }
  },
  visitor: {
    common: {
      backToShowcase: '← Torna alla vetrina',
      backToNews: '← Torna alle notizie',
      backToCatalog: 'Torna al catalogo',
      home: 'Home',
      breadcrumb: 'Percorso',
      socialLinks: 'Link social',
      siteNav: 'Menù sito',
      viewAllCollections: 'Vedi tutte le collezioni',
      viewAllItems: 'Vedi tutti',
      readMore: 'Leggi tutto',
      allNews: 'Tutte le notizie'
    },
    home: {
      collectionsEyebrow: 'Collezioni',
      collectionsTitle: 'Collezioni',
      catalogEyebrow: 'Catalogo',
    },
    about: {
      pageTitle: 'Chi siamo',
      metaDescription: 'Storia e background di {siteName}.',
      eyebrow: 'Chi siamo'
    },
    faq: {
      navLabel: 'FAQ',
      pageTitle: 'Domande frequenti',
      metaDescription: 'Risposte alle domande frequenti di {siteName}.',
      eyebrow: 'FAQ',
      title: 'Domande frequenti',
      intro: 'Risposte pratiche alle domande più comuni.',
      empty: 'Non sono ancora disponibili domande frequenti.'
    },
    collections: {
      pageTitle: 'Collezioni',
      metaDescription: 'Collezioni curate da {siteName}.',
      eyebrow: 'Collezioni',
      title: 'Collezioni',
      intro: 'Gruppi di {itemPlural} selezionati per tema o serie.',
      empty: 'Nessuna collezione per ora.',
      collectionEyebrow: 'Collezione',
      selectedItemsEyebrow: '{itemPlural} selezionati'
    },
    catalog: {
      collections: 'Collezioni',
      latestNews: 'Ultime notizie',
      sidebarAriaLabel: 'Barra laterale catalogo'
    },
    catalogListing: {
      metaDescription: 'Tutte le {itemPlural} di {siteName}.',
      intro: 'Esplora tutte le {itemPlural} della vetrina.',
      empty: 'Nessun oggetto nel catalogo per ora.'
    },
    layout: {
      blocks: {
        about: 'Chi siamo',
        news: 'Notizie',
        collections: 'Collezioni',
        catalog: 'Catalogo'
      }
    },
    news: {
      pageTitle: 'Notizie',
      metaDescription: 'Notizie e aggiornamenti da {siteName}.',
      title: 'Notizie',
      empty: 'Nessun articolo per ora.'
    },
    search: {
      label: 'Cerca',
      placeholder: 'Cerca oggetti e notizie…',
      resultsLabel: 'Risultati di ricerca',
      noResults: 'Nessun risultato per "{query}".',
      resultTypeItem: 'Oggetto',
      resultTypeNews: 'Notizia'
    },
    item: {
      visitorBriefEyebrow: 'Scheda visitatore',
      talkAboutTitle: 'Parla di questo oggetto',
      talkAboutIntro:
        'Scegli alcune preferenze qui sotto. Atelier-Kit preparerà un messaggio da copiare o inviare via email o WhatsApp.',
      details: 'Dettagli',
      synopsisReadMore: 'Leggi tutto',
      synopsisShowLess: 'Mostra meno',
      pageNavAriaLabel: 'Navigazione oggetti',
      previousItem: '← Precedente',
      previousItemAria: 'Vai a {title}',
      nextItem: 'Successiva →',
      nextItemAria: 'Vai a {title}',
      material: 'Materiale',
      dimensions: 'Dimensioni',
      availability: 'Disponibilità'
    },
    imageLightbox: {
      dialogLabel: 'Immagine ingrandita',
      enlarge: 'Ingrandisci immagine: {title}',
      fitLegend: 'Adattamento immagine',
      fitCover: 'Copertina',
      fitContain: 'Intera',
      fitNatural: '1:1',
      close: 'Chiudi'
    },
    visitorBrief: {
      contactEyebrow: 'Contatto senza modulo',
      heading: 'Scrivi il tuo messaggio preparato',
      intro:
        'Scegli le risposte Signal Cloud qui sopra, poi copia questa scheda o apri email / WhatsApp con il testo già preparato.',
      emptyState:
        'Seleziona una o più risposte Signal Cloud qui sopra per rendere questa scheda più utile.',
      actionsAriaLabel: 'Azioni scheda visitatore',
      copyButton: 'Copia scheda visitatore',
      emailDefault: 'Invia via email',
      whatsappDefault: 'Invia su WhatsApp',
      copySuccess: 'Scheda visitatore copiata.',
      copyAndOpenInstagram: 'Copia e apri Instagram',
      copyAndOpenFacebook: 'Copia e apri Facebook',
      copyAndOpenSuccess: 'Messaggio copiato: incollalo nella conversazione.',
      copyError: 'Copia automatica non riuscita. Seleziona e copia la scheda manualmente.',
      popupError: 'Messaggio copiato, ma non è stato possibile aprire il profilo. Aprilo manualmente e incolla il messaggio.',
      interestLine: 'Mi interessa "{title}".',
      impressionsHeading: 'Le mie impressioni:',
      noSelections: 'Le mie impressioni: nessuna scelta Signal Cloud per ora.',
      itemPageLine: 'Pagina dell\'oggetto: {url}',
      emailSubjectPrefix: 'Interesse per'
    },
    signalCloud: {
      defaultHint:
        'Scelta singola. Seleziona un’opzione; una nuova scelta sostituisce quella precedente salvata in locale.',
      selected: 'Selezionato: {label}',
      noSelection: 'Nessuna opzione selezionata.',
      chooseOption: 'Scegli {label}'
    },
    error: {
      itemNotFoundTitle: 'Oggetto non trovato',
      itemNotFoundBody:
        'L\'oggetto richiesto non esiste nel catalogo. Potrebbe essere stata rimossa o l\'indirizzo non è più valido.',
      itemNotFoundId: 'Richiesta: {id}',
      pageNotFoundTitle: 'Pagina non trovata',
      pageNotFoundBody: 'La pagina che cerchi non esiste o non è più disponibile.',
      backToHome: 'Torna alla home',
      genericTitle: 'Qualcosa è andato storto',
      unexpectedError: 'Errore imprevisto.'
    },
    social: {
      instagram: 'Instagram',
      facebook: 'Facebook',
      x: 'X (Twitter)',
      github: 'Sostieni su GitHub Sponsors'
    }
  }
};
