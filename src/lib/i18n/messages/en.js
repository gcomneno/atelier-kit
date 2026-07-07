/** Operator-facing message catalog (English). */
export default {
  studio: {
    layout: {
      eyebrow: 'Atelier-Kit studio',
      title: 'Local authoring',
      nav: {
        dashboard: 'Overview',
        siteGroup: 'Showcase settings',
        contentGroup: 'Editorial',
        publishGroup: 'Go live',
        site: 'Site',
        identity: 'Identity',
        appearance: 'Visitor appearance',
        hero: 'Hero',
        contact: 'Contact',
        social: 'Social',
        layout: 'Layout',
        footer: 'Footer',
        about: 'About',
        catalog: 'Catalog',
        items: 'Items',
        news: 'News',
        collections: 'Collections',
        signals: 'Signals',
        readiness: 'Readiness',
        help: 'Help',
        preview: 'Preview'
      }
    },
    dashboard: {
      pageTitle: 'Studio · Overview',
      intro:
        'Three areas, matching the left menu: pick where to work. Each box opens the first page in that group.',
      zonesLegend: 'Studio areas',
      zones: {
        site: {
          eyebrow: 'Showcase',
          title: 'Showcase settings',
          description: 'How the public site looks: identity, colors, layout and contact points.'
        },
        content: {
          eyebrow: 'Editorial',
          title: 'Pages and works',
          description: 'Copy, catalog, items, collections, news and visitor signals.'
        },
        publish: {
          eyebrow: 'Online',
          title: 'Go live',
          description: 'Pre-launch checks, operator guide and site preview.'
        }
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
    help: {
      pageTitle: 'Studio · Help'
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
        backgroundVsBanner:
          'Use this for a full-page background or a top strip below the header. Custom home layouts may rely on this asset instead of the hero banner.',
        currentBackground: 'Current: {path}',
        removeBackground: 'Remove background image',
        save: 'Save appearance'
      },
      identity: {
        title: 'Site identity',
        intro: 'Title, tagline and home-page messages for visitors.',
        siteTitle: 'Site title',
        tagline: 'Tagline',
        heroIntro: 'Home intro text',
        heroIntroHint:
          'One line break starts a new line; a blank line starts a new paragraph. Edit text only — theme styling and layout stay the same.',
        heroSignature: 'Signature',
        heroSignatureHint:
          'Personal sign-off on the home page, shown below the intro and right-aligned. Leave empty to hide.',
        language: 'Language',
        languages: {
          it: 'Italian',
          en: 'English'
        },
        notice: 'Public notice',
        noticeHint:
          'Short message on the home page, in a highlighted box below the tagline. Shown even when a hero intro is active. Leave empty to hide.',
        footerNote: 'Footer note (optional)',
        footerNoteHint: 'Short client text on the home page when no multi-column footer is configured. The Atelier-Kit credit is added automatically and cannot be removed.',
        siteUrl: 'Canonical site URL (optional)',
        siteUrlHint:
          'Public https URL used when building absolute Open Graph image links. Leave empty to use the current request host (fine on Vercel).',
        ogImage: 'Open Graph image (optional)',
        ogImageHint:
          'Path under /images/… or full https URL for social previews (Facebook, Instagram, WhatsApp). Recommended size: 1200×630.',
        save: 'Save site settings'
      },
      heroBanner: {
        title: 'Hero banner (optional)',
        intro: 'Visual band below the intro text on the kit default homepage. Turn it off to hide without losing the uploaded image.',
        show: 'Show hero banner on home',
        backgroundImageActive:
          'You already have a background image under Appearance. Some custom home layouts use only that and ignore the hero banner.',
        upload: 'Upload banner image',
        uploadHint: 'JPEG, PNG or WebP. Landscape ratio works best (~3:1).',
        removeHeroImage: 'Remove hero image',
        bannerDescription: 'Description',
        bannerDescriptionHint:
          'Text overlaid on the banner, centered and large. Leave empty to hide.',
        caption: 'Caption (optional)',
        captionHint: 'Text along the bottom of the banner image, centered.',
        href: 'Link (optional, e.g. /news/preview)',
        hrefHint: 'Internal path: makes the image clickable (e.g. /news, /collections).',
        save: 'Save hero banner'
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
      social: {
        title: 'Social links',
        intro: 'Optional profile links shown in the site header. Leave a field empty to hide that icon.',
        instagram: 'Instagram URL',
        facebook: 'Facebook URL',
        x: 'X (Twitter) URL',
        save: 'Save social links'
      },
      footer: {
        title: 'Legal footer',
        intro:
          'Multi-column footer with copyright and legal line. Shown site-wide when at least one column, copyright or legal line is set. Edit legal page text in config/legal.yaml.',
        copyright: 'Copyright line',
        legalLine: 'Legal line (e.g. P.IVA)',
        showSocial: 'Show social icons in footer',
        columnLegend: 'Column {number}',
        columnTitle: 'Column title',
        columnTitleHint: 'Leave empty to skip this column.',
        linkLabel: 'Link {number} label',
        linkHref: 'Link URL or path',
        save: 'Save footer'
      },
      layout: {
        title: 'Layout',
        intro:
          'Choose single column or widget layout and where to show about, news, collections and catalog (main content, sidebar or top-right menu).',
        preset: 'Layout preset',
        presets: {
          'single-column': 'Single column (default)',
          'catalog-sidebar': 'Widget layout (main + sidebar)'
        },
        blocksLegend: 'Home elements',
        blocksHint:
          'Each block can sit in the main content area, the sidebar, or the top-right menu. Sidebar placement requires the widget layout preset.',
        placement: 'Placement',
        placementMain: 'Main content',
        placementSidebar: 'Sidebar',
        placementMenu: 'Menu',
        blocks: {
          about: 'About',
          news: 'News',
          collections: 'Collections',
          catalog: 'Catalog'
        },
        latestNewsCount: 'News count',
        save: 'Save layout'
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
      publishIntro: 'From the project folder:',
      publishRun: 'Run publish prep',
      publishRunning: 'Running publish prep…',
      publishOk: 'Publish prep completed successfully.',
      publishFailed: 'Publish prep failed. Review the output below.',
      liveTitle: 'Publish live',
      liveIntro:
        'Commit studio changes (config, content and uploaded images), push to Git and deploy to Vercel production. Requires a Git remote and Vercel CLI linked to this project.',
      livePendingTitle: 'Pending local changes',
      livePendingEmpty: 'No uncommitted changes in config/, content/ or static/images/. You can still redeploy the latest commit.',
      liveCommitsAhead: '{count} local commit(s) not pushed yet.',
      liveRun: 'Publish live',
      liveRunning: 'Publishing live…',
      liveOk: 'Live site updated successfully.',
      liveFailed: 'Could not publish live.',
      liveFailedPrep: 'Publish prep failed. Nothing was committed or deployed.',
      liveFailedCommit: 'Git commit failed. Check Git identity settings and try again.',
      liveFailedPush: 'Git push failed. Resolve conflicts or authentication, then try again.',
      liveFailedDeploy: 'Vercel deploy failed. Git push may have succeeded — check the Vercel dashboard.',
      liveConfirm:
        'Publish live now? This will run publish prep, commit pending studio files, push to origin and deploy to production.',
      liveCommitMessage: 'Studio update',
      livePhasePrep: '→ Publish prep (validate, doctor, check, build)',
      livePrepOk: 'Publish prep OK.',
      livePhaseCommit: '→ Git commit',
      liveCommitOk: 'Commit created.',
      liveSkipCommit: '→ No new files to commit (pushing existing local commits).',
      liveNoCommitNeeded: '→ No Git commit needed.',
      livePhasePush: '→ Git push',
      livePushOk: 'Push OK.',
      livePhaseDeploy: '→ Vercel production deploy',
      liveIssues: {
        noRepo: 'This folder is not a Git repository. Initialize Git or clone the site project first.',
        noRemote: 'Git remote "origin" is missing. Add your GitHub repository before publishing live.'
      }
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
    news: {
      pageTitle: 'Studio · News',
      intro: 'Choose a news post to edit, or create a new announcement.',
      title: 'News',
      count: '{count} post file(s) in content/news/',
      createLink: '+ Create new post',
      empty: 'No news posts yet.',
      createFirst: 'Create your first post'
    },
    newsNew: {
      pageTitle: 'Studio · New post',
      intro:
        'Create a new post under content/news/. Use lowercase letters, numbers and hyphens for the post id, for example spring-announcement.',
      title: 'New post',
      introPanel: 'Posts appear on /news, newest first.',
      id: 'Post id',
      idHint: 'Cannot be changed later. Becomes the file name and URL slug.',
      idPattern: 'Use lowercase letters, numbers and hyphens only.',
      titleField: 'Post title',
      date: 'Publication date',
      dateHint: 'Use YYYY-MM-DD format.',
      excerpt: 'Excerpt (optional)',
      excerptHint: 'Short teaser shown on the news list page.',
      body: 'Body',
      photo: 'Photo (optional)',
      photoHint: 'JPG, PNG or WebP. Saved as static/images/news/{id}.jpg',
      imageAlt: 'Image description',
      create: 'Create post',
      cancel: 'Cancel'
    },
    newsEdit: {
      intro: 'Edit this post’s public content. Upload a photo here or keep the image path field for advanced use.',
      preview: 'Preview post',
      postId: 'Post id: {id}',
      uploadPhoto: 'Upload photo',
      uploadHint:
        'Saved as static/images/news/{id}.jpg (or .png / .webp). The image path updates automatically.',
      imagePath: 'Image path',
      imageAlt: 'Image description',
      titleField: 'Post title',
      date: 'Publication date',
      excerpt: 'Excerpt',
      excerptHint: 'Short teaser shown on the news list page. Leave empty to use the first line of the body.',
      body: 'Body',
      save: 'Save post',
      back: 'Back to news'
    },
    about: {
      pageTitle: 'Studio · About',
      intro: 'Edit the public about page at /about. Use it for studio story, process and background.',
      enabled: 'Show about page on the public site',
      titleField: 'Page title',
      introField: 'Introduction',
      portraitLegend: 'Author portrait (optional)',
      showPortrait: 'Show the photo on the about page',
      portraitUpload: 'Upload photo',
      portraitUploadHint: 'JPEG, PNG or WebP. If display is off, the photo stays saved but hidden on the public site.',
      portraitAlt: 'Photo alt text',
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
      save: 'Save Signal Clouds',
      enabled: 'Show on item pages',
      remove: 'Remove signal',
      removeConfirm:
        'Remove signal "{id}"? It will be deleted from config/signal-clouds.yaml. Restore from Git if needed.'
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
    newsId: 'Post id',
    newsTitle: 'Post title',
    newsDate: 'Publication date',
    newsBody: 'Post body',
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
    saveSocialError: 'Could not save social links.',
    saveFooterError: 'Could not save footer.',
    saveLayoutError: 'Could not save layout.',
    saveAppearanceError: 'Could not save appearance.',
    saveHeroBannerError: 'Could not save hero banner.',
    saveAboutError: 'Could not save about page.',
    saveCatalogError: 'Could not save catalog settings.',
    saveCloudsError: 'Could not save Signal Clouds.',
    removeCloudError: 'Could not remove signal.',
    cloudRemoved: 'Signal removed. Refresh the preview to confirm item pages.',
    saveItemError: 'Could not save item.',
    saveCollectionError: 'Could not save collection.',
    createItemError: 'Could not create item.',
    createCollectionError: 'Could not create collection.',
    createNewsError: 'Could not create news post.',
    itemNotFound: 'Item not found',
    collectionNotFound: 'Collection not found',
    saveNewsError: 'Could not save news post.',
    newsNotFound: 'News post not found'
  },
  errors: {
    required: '{label} is required.',
    idFormat: '{label} must use lowercase letters, numbers and hyphens only.',
    yamlObject: '{path} must contain a YAML object.',
    itemExists: 'An item with id "{id}" already exists.',
    collectionExists: 'A collection with id "{id}" already exists.',
    collectionNeedsItems: 'Choose at least one item for this collection.',
    newsExists: 'A news post with id "{id}" already exists.',
    newsDateInvalid: 'Publication date must use YYYY-MM-DD format.',
    imageType: 'Use a JPG, PNG or WebP image.',
    imageRequired: 'Choose an image file to upload.',
    imageSize: 'Image must be 5 MB or smaller.',
    missingCatalog: 'config/catalog.yaml is missing a catalog object.',
    missingAbout: 'config/about.yaml is missing an about object.',
    missingSignalClouds: 'config/signal-clouds.yaml is missing signal_clouds.',
    missingSite: 'config/site.yaml is missing a site object.',
    aboutTitleRequired: 'About page title is required when the page is enabled.',
    heroBannerImageRequired: 'Upload a banner image or turn off display.',
    contactEmailRequired: 'Contact email is required when email contact is enabled.',
    contactWhatsappRequired: 'WhatsApp phone number is required when WhatsApp contact is enabled.',
    socialUrlInvalid: 'Enter a valid http or https URL for {network}.',
    footerLinkHrefRequired: 'Link "{label}" in column "{column}" needs a URL or path.',
    footerLinkHrefInvalid:
      'Link "{label}" in column "{column}" must start with "/" or be a valid http or https URL.',
    layoutPresetInvalid: 'Layout preset must be single-column or catalog-sidebar.',
    layoutLatestNewsCountInvalid: 'Latest news count must be an integer from 1 to {max}.'
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
      newsId: 'Post id',
      newsTitle: 'Post title',
      newsExcerpt: 'Post excerpt',
      newsBody: 'Post body',
      metaLabel: 'Detail field',
      signalQuestion: 'Visitor question',
      signalHint: 'Visitor question hint',
      signalAnswer: 'Answer choice',
      signalQuestionId: 'Visitor question id',
      contentField: 'Content field'
    },
    warnings: {
      starterText: {
        problem: '{title} still looks like starter or placeholder text.',
        action: 'Open {source} and update {field} with real content.'
      },
      defaultQuestionLabel: 'Question {index}',
      metaFallbackLabel: 'Detail {index}',
      siteDemoTitle: {
        title: 'Site title',
        problem: 'The public site title still contains the word "demo".',
        action: 'Open config/site.yaml and set the real name visitors should see.'
      },
      siteNoticeStarter: {
        title: 'Site notice banner',
        problem: 'Visitors still see a starter notice at the top of the site.',
        action:
          'Open config/site.yaml and replace the notice with real text, or clear it if you do not need a banner.'
      },
      siteNoticeActive: {
        title: 'Site notice banner',
        problem: 'A notice banner is still visible to visitors.',
        action: 'Open config/site.yaml and confirm the notice text is intentional before publishing.'
      },
      contactEmailPlaceholder: {
        title: 'Contact email',
        problem: 'Visitors would still contact the starter address hello@example.com.',
        action: 'Open config/contact.yaml and set the real email address for Visitor Brief messages.'
      },
      whatsappMissingPhone: {
        title: 'WhatsApp contact',
        problem: 'WhatsApp contact is turned on, but no usable phone number is set.',
        action: 'Open config/contact.yaml and add a phone number, or turn WhatsApp contact off.'
      },
      signalCloudOptions: {
        title: 'Visitor question "{label}"',
        problem: 'This visitor question needs at least two answer choices.',
        action: 'Open config/signal-clouds.yaml and add more answer options for this question.'
      },
      metaPlaceholder: {
        title: '{label} on "{itemTitle}"',
        problem: '"{label}" still looks like placeholder text.',
        action: 'Open {source} and replace "{label}" with real information about this item.'
      },
      itemsFolderMissing: {
        title: 'Items folder',
        problem: 'The site does not have an items folder yet.',
        action: 'Create at least one item with npm run item:new or add a YAML file under content/items/.'
      },
      itemsFolderEmpty: {
        title: 'Items folder',
        problem: 'The site does not contain any items yet.',
        action: 'Create at least one item with npm run item:new before publishing.'
      },
      itemFieldStarter: {
        title: '{fieldTitle} for "{itemTitle}"',
        problem: '{fieldTitle} still looks like starter or placeholder text.',
        action: 'Open {source} and update {fieldTitle} with real content.'
      },
      itemTestId: {
        title: 'Item "{itemTitle}"',
        problem: 'This item id looks like a test or sample entry.',
        action: 'Create a real item with npm run item:new or rename this item id before publishing.'
      },
      itemPlaceholderImage: {
        title: 'Image for "{itemTitle}"',
        problem: 'This item still uses the neutral placeholder image.',
        action: 'Add a real photo to static/images/items/ and update the image path in this item file.'
      },
      itemDraftStatus: {
        title: 'Publication status for "{itemTitle}"',
        problem: 'This item is still marked as "{status}".',
        action:
          'Open this item file and set a public-ready status such as "available", or remove the status if you do not use it.'
      },
      itemShortDescription: {
        title: 'Description for "{itemTitle}"',
        problem: 'The item description is very short and may feel unfinished to visitors.',
        action: 'Open this item file and add a clearer description of the object, artwork or project.'
      },
      itemNoMeta: {
        title: 'Details for "{itemTitle}"',
        problem: 'This item has no extra detail fields yet.',
        action: 'Add helpful details such as material, dimensions, availability or technique in the item file.'
      },
      newsFieldStarter: {
        title: '{fieldTitle} for "{postTitle}"',
        problem: '{fieldTitle} still looks like starter or placeholder text.',
        action: 'Open {source} and update {fieldTitle} with real content.'
      },
      newsTestId: {
        title: 'Post id for "{postTitle}"',
        problem: 'This post id still looks like a test or sample entry.',
        action: 'Rename the post id and file before publishing, or confirm it is intentional.'
      },
      newsPlaceholderImage: {
        title: 'Image for "{postTitle}"',
        problem: 'This post still uses a placeholder image path.',
        action: 'Upload a real photo in Studio or update image_file in the post file.'
      },
      newsShortBody: {
        title: 'Body for "{postTitle}"',
        problem: 'The post body is very short.',
        action: 'Add more context so visitors understand the announcement.'
      }
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
    ok: 'Atelier-Kit content validation OK.',
    yamlMustBeObject: '{path} must contain a YAML object.',
    yamlReadError: 'Cannot read {path}: {message}',
    missingField: '{source}: missing or invalid "{field}".',
    duplicate: 'Duplicate {label}: {value}',
    metaMustBeArray: '{source}: "{pathLabel}" must be an array when provided.',
    metaEntryMustBeObject: '{source}: "{entryPath}" must be an object.',
    metaEntryNeedsValueOrChildren:
      '{source}:{entryPath}: meta entry must have either a non-empty "value" or non-empty "children".',
    missingSiteObject: '{source}: missing "site" object.',
    appearanceMustBeObject: '{source}: site.appearance must be an object when present.',
    appearancePresetInvalid: '{source}: site.appearance.preset must be one of: warm, neutral, dark, custom.',
    appearanceColorInvalid: '{source}: site.appearance.{field} must be a hex color like #f8f0e4.',
    appearanceBackgroundInvalid: '{source}: site.appearance.background_image must be a path under /images/site/.',
    siteUrlInvalid: '{source}: site.url must be a valid http or https URL.',
    ogImageInvalid: '{source}: site.og_image must be a non-empty string when provided.',
    ogImageUrlInvalid: '{source}: site.og_image must be a valid http or https URL.',
    ogImagePathInvalid: '{source}: site.og_image must be a path under /images/ or a full https URL.',
    missingCatalogObject: '{source}: missing "catalog" object.',
    routeSegmentUnsupported:
      '{source}: route_segment is intentionally not supported in Atelier-Kit 1.0. Items live under /items.',
    missingSignalCloudsArray: '{source}: missing "signal_clouds" array.',
    cloudMustBeObject: '{source}: every cloud must be an object.',
    cloudOptionsRequired: '{source}:{cloudId}: options must be a non-empty array.',
    optionMustBeObject: '{source}:{cloudId}: every option must be an object.',
    missingAboutObject: '{source}: missing "about" object.',
    sectionMustBeObject: '{sectionSource}: section must be an object.',
    missingContactObject: '{source}: missing "contact" object.',
    contactEmailMustBeObject: '{source}: "contact.email" must be an object when provided.',
    contactWhatsappMustBeObject: '{source}: "contact.whatsapp" must be an object when provided.',
    missingSocialObject: '{source}: missing "social" object.',
    socialLinksMustBeArray: '{source}: "social.links" must be an array.',
    socialLinkMustBeObject: '{source}: link must be an object.',
    socialLinkIdInvalid: '{source}: id must be one of: instagram, facebook, x (got "{id}").',
    socialLinkUrlInvalid: '{source}: url must be a valid http or https URL.',
    missingFooterObject: '{source}: missing "footer" object.',
    footerColumnsMustBeArray: '{source}: "footer.columns" must be an array when provided.',
    footerColumnMustBeObject: '{source}: column must be an object.',
    footerColumnLinksMustBeArray: '{source}: links must be an array when provided.',
    footerLinkMustBeObject: '{source}: link must be an object.',
    footerLinkHrefInvalid: '{source}: href must start with "/" or be a valid http or https URL.',
    footerLinkLabelRequired: '{source}: link label must not be empty when href is set.',
    footerFieldMustBeString: '{source}: footer.{field} must be a string when provided.',
    footerShowSocialInvalid: '{source}: footer.show_social must be true or false when provided.',
    missingLayoutObject: '{source}: missing "layout" object.',
    layoutPresetInvalid: '{source}: layout.preset must be "single-column" or "catalog-sidebar".',
    layoutBlocksMustBeObject: '{source}: layout.blocks must be an object when provided.',
    layoutBlockMustBeObject: '{source}: layout block must be an object.',
    layoutBlockIdInvalid: '{source}: invalid layout block id.',
    layoutBlockEnabledInvalid: '{source}: enabled must be true or false when provided.',
    layoutBlockPlacementInvalid: '{source}: placement must be "main", "sidebar" or "menu" when provided.',
    layoutHomeMustBeObject: '{source}: layout.home must be an object when provided.',
    layoutHomeShowInvalid:
      '{source}: layout.home.show must be "collections", "catalog", or "both" when provided.',
    layoutSidebarMustBeObject: '{source}: layout.sidebar must be an object when provided.',
    layoutSidebarFlagInvalid: '{source}: layout.sidebar.{field} must be true or false when provided.',
    layoutLatestNewsCountInvalid:
      '{source}: layout.sidebar.latest_news_count must be an integer from 1 to {max} when provided.',
    missingLegalObject: '{source}: missing "legal" object.',
    legalPagesMustBeObject: '{source}: "legal.pages" must be an object.',
    legalPageMustBeObject: '{source}: page must be an object.',
    itemsDirMissing: 'content/items directory does not exist.',
    itemsDirEmpty: 'content/items must contain at least one .yaml item.',
    imageFileMustStartWithSlash: '{source}: image_file must start with "/".',
    imageFileMissing: '{source}: image_file does not exist in static/: {imageFile}',
    collectionIdInvalid: '{source}: id must use lowercase letters, numbers and single hyphens only.',
    collectionIdFilenameMismatch: '{source}: id must match filename "{expectedId}".',
    collectionItemsRequired: '{source}: "items" must be a non-empty array.',
    collectionItemRefInvalid: '{itemSource}: item reference must be a non-empty string.',
    collectionItemRefUnknown: '{itemSource}: unknown item id "{itemId}".',
    newsIdInvalid: '{source}: id must use lowercase letters, numbers and single hyphens only.',
    newsIdFilenameMismatch: '{source}: id must match filename "{expectedId}".',
    newsDateInvalid: '{source}: date must use YYYY-MM-DD format.',
    newsReadingFormatInvalid:
      '{source}: reading_format must be one of: book (got "{value}").'
  },
  wizard: {
    usageTitle: 'Usage:',
    fieldRequired: 'This field is required.',
    chooseUseCase: 'Choose a use case:',
    templatePrompt: 'Template number or id:',
    chooseValidTemplate: 'Choose a valid template number or id.',
    setupSummary: 'Setup summary:',
    mode: 'Mode',
    target: 'Target',
    template: 'Template',
    siteTitle: 'Site title',
    tagline: 'Tagline',
    language: 'Language',
    email: 'Email',
    whatsapp: 'WhatsApp',
    whatsappDisabled: 'disabled',
    firstItemTitle: 'First item title',
    collectionTitle: 'Collection title',
    complete: 'Guided setup complete.',
    nextSteps: 'Next steps:',
    replaceBeforePublish: 'Replace starter images and any remaining placeholder text before publishing.',
    strictDoctorHint: 'For a public launch pass, run: npm run content:doctor -- --strict',
    validationSkipped: 'Validation skipped until dependencies are installed in the new client site.',
    introTitle: 'Atelier-Kit guided setup',
    introBody: 'Answer a few questions to generate starter site content.',
    introNote: 'You can still edit files later if needed.',
    targetFolder: 'Target folder (relative path)',
    whatsappPhone: 'WhatsApp phone number (optional)',
    notice: 'Public site notice (optional, empty hides it)',
    firstItemOptional: 'First item title (optional)',
    collectionOptional: 'Collection title (optional)',
    confirmProceed: 'Proceed with this setup?',
    templates: {
      writing: 'Writing / author showcase',
      artwork: 'Artwork / visual art showcase',
      handmade: 'Handmade / craft showcase',
      jewelry: 'Jewelry showcase',
      collector: 'Collector showcase',
      furniture: 'Furniture / object design showcase'
    }
  },
  visitor: {
    common: {
      backToShowcase: '← Back to showcase',
      backToNews: '← Back to news',
      backToCatalog: 'Back to catalog',
      home: 'Home',
      breadcrumb: 'Breadcrumb',
      socialLinks: 'Social links',
      siteNav: 'Site menu',
      viewAllCollections: 'View all collections',
      readMore: 'Read more',
      allNews: 'All news'
    },
    home: {
      collectionsEyebrow: 'Collections',
      collectionsTitle: 'Collections',
      catalogEyebrow: 'Catalog',
      aboutStudio: 'About the studio'
    },
    collections: {
      pageTitle: 'Collections',
      metaDescription: 'Curated collections from {siteName}.',
      eyebrow: 'Collections',
      title: 'Collections',
      intro: 'Groups of {itemPlural} selected by theme or series.',
      empty: 'No collections yet.',
      collectionEyebrow: 'Collection',
      selectedItemsEyebrow: 'Selected {itemPlural}'
    },
    catalog: {
      collections: 'Collections',
      latestNews: 'Latest news',
      sidebarAriaLabel: 'Catalog sidebar'
    },
    news: {
      pageTitle: 'News',
      metaDescription: 'News and updates from {siteName}.',
      title: 'News',
      empty: 'No news posts yet.'
    },
    item: {
      visitorBriefEyebrow: 'Visitor Brief',
      talkAboutTitle: 'Talk about this entity',
      talkAboutIntro:
        'Choose a few preferences below. Atelier-Kit will assemble a message you can copy or send by email or WhatsApp.',
      details: 'Details',
      synopsisReadMore: 'Read more',
      synopsisShowLess: 'Show less',
      pageNavAriaLabel: 'Item navigation',
      previousItem: '← Previous',
      previousItemAria: 'Go to {title}',
      nextItem: 'Next →',
      nextItemAria: 'Go to {title}',
      material: 'Material',
      dimensions: 'Dimensions',
      availability: 'Availability'
    },
    visitorBrief: {
      contactEyebrow: 'Contact without a form',
      heading: 'Write with a ready message',
      intro:
        'Choose Signal Cloud answers above, then copy this brief or open email / WhatsApp with the text already prepared.',
      emptyState: 'Select one or more Signal Cloud answers above to make this brief more useful.',
      actionsAriaLabel: 'Visitor Brief actions',
      copyButton: 'Copy visitor brief',
      emailDefault: 'Email this brief',
      whatsappDefault: 'WhatsApp this brief',
      copySuccess: 'Visitor brief copied.',
      copyError: 'Could not copy automatically. Select and copy the brief manually.',
      interestLine: 'I am interested in "{title}".',
      impressionsHeading: 'My impressions:',
      noSelections: 'My impressions: no Signal Cloud selections yet.',
      itemPageLine: 'Item page: {url}',
      emailSubjectPrefix: 'Interest in'
    },
    signalCloud: {
      defaultHint:
        'Single choice. Pick one option; choosing another replaces the previous local selection.',
      selected: 'Selected: {label}',
      noSelection: 'No option selected yet.',
      chooseOption: 'Choose {label}'
    },
    error: {
      notFoundTitle: 'Item not found',
      notFoundBody: 'The requested catalog item does not exist.',
      genericTitle: 'Something went wrong',
      unexpectedError: 'Unexpected error.'
    },
    social: {
      instagram: 'Instagram',
      facebook: 'Facebook',
      x: 'X (Twitter)'
    }
  }
};
