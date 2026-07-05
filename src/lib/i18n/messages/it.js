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
      publishIntro: 'Dalla cartella del progetto:'
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
      save: 'Salva Signal Clouds'
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
    saveAppearanceError: 'Impossibile salvare l’aspetto.',
    saveAboutError: 'Impossibile salvare la pagina Chi siamo.',
    saveCatalogError: 'Impossibile salvare le impostazioni catalogo.',
    saveCloudsError: 'Impossibile salvare Signal Clouds.',
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
    contactWhatsappRequired: 'Il numero WhatsApp è obbligatorio quando il contatto WhatsApp è abilitato.'
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
    ok: 'Validazione contenuti Atelier-Kit OK.'
  }
};
