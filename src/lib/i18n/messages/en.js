/** Operator-facing message catalog (English). */
export default {
  studio: {
    layout: {
      eyebrow: 'Atelier-Kit studio',
      title: 'Local authoring',
      nav: {
        site: 'Site',
        about: 'About',
        catalog: 'Catalog',
        items: 'Items',
        collections: 'Collections',
        signals: 'Signals',
        readiness: 'Readiness',
        preview: 'Preview'
      }
    },
    accessGuide: {
      title: 'Recommended access',
      intro: 'How to use the studio safely and publish changes online.',
      localOnly:
        'Start with npm run studio:launch from the site folder. Do not expose the dev server on your network.',
      productionReadonly:
        '/studio is disabled on the live Vercel site. Never set ATELIER_STUDIO=1 in production.',
      previewFirst:
        'Open Preview in another tab to check visitor-facing pages after each save.',
      publishWhenReady:
        'Run npm run publish -- --deploy from the project folder to push changes to Vercel.',
      keepBackups:
        'Commit to Git (or copy the folder) before large edits. Photos live in static/images/items/.'
    },
    site: {
      pageTitle: 'Studio · Site settings',
      intro:
        'Edit the public site identity, appearance and contact actions here. Changes are saved directly to the project files. After saving, refresh the preview tab if the homepage does not update immediately.',
      appearance: {
        title: 'Site appearance',
        intro: 'Background colors and optional background image for the public showcase.',
        preset: 'Color preset',
        baseColor: 'Base background',
        accentColor: 'Accent glow',
        textColor: 'Text color',
        preview: 'Preview',
        backgroundImage: 'Background image (optional)',
        backgroundHint: 'JPG, PNG or WebP. Saved under static/images/site/background.*',
        currentBackground: 'Current: {path}',
        removeBackground: 'Remove background image',
        save: 'Save appearance'
      },
      identity: {
        title: 'Site identity',
        intro: 'Title, tagline and visitor-facing notice text.',
        siteTitle: 'Site title',
        tagline: 'Tagline',
        language: 'Language',
        notice: 'Public notice',
        noticeHint: 'Leave empty to hide the notice banner.',
        footerNote: 'Footer note',
        save: 'Save site settings'
      },
      contact: {
        title: 'Contact actions',
        intro: 'Visitor Brief email and optional WhatsApp contact.',
        emailLegend: 'Email',
        emailEnabled: 'Enable email contact',
        emailAddress: 'Contact email',
        emailLabel: 'Email button label',
        emailSubjectPrefix: 'Email subject prefix',
        whatsappLegend: 'WhatsApp',
        whatsappEnabled: 'Enable WhatsApp contact',
        whatsappPhone: 'WhatsApp phone number',
        whatsappLabel: 'WhatsApp button label',
        save: 'Save contact settings'
      },
      nextSteps: {
        title: 'Before publishing',
        intro: 'Review publish readiness in the studio or run the publish script from the project folder.',
        link: 'Open publish readiness'
      }
    },
    readiness: {
      pageTitle: 'Studio · Publish readiness',
      intro:
        'Content Doctor checks for placeholder text, missing images and other pre-launch notes in plain language. Run the publish script when you are ready to build and deploy.',
      doctorTitle: 'Content Doctor',
      doctorOk: 'Nothing obvious to review.',
      doctorReview: 'Review the notes below before publishing.',
      publishTitle: 'Publish commands',
      publishIntro: 'From the project folder:'
    },
    collections: {
      pageTitle: 'Studio · Collections',
      intro: 'Choose a collection to edit, or create a new curated group.',
      title: 'Collections',
      count: '{count} collection file(s) in content/collections/',
      createLink: '+ Create new collection',
      empty: 'No collections yet.',
      createFirst: 'Create your first collection',
      itemCount: '{count} item(s)'
    },
    collectionsNew: {
      pageTitle: 'Studio · New collection',
      intro:
        'Create a new collection file under content/collections/. Use lowercase letters, numbers and hyphens for the collection id, for example summer-pieces.',
      title: 'New collection',
      introPanel: 'Choose which items belong in this curated group.',
      id: 'Collection id',
      idHint: 'Cannot be changed later. Becomes the file name and URL slug.',
      idPattern: 'Use lowercase letters, numbers and hyphens only.',
      titleField: 'Collection title',
      description: 'Collection description',
      includedItems: 'Included items',
      noItems: 'No items available.',
      createItemFirst: 'Create an item first',
      create: 'Create collection',
      cancel: 'Cancel'
    },
    collectionsEdit: {
      intro:
        'Edit this collection’s public text, choose items and set their order on the public collection page.',
      preview: 'Preview collection',
      collectionId: 'Collection id: {id}',
      titleField: 'Collection title',
      description: 'Collection description',
      itemOrder: 'Item order',
      orderHint: 'The order below is used on the public collection page.',
      noItemsSelected: 'No items selected yet. Add items from the list below.',
      addItems: 'Add items',
      add: 'Add',
      remove: 'Remove',
      save: 'Save collection',
      back: 'Back to collections'
    },
    items: {
      pageTitle: 'Studio · Items',
      intro: 'Choose an item to edit, or create a new one for the catalog.',
      title: 'Items',
      count: '{count} item file(s) in content/items/',
      createLink: '+ Create new item',
      empty: 'No items yet.',
      createFirst: 'Create your first item'
    },
    itemsNew: {
      pageTitle: 'Studio · New item',
      intro:
        'Create a new item file under content/items/. Use lowercase letters, numbers and hyphens for the item id, for example silver-ring.',
      title: 'New item',
      introPanel: 'Starter meta fields come from the preset you choose.',
      id: 'Item id',
      idHint: 'Cannot be changed later. Becomes the file name and URL slug.',
      idPattern: 'Use lowercase letters, numbers and hyphens only.',
      titleField: 'Item title',
      preset: 'Meta preset',
      description: 'Description',
      photo: 'Photo (optional)',
      photoHint: 'JPG, PNG or WebP. Saved as static/images/items/{id}.jpg',
      create: 'Create item',
      cancel: 'Cancel'
    },
    itemsEdit: {
      intro:
        'Edit this item’s public content. Upload a photo here or keep the image path field for advanced use.',
      preview: 'Preview item',
      itemId: 'Item id: {id}',
      uploadPhoto: 'Upload photo',
      uploadHint:
        'Saved as static/images/items/{id}.jpg (or .png / .webp). The image path updates automatically.',
      imagePath: 'Image path',
      imageAlt: 'Image description',
      titleField: 'Item title',
      subtitle: 'Subtitle',
      status: 'Status',
      priceMode: 'Price mode',
      description: 'Description',
      notice: 'Item notice',
      noticeHint: 'Leave empty to hide the notice on the item page.',
      details: 'Item details',
      save: 'Save item',
      back: 'Back to items'
    },
    about: {
      pageTitle: 'Studio · About',
      intro: 'Edit the public about page at /about. Use it for studio story, process and background.',
      enabled: 'Show about page on the public site',
      titleField: 'Page title',
      introField: 'Introduction',
      sectionLegend: 'Optional section',
      sectionHeading: 'Section heading',
      sectionBody: 'Section body',
      save: 'Save about page'
    },
    catalog: {
      pageTitle: 'Studio · Catalog',
      intro:
        'Choose how items are named on the public site and which detail fields appear on cards and item pages.',
      singular: 'Item name (singular)',
      plural: 'Item name (plural)',
      visibleFields: 'Visible fields',
      showPrice: 'Show price mode',
      showAvailability: 'Show availability',
      showMaterial: 'Show material',
      showDimensions: 'Show dimensions',
      showStatus: 'Show status',
      showMeta: 'Show item details block',
      save: 'Save catalog settings'
    },
    signals: {
      pageTitle: 'Studio · Signal Clouds',
      intro:
        'Edit visitor questions and answer labels. Question ids and answer ids stay fixed so existing item pages remain stable.',
      question: 'Question',
      hint: 'Hint',
      answer: 'Answer · {id}',
      save: 'Save Signal Clouds'
    },
    common: {
      preview: 'Preview',
      localOnly: 'Local only.',
      productionReadonly: 'Production is read-only.',
      previewFirst: 'Preview first.',
      publishWhenReady: 'Publish when ready.',
      keepBackups: 'Keep backups.'
    }
  },
  presets: {
    appearance: {
      warm: 'Warm atelier (default)',
      neutral: 'Neutral paper',
      dark: 'Dark studio',
      custom: 'Custom colors'
    },
    items: {
      default: 'General object',
      handmade: 'Handmade / craft',
      artwork: 'Artwork / visual art',
      jewelry: 'Jewelry',
      print: 'Print / edition',
      furniture: 'Furniture / object design',
      writing: 'Writing / creative project'
    }
  },
  fields: {
    id: 'Id',
    collectionId: 'Collection id',
    itemId: 'Item id',
    siteTitle: 'Site title',
    tagline: 'Tagline',
    language: 'Language',
    notice: 'Public notice',
    footerNote: 'Footer note',
    emailAddress: 'Contact email',
    emailLabel: 'Email button label',
    emailSubjectPrefix: 'Email subject prefix',
    whatsappPhone: 'WhatsApp phone number',
    whatsappLabel: 'WhatsApp button label',
    collectionTitle: 'Collection title',
    collectionDescription: 'Collection description',
    itemTitle: 'Item title',
    description: 'Description',
    itemNameSingular: 'Item name (singular)',
    itemNamePlural: 'Item name (plural)',
    aboutTitle: 'About page title'
  },
  server: {
    saveSuccess: 'Saved successfully. Structural validation passed. Refresh the preview tab to see changes.',
    saveValidationProblem: 'Saved, but validation reported a problem:\n{output}',
    saveSiteError: 'Could not save site settings.',
    saveContactError: 'Could not save contact settings.',
    saveAppearanceError: 'Could not save appearance.',
    saveAboutError: 'Could not save about page.',
    saveCatalogError: 'Could not save catalog settings.',
    saveCloudsError: 'Could not save Signal Clouds.',
    saveItemError: 'Could not save item.',
    saveCollectionError: 'Could not save collection.',
    createItemError: 'Could not create item.',
    createCollectionError: 'Could not create collection.',
    itemNotFound: 'Item not found',
    collectionNotFound: 'Collection not found'
  },
  errors: {
    required: '{label} is required.',
    idFormat: '{label} must use lowercase letters, numbers and hyphens only.',
    yamlObject: '{path} must contain a YAML object.',
    itemExists: 'An item with id "{id}" already exists.',
    collectionExists: 'A collection with id "{id}" already exists.',
    collectionNeedsItems: 'Choose at least one item for this collection.',
    imageType: 'Use a JPG, PNG or WebP image.',
    imageRequired: 'Choose an image file to upload.',
    imageSize: 'Image must be 5 MB or smaller.',
    missingCatalog: 'config/catalog.yaml is missing a catalog object.',
    missingAbout: 'config/about.yaml is missing an about object.',
    missingSignalClouds: 'config/signal-clouds.yaml is missing signal_clouds.',
    missingSite: 'config/site.yaml is missing a site object.',
    aboutTitleRequired: 'About page title is required when the page is enabled.',
    contactEmailRequired: 'Contact email is required when email contact is enabled.',
    contactWhatsappRequired: 'WhatsApp phone number is required when WhatsApp contact is enabled.'
  },
  doctor: {
    foundCount: 'Atelier-Kit content doctor found {count} thing(s) to review before publishing:',
    foundNothing: 'Atelier-Kit content doctor found nothing obvious to review before publishing.',
    fileLabel: 'File: {source}',
    currentLabel: 'Current: "{detail}"',
    footerReminders: 'These notes are reminders, not errors. The site may still run locally.',
    footerValidate: 'Check structure with: npm run content:validate',
    footerStrict: 'Fail on these notes before launch with: npm run content:doctor -- --strict',
    footerVerbose: 'Show technical details with: npm run content:doctor -- --verbose',
    missingFile: {
      title: 'Missing file',
      problem: 'A required content file is missing.',
      action: 'Restore the file or recreate the site content from the Atelier-Kit docs.'
    },
    unreadableFile: {
      title: 'Unreadable file',
      problemFormat: 'This file contains a formatting problem.',
      problemStructure: 'This file could not be read as a normal content file.',
      actionFormat: 'Open the file and fix the formatting issue shown below, or compare it with a working example file.',
      actionStructure: 'Open the file and check that the content structure matches the other config or item files.'
    },
    fields: {
      siteName: 'Site title',
      siteTagline: 'Site tagline',
      siteNotice: 'Site notice',
      siteFooter: 'Footer note',
      siteLanguage: 'Site language',
      emailLabel: 'Email button label',
      emailAddress: 'Contact email',
      emailSubject: 'Email subject prefix',
      whatsappLabel: 'WhatsApp button label',
      whatsappPhone: 'WhatsApp phone number',
      itemId: 'Item id',
      itemTitle: 'Item title',
      itemDescription: 'Item description',
      itemSubtitle: 'Item subtitle',
      itemStatus: 'Item status',
      itemNotice: 'Item notice',
      itemImageAlt: 'Image description',
      metaLabel: 'Detail field',
      signalQuestion: 'Visitor question',
      signalHint: 'Visitor question hint',
      signalAnswer: 'Answer choice',
      signalQuestionId: 'Visitor question id',
      contentField: 'Content field'
    }
  },
  publish: {
    title: 'Atelier-Kit publish prep',
    intro: 'This runs validation, doctor, check and build.',
    stepValidation: 'Structural validation',
    stepDoctor: 'Content Doctor',
    stepCheck: 'Type and Svelte checks',
    stepBuild: 'Production build',
    stepDeploy: 'Vercel production deploy',
    complete: 'Publish prep complete.',
    previewHint: 'Preview locally with: npm run preview',
    deployHint: 'Deploy to Vercel with: npm run publish -- --deploy'
  },
  validate: {
    ok: 'Atelier-Kit content validation OK.'
  }
};
