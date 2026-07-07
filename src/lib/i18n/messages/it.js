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
        items: 'Entità',
        news: 'News',
        collections: 'Collezioni',
        signals: 'Segnali',
        readiness: 'Pubblicazione',
        help: 'Aiuto',
        preview: 'Anteprima'
      }
    },
    dashboard: {
      pageTitle: 'Studio · Panoramica',
      intro:
        'Tre aree, come nel menu a sinistra: scegli dove lavorare. Ogni box apre la prima pagina del gruppo.',
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
          description: 'Testi, catalogo, entità, collezioni, news e segnali visitatore.'
        },
        publish: {
          eyebrow: 'Online',
          title: 'Metti online',
          description: 'Controlli pre-lancio, guida operatore e anteprima del sito.'
        }
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
        'Esegui npm run publish -- --deploy dalla cartella del progetto per inviare le modifiche a Vercel.',
      keepBackups:
        'Fai commit su Git (o copia la cartella) prima di modifiche grandi. Le foto sono in static/images/items/.'
    },
    help: {
      pageTitle: 'Studio · Aiuto'
    },
    site: {
      pageTitle: 'Studio · Impostazioni sito',
      intro:
        'Modifica qui identità, aspetto e contatti del sito pubblico. Le modifiche vengono salvate nei file del progetto. Dopo il salvataggio, aggiorna la scheda anteprima se la homepage non si aggiorna subito.',
      appearance: {
        title: 'Aspetto del sito',
        intro: 'Colori di sfondo e immagine opzionale per la vetrina pubblica.',
        preset: 'Preset colori',
        baseColor: 'Sfondo base',
        accentColor: 'Bagliore accent',
        textColor: 'Colore testo',
        preview: 'Anteprima',
        backgroundImage: 'Immagine di sfondo (opzionale)',
        backgroundHint: 'JPG, PNG o WebP. Salvata in static/images/site/background.*',
        backgroundVsBanner:
          'Usa questo campo per uno sfondo a tutta pagina o una fascia alta sotto l’header. Se il sito ha una home personalizzata, potrebbe usare solo questo asset al posto del hero banner.',
        currentBackground: 'Attuale: {path}',
        removeBackground: 'Rimuovi immagine di sfondo',
        save: 'Salva aspetto'
      },
      identity: {
        title: 'Identità del sito',
        intro: 'Titolo, sottotitolo e messaggi visibili in home.',
        siteTitle: 'Titolo del sito',
        tagline: 'Sottotitolo',
        heroIntro: 'Testo introduttivo in home',
        heroIntroHint:
          'Un Invio va a capo; una riga vuota separa i paragrafi. Modifica solo il testo: stile e impaginazione restano quelli del tema.',
        heroSignature: 'Firma',
        heroSignatureHint:
          'Saluto o chiusura personale in home, mostrata sotto il testo introduttivo e allineata a destra. Lascia vuoto per nascondere.',
        language: 'Lingua',
        languages: {
          it: 'Italiano',
          en: 'Inglese'
        },
        notice: 'Avviso pubblico',
        noticeHint:
          'Messaggio breve in home, sotto il sottotitolo (riquadro evidenziato). Compare anche con testo introduttivo attivo. Lascia vuoto per nascondere.',
        footerNote: 'Nota a piè di pagina (opzionale)',
        footerNoteHint: 'Testo breve in home quando non c\'è footer multi-colonna. Il credit Atelier-Kit viene aggiunto automaticamente e non è rimovibile.',
        siteUrl: 'URL canonico del sito (opzionale)',
        siteUrlHint:
          'URL pubblico https usato per i link assoluti dell’immagine Open Graph. Lascia vuoto per usare l’host della richiesta corrente (ok su Vercel).',
        ogImage: 'Immagine Open Graph (opzionale)',
        ogImageHint:
          'Percorso sotto /images/… o URL https completo per le anteprime social (Facebook, Instagram, WhatsApp). Dimensione consigliata: 1200×630.',
        save: 'Salva impostazioni sito'
      },
      heroBanner: {
        title: 'Hero banner (opzionale)',
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
        save: 'Salva social'
      },
      footer: {
        title: 'Footer legale',
        intro:
          'Footer multi-colonna con copyright e disclaimer. Visibile su tutto il sito.',
        copyright: 'Riga copyright',
        legalLine: 'Riga legale (es. P.IVA)',
        showSocial: 'Mostra icone social nel footer',
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
          'Scegli colonna singola o layout a widget e dove mostrare about, news, collezioni e catalogo (contenuto principale, sidebar o menù in alto a destra).',
        preset: 'Preset layout',
        presets: {
          'single-column': 'Colonna singola (predefinito)',
          'catalog-sidebar': 'Layout a widget (contenuto + sidebar)'
        },
        blocksLegend: 'Elementi in home',
        blocksHint:
          'Ogni elemento può andare nel contenuto principale, nella sidebar o nel menù in alto a destra. La sidebar richiede il preset «Layout a widget».',
        placement: 'Posizione',
        placementMain: 'Contenuto principale',
        placementSidebar: 'Sidebar',
        placementMenu: 'Menù',
        blocks: {
          about: 'Chi siamo',
          news: 'News',
          collections: 'Collezioni',
          catalog: 'Catalogo'
        },
        latestNewsCount: 'Numero news',
        save: 'Salva layout'
      },
      nextSteps: {
        title: 'Prima di pubblicare',
        intro: 'Controlla lo stato di pubblicazione nello studio o esegui lo script publish dalla cartella del progetto.',
        link: 'Apri stato pubblicazione'
      }
    },
    readiness: {
      pageTitle: 'Studio · Stato pubblicazione',
      intro:
        'Content Doctor controlla testi segnaposto, immagini mancanti e altre note pre-lancio in linguaggio semplice. Esegui publish quando sei pronto a compilare e distribuire.',
      doctorTitle: 'Content Doctor',
      doctorOk: 'Niente di evidente da rivedere.',
      doctorReview: 'Rivedi le note qui sotto prima di pubblicare.',
      publishTitle: 'Comandi publish',
      publishIntro: 'Dalla cartella del progetto:',
      publishRun: 'Esegui preparazione publish',
      publishRunning: 'Preparazione publish in corso…',
      publishOk: 'Preparazione publish completata.',
      publishFailed: 'Preparazione publish non riuscita. Controlla l’output qui sotto.',
      liveTitle: 'Metti online',
      liveIntro:
        'Salva su Git le modifiche dello studio (config, contenuti e immagini caricate), esegue push e deploy in produzione su Vercel. Richiede remote Git e Vercel CLI collegato al progetto.',
      livePendingTitle: 'Modifiche locali in sospeso',
      livePendingEmpty:
        'Nessuna modifica non committata in config/, content/ o static/images/. Puoi comunque ridistribuire l’ultimo commit.',
      liveCommitsAhead: '{count} commit locale/i non ancora pushati.',
      liveRun: 'Metti online',
      liveRunning: 'Pubblicazione live in corso…',
      liveOk: 'Sito live aggiornato.',
      liveFailed: 'Impossibile pubblicare live.',
      liveFailedPrep: 'Preparazione publish non riuscita. Nessun commit o deploy eseguito.',
      liveFailedCommit: 'Commit Git non riuscito. Verifica nome/email Git e riprova.',
      liveFailedPush: 'Push Git non riuscito. Risolvi conflitti o autenticazione e riprova.',
      liveFailedDeploy: 'Deploy Vercel non riuscito. Il push Git può essere andato a buon fine — controlla la dashboard Vercel.',
      liveConfirm:
        'Mettere online adesso? Verranno eseguiti publish prep, commit dei file studio, push su origin e deploy in produzione.',
      liveCommitMessage: 'Aggiornamento da studio',
      livePhasePrep: '→ Preparazione publish (validate, doctor, check, build)',
      livePrepOk: 'Preparazione publish OK.',
      livePhaseCommit: '→ Commit Git',
      liveCommitOk: 'Commit creato.',
      liveSkipCommit: '→ Nessun file nuovo da committare (push dei commit locali esistenti).',
      liveNoCommitNeeded: '→ Nessun commit Git necessario.',
      livePhasePush: '→ Push Git',
      livePushOk: 'Push OK.',
      livePhaseDeploy: '→ Deploy produzione Vercel',
      liveIssues: {
        noRepo: 'Questa cartella non è un repository Git. Inizializza Git o clona il progetto sito.',
        noRemote: 'Manca il remote Git "origin". Aggiungi il repository GitHub prima di mettere online.'
      }
    },
    collections: {
      pageTitle: 'Studio · Collezioni',
      intro: 'Scegli una collezione da modificare o creane una nuova.',
      title: 'Collezioni',
      count: '{count} file di collezione in content/collections/',
      createLink: '+ Crea nuova collezione',
      empty: 'Nessuna collezione ancora.',
      createFirst: 'Crea la tua prima collezione',
      itemCount: '{count} entità'
    },
    collectionsNew: {
      pageTitle: 'Studio · Nuova collezione',
      intro:
        'Crea un nuovo file in content/collections/. Usa lettere minuscole, numeri e trattini per l’id, ad esempio entita-estate.',
      title: 'Nuova collezione',
      introPanel: 'Scegli quali entità appartengono a questo gruppo.',
      id: 'Id collezione',
      idHint: 'Non modificabile in seguito. Diventa nome file e slug URL.',
      idPattern: 'Usa solo lettere minuscole, numeri e trattini.',
      titleField: 'Titolo collezione',
      description: 'Descrizione collezione',
      includedItems: 'Entità incluse',
      noItems: 'Nessuna entità disponibile.',
      createItemFirst: 'Crea prima un\'entità',
      create: 'Crea collezione',
      cancel: 'Annulla'
    },
    collectionsEdit: {
      intro:
        'Modifica testo pubblico, scegli le entità e imposta l’ordine nella pagina collezione.',
      preview: 'Anteprima collezione',
      collectionId: 'Id collezione: {id}',
      titleField: 'Titolo collezione',
      description: 'Descrizione collezione',
      itemOrder: 'Ordine entità',
      orderHint: 'L’ordine sotto viene usato nella pagina pubblica della collezione.',
      noItemsSelected: 'Nessuna entità selezionata. Aggiungile dall’elenco sotto.',
      addItems: 'Aggiungi entità',
      add: 'Aggiungi',
      remove: 'Rimuovi',
      save: 'Salva collezione',
      back: 'Torna alle collezioni'
    },
    items: {
      pageTitle: 'Studio · Entità',
      intro: 'Scegli un\'entità da modificare o creane una nuova per il catalogo.',
      title: 'Entità',
      count: '{count} file entità in content/items/',
      createLink: '+ Crea nuova entità',
      empty: 'Nessuna entità ancora.',
      createFirst: 'Crea la tua prima entità'
    },
    itemsNew: {
      pageTitle: 'Studio · Nuova entità',
      intro:
        'Crea un nuovo file in content/items/. Usa lettere minuscole, numeri e trattini per l’id, ad esempio anello-argento.',
      title: 'Nuova entità',
      introPanel: 'I campi meta iniziali dipendono dal preset scelto.',
      id: 'Id entità',
      idHint: 'Non modificabile in seguito. Diventa nome file e slug URL.',
      idPattern: 'Usa solo lettere minuscole, numeri e trattini.',
      titleField: 'Titolo entità',
      preset: 'Preset meta',
      description: 'Descrizione',
      photo: 'Foto (opzionale)',
      photoHint: 'JPG, PNG o WebP. Salvata come static/images/items/{id}.jpg',
      create: 'Crea entità',
      cancel: 'Annulla'
    },
    itemsEdit: {
      intro:
        'Modifica i contenuti pubblici dell\'entità. Carica una foto qui o usa il campo percorso immagine per casi avanzati.',
      preview: 'Anteprima entità',
      itemId: 'Id entità: {id}',
      uploadPhoto: 'Carica foto',
      uploadHint:
        'Salvata come static/images/items/{id}.jpg (o .png / .webp). Il percorso immagine si aggiorna automaticamente.',
      imagePath: 'Percorso immagine',
      imageAlt: 'Descrizione immagine',
      titleField: 'Titolo entità',
      subtitle: 'Sottotitolo',
      status: 'Stato',
      priceMode: 'Modalità prezzo',
      description: 'Descrizione',
      notice: 'Avviso entità',
      noticeHint: 'Lascia vuoto per nascondere l’avviso nella pagina entità.',
      details: 'Dettagli entità',
      save: 'Salva entità',
      back: 'Torna alle entità'
    },
    news: {
      pageTitle: 'Studio · News',
      intro: 'Scegli un post da modificare o crea un nuovo annuncio.',
      title: 'News',
      count: '{count} file post in content/news/',
      createLink: '+ Crea nuovo post',
      empty: 'Nessun post ancora.',
      createFirst: 'Crea il tuo primo post'
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
      back: 'Torna alle news'
    },
    about: {
      pageTitle: 'Studio · Chi siamo',
      intro: 'Modifica la pagina pubblica /about. Usala per storia, processo e background dello studio.',
      enabled: 'Mostra la pagina Chi siamo sul sito pubblico',
      titleField: 'Titolo pagina',
      introField: 'Introduzione',
      portraitLegend: 'Ritratto autore (opzionale)',
      showPortrait: 'Mostra la foto nella pagina Chi siamo',
      portraitUpload: 'Carica foto',
      portraitUploadHint: 'JPEG, PNG o WebP. Se disattivi la visualizzazione, la foto resta salvata ma non compare sul sito.',
      portraitAlt: 'Testo alternativo foto',
      sectionLegend: 'Sezione opzionale',
      sectionHeading: 'Titolo sezione',
      sectionBody: 'Testo sezione',
      save: 'Salva pagina Chi siamo'
    },
    catalog: {
      pageTitle: 'Studio · Catalogo',
      intro:
        'Scegli come si chiamano le entità sul sito pubblico e quali campi compaiono su schede e pagine entità.',
      singular: 'Nome entità (singolare)',
      plural: 'Nome entità (plurale)',
      visibleFields: 'Campi visibili',
      showPrice: 'Mostra modalità prezzo',
      showAvailability: 'Mostra disponibilità',
      showMaterial: 'Mostra materiale',
      showDimensions: 'Mostra dimensioni',
      showStatus: 'Mostra stato',
      showMeta: 'Mostra blocco dettagli entità',
      save: 'Salva impostazioni catalogo'
    },
    signals: {
      pageTitle: 'Studio · Signal Clouds',
      intro:
        'Modifica domande per i visitatori ed etichette risposta. Gli id domanda e risposta restano fissi così le pagine entità esistenti restano stabili.',
      question: 'Domanda',
      hint: 'Suggerimento',
      answer: 'Risposta · {id}',
      save: 'Salva Signal Clouds',
      enabled: 'Mostra sulle pagine entità',
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
      keepBackups: 'Conserva backup.'
    }
  },
  presets: {
    appearance: {
      warm: 'Atelier caldo (predefinito)',
      neutral: 'Carta neutra',
      dark: 'Studio scuro',
      custom: 'Colori personalizzati'
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
    itemId: 'Id entità',
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
    itemTitle: 'Titolo entità',
    newsId: 'Id post',
    newsTitle: 'Titolo post',
    newsDate: 'Data di pubblicazione',
    newsBody: 'Testo post',
    description: 'Descrizione',
    itemNameSingular: 'Nome entità (singolare)',
    itemNamePlural: 'Nome entità (plurale)',
    aboutTitle: 'Titolo pagina Chi siamo'
  },
  server: {
    saveSuccess: 'Salvato. Validazione strutturale superata. Aggiorna la scheda anteprima per vedere le modifiche.',
    saveValidationProblem: 'Salvato, ma la validazione ha segnalato un problema:\n{output}',
    saveSiteError: 'Impossibile salvare le impostazioni sito.',
    saveContactError: 'Impossibile salvare i contatti.',
    saveSocialError: 'Impossibile salvare i link social.',
    saveFooterError: 'Impossibile salvare il footer.',
    saveLayoutError: 'Impossibile salvare il layout.',
    saveAppearanceError: 'Impossibile salvare l’aspetto.',
    saveHeroBannerError: 'Impossibile salvare l’hero banner.',
    saveAboutError: 'Impossibile salvare la pagina Chi siamo.',
    saveCatalogError: 'Impossibile salvare le impostazioni catalogo.',
    saveCloudsError: 'Impossibile salvare Signal Clouds.',
    removeCloudError: 'Impossibile rimuovere il signal.',
    cloudRemoved: 'Signal rimosso. Aggiorna l’anteprima per verificare le pagine entità.',
    saveItemError: 'Impossibile salvare l\'entità.',
    saveCollectionError: 'Impossibile salvare la collezione.',
    createItemError: 'Impossibile creare l\'entità.',
    createCollectionError: 'Impossibile creare la collezione.',
    createNewsError: 'Impossibile creare il post news.',
    itemNotFound: 'Entità non trovata',
    collectionNotFound: 'Collezione non trovata',
    saveNewsError: 'Impossibile salvare il post news.',
    newsNotFound: 'Post news non trovato'
  },
  errors: {
    required: '{label} è obbligatorio.',
    idFormat: '{label} deve usare solo lettere minuscole, numeri e trattini.',
    yamlObject: '{path} deve contenere un oggetto YAML.',
    itemExists: 'Esiste già un\'entità con id "{id}".',
    collectionExists: 'Esiste già una collezione con id "{id}".',
    collectionNeedsItems: 'Scegli almeno un\'entità per questa collezione.',
    newsExists: 'Esiste già un post news con id "{id}".',
    newsDateInvalid: 'La data di pubblicazione deve usare il formato YYYY-MM-DD.',
    imageType: 'Usa un’immagine JPG, PNG o WebP.',
    imageRequired: 'Scegli un file immagine da caricare.',
    imageSize: 'L’immagine deve essere di 5 MB o meno.',
    missingCatalog: 'config/catalog.yaml non contiene un oggetto catalog.',
    missingAbout: 'config/about.yaml non contiene un oggetto about.',
    missingSignalClouds: 'config/signal-clouds.yaml non contiene signal_clouds.',
    missingSite: 'config/site.yaml non contiene un oggetto site.',
    aboutTitleRequired: 'Il titolo pagina Chi siamo è obbligatorio quando la pagina è abilitata.',
    heroBannerImageRequired: 'Carica un’immagine banner oppure disattiva la visualizzazione.',
    contactEmailRequired: 'L’email di contatto è obbligatoria quando il contatto email è abilitato.',
    contactWhatsappRequired: 'Il numero WhatsApp è obbligatorio quando il contatto WhatsApp è abilitato.',
    socialUrlInvalid: 'Inserisci un URL http o https valido per {network}.',
    footerLinkHrefRequired: 'Il link "{label}" nella colonna "{column}" richiede un URL o percorso.',
    footerLinkHrefInvalid:
      'Il link "{label}" nella colonna "{column}" deve iniziare con "/" o essere un URL http o https valido.',
    layoutPresetInvalid: 'Il preset layout deve essere single-column o catalog-sidebar.',
    layoutLatestNewsCountInvalid: 'Il numero di ultime news deve essere un intero da 1 a {max}.'
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
      actionStructure: 'Apri il file e verifica che la struttura corrisponda agli altri file config o entità.'
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
      itemId: 'Id entità',
      itemTitle: 'Titolo entità',
      itemDescription: 'Descrizione entità',
      itemSubtitle: 'Sottotitolo entità',
      itemStatus: 'Stato entità',
      itemNotice: 'Avviso entità',
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
        action: 'Apri {source} e sostituisci "{label}" con informazioni reali su questa entità.'
      },
      itemsFolderMissing: {
        title: 'Cartella entità',
        problem: 'Il sito non ha ancora una cartella entità.',
        action: 'Crea almeno un\'entità con npm run item:new oppure aggiungi un file YAML in content/items/.'
      },
      itemsFolderEmpty: {
        title: 'Cartella entità',
        problem: 'Il sito non contiene ancora entità.',
        action: 'Crea almeno un\'entità con npm run item:new prima di pubblicare.'
      },
      itemFieldStarter: {
        title: '{fieldTitle} per "{itemTitle}"',
        problem: '{fieldTitle} sembra ancora testo segnaposto o demo.',
        action: 'Apri {source} e aggiorna {fieldTitle} con contenuto reale.'
      },
      itemTestId: {
        title: 'Entità "{itemTitle}"',
        problem: 'Questo id entità sembra una voce di test o esempio.',
        action: 'Crea un\'entità reale con npm run item:new oppure rinomina l’id prima di pubblicare.'
      },
      itemPlaceholderImage: {
        title: 'Immagine per "{itemTitle}"',
        problem: 'Questa entità usa ancora l’immagine segnaposto neutra.',
        action: 'Aggiungi una foto reale in static/images/items/ e aggiorna il percorso nel file entità.'
      },
      itemDraftStatus: {
        title: 'Stato pubblicazione per "{itemTitle}"',
        problem: 'Questa entità è ancora contrassegnata come "{status}".',
        action:
          'Apri il file entità e imposta uno stato pronto per il pubblico, ad es. "available", oppure rimuovi lo stato se non lo usi.'
      },
      itemShortDescription: {
        title: 'Descrizione per "{itemTitle}"',
        problem: 'La descrizione dell\'entità è molto breve e può sembrare incompleta ai visitatori.',
        action: 'Apri il file entità e aggiungi una descrizione più chiara dell’oggetto, opera o progetto.'
      },
      itemNoMeta: {
        title: 'Dettagli per "{itemTitle}"',
        problem: 'Questa entità non ha ancora campi dettaglio aggiuntivi.',
        action: 'Aggiungi dettagli utili come materiale, dimensioni, disponibilità o tecnica nel file entità.'
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
    appearanceMustBeObject: '{source}: site.appearance deve essere un oggetto quando presente.',
    appearancePresetInvalid: '{source}: site.appearance.preset deve essere uno tra: warm, neutral, dark, custom.',
    appearanceColorInvalid: '{source}: site.appearance.{field} deve essere un colore hex come #f8f0e4.',
    appearanceBackgroundInvalid: '{source}: site.appearance.background_image deve essere un percorso sotto /images/site/.',
    siteUrlInvalid: '{source}: site.url deve essere un URL http o https valido.',
    ogImageInvalid: '{source}: site.og_image deve essere una stringa non vuota quando presente.',
    ogImageUrlInvalid: '{source}: site.og_image deve essere un URL http o https valido.',
    ogImagePathInvalid: '{source}: site.og_image deve essere un percorso sotto /images/ o un URL https completo.',
    missingCatalogObject: '{source}: manca l’oggetto "catalog".',
    routeSegmentUnsupported:
      '{source}: route_segment non è supportato in Atelier-Kit 1.0. Le entità stanno sotto /items.',
    missingSignalCloudsArray: '{source}: manca l’array "signal_clouds".',
    cloudMustBeObject: '{source}: ogni cloud deve essere un oggetto.',
    cloudOptionsRequired: '{source}:{cloudId}: options deve essere un array non vuoto.',
    optionMustBeObject: '{source}:{cloudId}: ogni option deve essere un oggetto.',
    missingAboutObject: '{source}: manca l’oggetto "about".',
    sectionMustBeObject: '{sectionSource}: la sezione deve essere un oggetto.',
    missingContactObject: '{source}: manca l’oggetto "contact".',
    contactEmailMustBeObject: '{source}: "contact.email" deve essere un oggetto quando presente.',
    contactWhatsappMustBeObject: '{source}: "contact.whatsapp" deve essere un oggetto quando presente.',
    missingSocialObject: '{source}: manca l’oggetto "social".',
    socialLinksMustBeArray: '{source}: "social.links" deve essere un array.',
    socialLinkMustBeObject: '{source}: il link deve essere un oggetto.',
    socialLinkIdInvalid: '{source}: id deve essere uno tra: instagram, facebook, x (ricevuto "{id}").',
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
    itemsDirEmpty: 'content/items deve contenere almeno un file .yaml entità.',
    imageFileMustStartWithSlash: '{source}: image_file deve iniziare con "/".',
    imageFileMissing: '{source}: image_file non esiste in static/: {imageFile}',
    collectionIdInvalid: '{source}: id deve usare solo lettere minuscole, numeri e trattini singoli.',
    collectionIdFilenameMismatch: '{source}: id deve corrispondere al nome file "{expectedId}".',
    collectionItemsRequired: '{source}: "items" deve essere un array non vuoto.',
    collectionItemRefInvalid: '{itemSource}: il riferimento entità deve essere una stringa non vuota.',
    collectionItemRefUnknown: '{itemSource}: id entità sconosciuto "{itemId}".',
    newsIdInvalid: '{source}: l’id deve usare solo lettere minuscole, numeri e trattini singoli.',
    newsIdFilenameMismatch: '{source}: l’id deve corrispondere al nome file "{expectedId}".',
    newsDateInvalid: '{source}: la data deve usare il formato YYYY-MM-DD.',
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
    firstItemTitle: 'Titolo prima entità',
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
    firstItemOptional: 'Titolo prima entità (opzionale)',
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
      readMore: 'Leggi tutto',
      allNews: 'Tutte le notizie'
    },
    home: {
      collectionsEyebrow: 'Collezioni',
      collectionsTitle: 'Collezioni',
      catalogEyebrow: 'Catalogo',
      aboutStudio: 'Lo studio'
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
    news: {
      pageTitle: 'Notizie',
      metaDescription: 'Notizie e aggiornamenti da {siteName}.',
      title: 'Notizie',
      empty: 'Nessun articolo per ora.'
    },
    item: {
      visitorBriefEyebrow: 'Scheda visitatore',
      talkAboutTitle: 'Parla di questa entità',
      talkAboutIntro:
        'Scegli alcune preferenze qui sotto. Atelier-Kit preparerà un messaggio da copiare o inviare via email o WhatsApp.',
      details: 'Dettagli',
      material: 'Materiale',
      dimensions: 'Dimensioni',
      availability: 'Disponibilità'
    },
    visitorBrief: {
      contactEyebrow: 'Contatto senza modulo',
      heading: 'Scrivi con un messaggio pronto',
      intro:
        'Scegli le risposte Signal Cloud qui sopra, poi copia questa scheda o apri email / WhatsApp con il testo già preparato.',
      emptyState:
        'Seleziona una o più risposte Signal Cloud qui sopra per rendere questa scheda più utile.',
      actionsAriaLabel: 'Azioni scheda visitatore',
      copyButton: 'Copia scheda visitatore',
      emailDefault: 'Invia via email',
      whatsappDefault: 'Invia su WhatsApp',
      copySuccess: 'Scheda visitatore copiata.',
      copyError: 'Copia automatica non riuscita. Seleziona e copia la scheda manualmente.',
      interestLine: 'Mi interessa "{title}".',
      impressionsHeading: 'Le mie impressioni:',
      noSelections: 'Le mie impressioni: nessuna scelta Signal Cloud per ora.',
      itemPageLine: 'Pagina dell\'entità: {url}',
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
      notFoundTitle: 'Entità non trovata',
      notFoundBody: 'L\'entità richiesta non esiste nel catalogo.',
      genericTitle: 'Qualcosa è andato storto',
      unexpectedError: 'Errore imprevisto.'
    },
    social: {
      instagram: 'Instagram',
      facebook: 'Facebook',
      x: 'X (Twitter)'
    }
  }
};
