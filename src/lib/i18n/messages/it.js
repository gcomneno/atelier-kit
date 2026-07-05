/** Catalogo messaggi operator-facing (italiano). */
export default {
  studio: {
    layout: {
      eyebrow: 'Atelier-Kit studio',
      title: 'Modifica locale',
      nav: {
        site: 'Sito',
        about: 'Chi siamo',
        catalog: 'Catalogo',
        items: 'Pezzi',
        collections: 'Collezioni',
        signals: 'Segnali',
        readiness: 'Pubblicazione',
        help: 'Aiuto',
        preview: 'Anteprima'
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
        currentBackground: 'Attuale: {path}',
        removeBackground: 'Rimuovi immagine di sfondo',
        save: 'Salva aspetto'
      },
      identity: {
        title: 'Identità del sito',
        intro: 'Titolo, sottotitolo e avviso visibile ai visitatori.',
        siteTitle: 'Titolo del sito',
        tagline: 'Sottotitolo',
        language: 'Lingua',
        notice: 'Avviso pubblico',
        noticeHint: 'Lascia vuoto per nascondere il banner.',
        footerNote: 'Nota a piè di pagina',
        save: 'Salva impostazioni sito'
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
      itemCount: '{count} pezzo/i'
    },
    collectionsNew: {
      pageTitle: 'Studio · Nuova collezione',
      intro:
        'Crea un nuovo file in content/collections/. Usa lettere minuscole, numeri e trattini per l’id, ad esempio pezzi-estate.',
      title: 'Nuova collezione',
      introPanel: 'Scegli quali pezzi appartengono a questo gruppo.',
      id: 'Id collezione',
      idHint: 'Non modificabile in seguito. Diventa nome file e slug URL.',
      idPattern: 'Usa solo lettere minuscole, numeri e trattini.',
      titleField: 'Titolo collezione',
      description: 'Descrizione collezione',
      includedItems: 'Pezzi inclusi',
      noItems: 'Nessun pezzo disponibile.',
      createItemFirst: 'Crea prima un pezzo',
      create: 'Crea collezione',
      cancel: 'Annulla'
    },
    collectionsEdit: {
      intro:
        'Modifica testo pubblico, scegli i pezzi e imposta l’ordine nella pagina collezione.',
      preview: 'Anteprima collezione',
      collectionId: 'Id collezione: {id}',
      titleField: 'Titolo collezione',
      description: 'Descrizione collezione',
      itemOrder: 'Ordine pezzi',
      orderHint: 'L’ordine sotto viene usato nella pagina pubblica della collezione.',
      noItemsSelected: 'Nessun pezzo selezionato. Aggiungili dall’elenco sotto.',
      addItems: 'Aggiungi pezzi',
      add: 'Aggiungi',
      remove: 'Rimuovi',
      save: 'Salva collezione',
      back: 'Torna alle collezioni'
    },
    items: {
      pageTitle: 'Studio · Pezzi',
      intro: 'Scegli un pezzo da modificare o creane uno nuovo per il catalogo.',
      title: 'Pezzi',
      count: '{count} file pezzo in content/items/',
      createLink: '+ Crea nuovo pezzo',
      empty: 'Nessun pezzo ancora.',
      createFirst: 'Crea il tuo primo pezzo'
    },
    itemsNew: {
      pageTitle: 'Studio · Nuovo pezzo',
      intro:
        'Crea un nuovo file in content/items/. Usa lettere minuscole, numeri e trattini per l’id, ad esempio anello-argento.',
      title: 'Nuovo pezzo',
      introPanel: 'I campi meta iniziali dipendono dal preset scelto.',
      id: 'Id pezzo',
      idHint: 'Non modificabile in seguito. Diventa nome file e slug URL.',
      idPattern: 'Usa solo lettere minuscole, numeri e trattini.',
      titleField: 'Titolo pezzo',
      preset: 'Preset meta',
      description: 'Descrizione',
      photo: 'Foto (opzionale)',
      photoHint: 'JPG, PNG o WebP. Salvata come static/images/items/{id}.jpg',
      create: 'Crea pezzo',
      cancel: 'Annulla'
    },
    itemsEdit: {
      intro:
        'Modifica i contenuti pubblici del pezzo. Carica una foto qui o usa il campo percorso immagine per casi avanzati.',
      preview: 'Anteprima pezzo',
      itemId: 'Id pezzo: {id}',
      uploadPhoto: 'Carica foto',
      uploadHint:
        'Salvata come static/images/items/{id}.jpg (o .png / .webp). Il percorso immagine si aggiorna automaticamente.',
      imagePath: 'Percorso immagine',
      imageAlt: 'Descrizione immagine',
      titleField: 'Titolo pezzo',
      subtitle: 'Sottotitolo',
      status: 'Stato',
      priceMode: 'Modalità prezzo',
      description: 'Descrizione',
      notice: 'Avviso pezzo',
      noticeHint: 'Lascia vuoto per nascondere l’avviso nella pagina pezzo.',
      details: 'Dettagli pezzo',
      save: 'Salva pezzo',
      back: 'Torna ai pezzi'
    },
    about: {
      pageTitle: 'Studio · Chi siamo',
      intro: 'Modifica la pagina pubblica /about. Usala per storia, processo e background dello studio.',
      enabled: 'Mostra la pagina Chi siamo sul sito pubblico',
      titleField: 'Titolo pagina',
      introField: 'Introduzione',
      sectionLegend: 'Sezione opzionale',
      sectionHeading: 'Titolo sezione',
      sectionBody: 'Testo sezione',
      save: 'Salva pagina Chi siamo'
    },
    catalog: {
      pageTitle: 'Studio · Catalogo',
      intro:
        'Scegli come si chiamano i pezzi sul sito pubblico e quali campi compaiono su schede e pagine pezzo.',
      singular: 'Nome pezzo (singolare)',
      plural: 'Nome pezzo (plurale)',
      visibleFields: 'Campi visibili',
      showPrice: 'Mostra modalità prezzo',
      showAvailability: 'Mostra disponibilità',
      showMaterial: 'Mostra materiale',
      showDimensions: 'Mostra dimensioni',
      showStatus: 'Mostra stato',
      showMeta: 'Mostra blocco dettagli pezzo',
      save: 'Salva impostazioni catalogo'
    },
    signals: {
      pageTitle: 'Studio · Signal Clouds',
      intro:
        'Modifica domande per i visitatori ed etichette risposta. Gli id domanda e risposta restano fissi così le pagine pezzo esistenti restano stabili.',
      question: 'Domanda',
      hint: 'Suggerimento',
      answer: 'Risposta · {id}',
      save: 'Salva Signal Clouds',
      enabled: 'Mostra sulle pagine pezzo',
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
    itemId: 'Id pezzo',
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
    itemTitle: 'Titolo pezzo',
    description: 'Descrizione',
    itemNameSingular: 'Nome pezzo (singolare)',
    itemNamePlural: 'Nome pezzo (plurale)',
    aboutTitle: 'Titolo pagina Chi siamo'
  },
  server: {
    saveSuccess: 'Salvato. Validazione strutturale superata. Aggiorna la scheda anteprima per vedere le modifiche.',
    saveValidationProblem: 'Salvato, ma la validazione ha segnalato un problema:\n{output}',
    saveSiteError: 'Impossibile salvare le impostazioni sito.',
    saveContactError: 'Impossibile salvare i contatti.',
    saveSocialError: 'Impossibile salvare i link social.',
    saveAppearanceError: 'Impossibile salvare l’aspetto.',
    saveAboutError: 'Impossibile salvare la pagina Chi siamo.',
    saveCatalogError: 'Impossibile salvare le impostazioni catalogo.',
    saveCloudsError: 'Impossibile salvare Signal Clouds.',
    removeCloudError: 'Impossibile rimuovere il signal.',
    cloudRemoved: 'Signal rimosso. Aggiorna l’anteprima per verificare le pagine pezzo.',
    saveItemError: 'Impossibile salvare il pezzo.',
    saveCollectionError: 'Impossibile salvare la collezione.',
    createItemError: 'Impossibile creare il pezzo.',
    createCollectionError: 'Impossibile creare la collezione.',
    itemNotFound: 'Pezzo non trovato',
    collectionNotFound: 'Collezione non trovata'
  },
  errors: {
    required: '{label} è obbligatorio.',
    idFormat: '{label} deve usare solo lettere minuscole, numeri e trattini.',
    yamlObject: '{path} deve contenere un oggetto YAML.',
    itemExists: 'Esiste già un pezzo con id "{id}".',
    collectionExists: 'Esiste già una collezione con id "{id}".',
    collectionNeedsItems: 'Scegli almeno un pezzo per questa collezione.',
    imageType: 'Usa un’immagine JPG, PNG o WebP.',
    imageRequired: 'Scegli un file immagine da caricare.',
    imageSize: 'L’immagine deve essere di 5 MB o meno.',
    missingCatalog: 'config/catalog.yaml non contiene un oggetto catalog.',
    missingAbout: 'config/about.yaml non contiene un oggetto about.',
    missingSignalClouds: 'config/signal-clouds.yaml non contiene signal_clouds.',
    missingSite: 'config/site.yaml non contiene un oggetto site.',
    aboutTitleRequired: 'Il titolo pagina Chi siamo è obbligatorio quando la pagina è abilitata.',
    contactEmailRequired: 'L’email di contatto è obbligatoria quando il contatto email è abilitato.',
    contactWhatsappRequired: 'Il numero WhatsApp è obbligatorio quando il contatto WhatsApp è abilitato.',
    socialUrlInvalid: 'Inserisci un URL http o https valido per {network}.'
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
      actionStructure: 'Apri il file e verifica che la struttura corrisponda agli altri file config o pezzo.'
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
      itemId: 'Id pezzo',
      itemTitle: 'Titolo pezzo',
      itemDescription: 'Descrizione pezzo',
      itemSubtitle: 'Sottotitolo pezzo',
      itemStatus: 'Stato pezzo',
      itemNotice: 'Avviso pezzo',
      itemImageAlt: 'Descrizione immagine',
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
        action: 'Apri {source} e sostituisci "{label}" con informazioni reali su questo pezzo.'
      },
      itemsFolderMissing: {
        title: 'Cartella pezzi',
        problem: 'Il sito non ha ancora una cartella pezzi.',
        action: 'Crea almeno un pezzo con npm run item:new oppure aggiungi un file YAML in content/items/.'
      },
      itemsFolderEmpty: {
        title: 'Cartella pezzi',
        problem: 'Il sito non contiene ancora pezzi.',
        action: 'Crea almeno un pezzo con npm run item:new prima di pubblicare.'
      },
      itemFieldStarter: {
        title: '{fieldTitle} per "{itemTitle}"',
        problem: '{fieldTitle} sembra ancora testo segnaposto o demo.',
        action: 'Apri {source} e aggiorna {fieldTitle} con contenuto reale.'
      },
      itemTestId: {
        title: 'Pezzo "{itemTitle}"',
        problem: 'Questo id pezzo sembra una voce di test o esempio.',
        action: 'Crea un pezzo reale con npm run item:new oppure rinomina l’id prima di pubblicare.'
      },
      itemPlaceholderImage: {
        title: 'Immagine per "{itemTitle}"',
        problem: 'Questo pezzo usa ancora l’immagine segnaposto neutra.',
        action: 'Aggiungi una foto reale in static/images/items/ e aggiorna il percorso nel file pezzo.'
      },
      itemDraftStatus: {
        title: 'Stato pubblicazione per "{itemTitle}"',
        problem: 'Questo pezzo è ancora contrassegnato come "{status}".',
        action:
          'Apri il file pezzo e imposta uno stato pronto per il pubblico, ad es. "available", oppure rimuovi lo stato se non lo usi.'
      },
      itemShortDescription: {
        title: 'Descrizione per "{itemTitle}"',
        problem: 'La descrizione del pezzo è molto breve e può sembrare incompleta ai visitatori.',
        action: 'Apri il file pezzo e aggiungi una descrizione più chiara dell’oggetto, opera o progetto.'
      },
      itemNoMeta: {
        title: 'Dettagli per "{itemTitle}"',
        problem: 'Questo pezzo non ha ancora campi dettaglio aggiuntivi.',
        action: 'Aggiungi dettagli utili come materiale, dimensioni, disponibilità o tecnica nel file pezzo.'
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
    missingCatalogObject: '{source}: manca l’oggetto "catalog".',
    routeSegmentUnsupported:
      '{source}: route_segment non è supportato in Atelier-Kit 1.0. I pezzi stanno sotto /items.',
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
    itemsDirMissing: 'La cartella content/items non esiste.',
    itemsDirEmpty: 'content/items deve contenere almeno un file .yaml pezzo.',
    imageFileMustStartWithSlash: '{source}: image_file deve iniziare con "/".',
    imageFileMissing: '{source}: image_file non esiste in static/: {imageFile}',
    collectionIdInvalid: '{source}: id deve usare solo lettere minuscole, numeri e trattini singoli.',
    collectionIdFilenameMismatch: '{source}: id deve corrispondere al nome file "{expectedId}".',
    collectionItemsRequired: '{source}: "items" deve essere un array non vuoto.',
    collectionItemRefInvalid: '{itemSource}: il riferimento pezzo deve essere una stringa non vuota.',
    collectionItemRefUnknown: '{itemSource}: id pezzo sconosciuto "{itemId}".'
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
    firstItemTitle: 'Titolo primo pezzo',
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
    firstItemOptional: 'Titolo primo pezzo (opzionale)',
    collectionOptional: 'Titolo collezione (opzionale)',
    confirmProceed: 'Procedere con questa configurazione?',
    templates: {
      writing: 'Scrittura / vetrina autore',
      artwork: 'Arte visiva / vetrina opere',
      handmade: 'Artigianato / craft',
      jewelry: 'Gioielli',
      furniture: 'Mobili / design oggetti'
    }
  }
};
