<script>
  import { tick } from 'svelte';
  import MetaInfo from '$lib/components/MetaInfo.svelte';
  import ImageLightbox from '$lib/components/ImageLightbox.svelte';
  import PageSocialMeta from '$lib/components/PageSocialMeta.svelte';
  import SignalCloud from '$lib/components/SignalCloud.svelte';
  import VisitorBrief from '$lib/components/VisitorBrief.svelte';
  import { getItemCoverImage, getItemCoverIndex, normalizeItemImages } from '$lib/item-images.js';
  import { resolveItemCoverFallbackSrc } from '$lib/item-cover.js';
  import { useVisitorI18n } from '$lib/i18n/visitor-context.js';

  /** @type {import('./$types').PageData} */
  export let data;

  const t = useVisitorI18n();

  $: item = /** @type {NonNullable<import('./$types').PageData['item']>} */ (data.item);
  $: signalClouds = data.signalClouds;
  $: nextItem = data.neighbors?.next ?? null;
  $: previousItem = data.neighbors?.previous ?? null;
  $: itemImages = normalizeItemImages(item);
  $: coverImage = getItemCoverImage(item);
  $: coverIndex = getItemCoverIndex(itemImages);

  let descriptionExpanded = false;
  /** @type {HTMLParagraphElement | undefined} */
  let descriptionEl;
  let descriptionCanToggle = false;
  let lightboxOpen = false;
  let lightboxIndex = 0;

  $: item.id, resetDescription();
  $: item.description, descriptionEl, queueDescriptionMeasure();

  function queueDescriptionMeasure() {
    tick().then(() => measureDescription());
  }

  async function resetDescription() {
    descriptionExpanded = false;
    await tick();
    await measureDescription();
  }

  async function measureDescription() {
    await tick();

    if (!descriptionEl) {
      descriptionCanToggle = false;
      return;
    }

    const wasExpanded = descriptionExpanded;
    descriptionExpanded = false;
    await tick();

    descriptionCanToggle = descriptionEl.scrollHeight > descriptionEl.clientHeight + 2;
    descriptionExpanded = wasExpanded;
  }

  async function toggleDescription() {
    descriptionExpanded = !descriptionExpanded;
  }

  function openImageLightbox(index = coverIndex) {
    lightboxIndex = index;
    lightboxOpen = true;
  }

  /**
   * @param {HTMLParagraphElement} node
   */
  function trackDescription(node) {
    descriptionEl = node;
    measureDescription();

    const observer = new ResizeObserver(() => {
      if (!descriptionExpanded) {
        measureDescription();
      }
    });

    observer.observe(node);

    return {
      update() {
        measureDescription();
      },
      destroy() {
        observer.disconnect();

        if (descriptionEl === node) {
          descriptionEl = undefined;
        }
      }
    };
  }
</script>

<svelte:head>
  <title>{item.title}</title>
  <meta name="description" content={item.description} />
</svelte:head>

<PageSocialMeta
  title={data.seo?.ogTitle}
  description={data.seo?.ogDescription}
  image={data.seo?.ogImage}
/>

<main class="item-page">
  <nav class="item-nav" aria-label={t('item.pageNavAriaLabel')}>
    {#if previousItem}
      <a
        class="nav-link back-link"
        href={`/items/${previousItem.id}`}
        aria-label={t('item.previousItemAria', { title: previousItem.title })}
      >
        {t('item.previousItem')}
      </a>
    {:else}
      <a class="nav-link back-link" href="/">{t('common.backToShowcase')}</a>
    {/if}

    {#if nextItem}
      <a
        class="nav-link next-link"
        href={`/items/${nextItem.id}`}
        aria-label={t('item.nextItemAria', { title: nextItem.title })}
      >
        {t('item.nextItem')}
      </a>
    {/if}
  </nav>

  <article class="item-detail">
    <section class="hero" aria-labelledby="item-title">
      <div class="image-column">
        <button
          type="button"
          class="image-frame image-trigger"
          aria-label={t('imageLightbox.enlarge', { title: item.title })}
          on:click={() => openImageLightbox(coverIndex)}
        >
          <img
            src={coverImage.file}
            alt={coverImage.alt || item.title}
            width="600"
            height="900"
            on:error={(event) => {
              const img = /** @type {HTMLImageElement} */ (event.currentTarget);

              if (img.dataset.fallbackApplied === 'true') {
                return;
              }

              img.dataset.fallbackApplied = 'true';
              img.src = resolveItemCoverFallbackSrc(item);
            }}
          />
        </button>
        <ImageLightbox
          bind:open={lightboxOpen}
          bind:index={lightboxIndex}
          images={itemImages}
          src={coverImage.file}
          alt={coverImage.alt || item.title}
        />

        {#if itemImages.length > 1}
          <div class="image-gallery" aria-label="Item image gallery">
            {#each itemImages as image, imageIndex}
              <button
                type="button"
                class="image-thumb"
                class:active={imageIndex === lightboxIndex}
                aria-label={`View image ${imageIndex + 1}`}
                on:click={() => openImageLightbox(imageIndex)}
              >
                <img src={image.file} alt={image.alt || item.title} loading="lazy" />
              </button>
            {/each}
          </div>
        {/if}
      </div>

      <div class="content-column">
        <header class="item-header">
          {#if item.status}
            <p class="status">{item.status}</p>
          {/if}

          <h1 id="item-title">{item.title}</h1>

          {#if item.subtitle}
            <p class="subtitle">{item.subtitle}</p>
          {/if}
        </header>

        <div class="description-block">
          <div class="description-shell" class:expanded={descriptionExpanded}>
            <p class="description" use:trackDescription>{item.description}</p>

            {#if descriptionCanToggle}
              <div class="description-actions">
                <button
                  type="button"
                  class="description-toggle"
                  aria-expanded={descriptionExpanded}
                  on:click={toggleDescription}
                >
                  {descriptionExpanded ? t('item.synopsisShowLess') : t('item.synopsisReadMore')}
                </button>
              </div>
            {/if}
          </div>
        </div>
      </div>

      <div class="hero-footer">
        <MetaInfo meta={item.meta} />

        {#if item.preview}
          <p class="preview-link">
            <a href={item.preview.href} target="_blank" rel="noopener noreferrer">{item.preview.label}</a>
          </p>
        {/if}

        {#if item.notice}
          <p class="notice">{item.notice}</p>
        {/if}
      </div>
    </section>

    {#if signalClouds.length > 0}
      <section class="visitor-zone" aria-labelledby="visitor-zone-title">
        <header class="visitor-header">
          <p class="eyebrow">{t('item.visitorBriefEyebrow')}</p>
          <h2 id="visitor-zone-title">{t('item.talkAboutTitle')}</h2>
          <p class="visitor-intro">
            {t('item.talkAboutIntro')}
          </p>
        </header>

        <div class="visitor-grid">
          <div class="signal-list">
            {#each signalClouds as cloud}
              <SignalCloud itemId={item.id} {cloud} />
            {/each}
          </div>

          <VisitorBrief {item} {signalClouds} contact={data.contact} />
        </div>
      </section>
    {/if}
  </article>
</main>

<style>
  .item-page {
    width: min(1120px, calc(100% - 2rem));
    margin: 0 auto;
    padding: 2rem 0 4rem;
  }

  .item-nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 1.25rem;
  }

  .nav-link {
    color: inherit;
    text-decoration: none;
    opacity: 0.72;
  }

  .nav-link:hover {
    opacity: 1;
  }

  .next-link {
    margin-left: auto;
    text-align: right;
  }

  .item-detail {
    display: grid;
    gap: 2.5rem;
  }

  .hero {
    display: grid;
    grid-template-columns: minmax(0, 0.92fr) minmax(0, 1.08fr);
    gap: clamp(1.5rem, 4vw, 3rem);
    align-items: start;
  }

  .image-column,
  .content-column {
    display: grid;
    gap: 1.25rem;
    min-width: 0;
  }

  .hero-footer {
    grid-column: 1 / -1;
    display: grid;
    gap: 1.25rem;
  }

  .image-column {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.85rem;
    min-width: 0;
  }

  .image-frame {
    display: block;
    width: min(100%, 16.5rem);
    aspect-ratio: 2 / 3;
    overflow: hidden;
    border-radius: 1.35rem;
    border: 1px solid var(--site-border-color, color-mix(in srgb, var(--site-text-color, #2f281f) 12%, transparent));
    background: var(--site-surface-color, rgb(255 255 255 / 0.72));
    box-shadow: 0 24px 60px color-mix(in srgb, var(--site-base-color, #0f0e0d) 35%, black);
  }

  .image-trigger {
    padding: 0;
    cursor: zoom-in;
    font: inherit;
    color: inherit;
  }

  .image-trigger:focus-visible {
    outline: 3px solid color-mix(in srgb, var(--site-accent-color, #8c3a44) 45%, transparent);
    outline-offset: 4px;
  }

  .image-gallery {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.55rem;
    width: min(100%, 22rem);
  }

  .image-thumb {
    width: 4rem;
    aspect-ratio: 1;
    overflow: hidden;
    border: 1px solid color-mix(in srgb, var(--site-text-color, #2f281f) 18%, transparent);
    border-radius: 0.7rem;
    padding: 0;
    background: var(--site-surface-color, rgb(255 255 255 / 0.72));
    cursor: zoom-in;
    opacity: 0.74;
  }

  .image-thumb.active,
  .image-thumb:hover {
    opacity: 1;
    border-color: var(--site-accent-color, #8c3a44);
  }

  .image-thumb:focus-visible {
    outline: 3px solid color-mix(in srgb, var(--site-accent-color, #8c3a44) 45%, transparent);
    outline-offset: 3px;
  }

  img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center;
  }

  .item-header {
    display: grid;
    gap: 0.5rem;
  }

  h1 {
    margin: 0;
    font-size: clamp(2rem, 5vw, 3.25rem);
    line-height: 1.02;
    letter-spacing: -0.04em;
  }

  .subtitle,
  .description,
  .notice,
  .status {
    margin: 0;
  }

  .subtitle {
    color: color-mix(in srgb, var(--site-text-color, #2f281f) 68%, transparent);
    font-size: 1.1rem;
  }

  .description-block {
    max-width: 38rem;
  }

  .description-shell {
    position: relative;
    display: grid;
    gap: 0.35rem;
  }

  .description-shell:not(.expanded) .description {
    max-height: 14rem;
    overflow: hidden;
    padding-bottom: 0.15rem;
  }

  .description-shell:not(.expanded)::after {
    content: '';
    position: absolute;
    inset: auto 0 1.85rem;
    height: 3.5rem;
    pointer-events: none;
    background: linear-gradient(
      to bottom,
      transparent,
      color-mix(in srgb, var(--site-base-color, #0f0e0d) 88%, transparent)
    );
  }

  .description-shell.expanded .description {
    max-height: none;
  }

  .description {
    margin: 0;
    color: color-mix(in srgb, var(--site-text-color, #2f281f) 82%, transparent);
    font-size: 1.05rem;
    line-height: 1.7;
    white-space: pre-line;
  }

  .description-actions {
    display: flex;
    justify-content: flex-end;
  }

  .description-shell:not(.expanded) .description-actions {
    position: absolute;
    right: 0;
    bottom: 0;
    z-index: 1;
    padding-left: 2.5rem;
    background: linear-gradient(
      to right,
      transparent,
      color-mix(in srgb, var(--site-base-color, #0f0e0d) 88%, transparent) 42%
    );
  }

  .description-toggle {
    width: fit-content;
    border: 0;
    padding: 0;
    background: none;
    color: var(--site-accent-color, #8c3a44);
    cursor: pointer;
    font: inherit;
    font-size: 0.95rem;
    font-weight: 700;
    line-height: 1.4;
    text-decoration: underline;
    text-underline-offset: 0.18em;
  }

  .description-toggle:hover {
    color: color-mix(in srgb, var(--site-accent-color, #8c3a44) 78%, white);
  }

  .description-toggle:focus-visible {
    outline: 3px solid color-mix(in srgb, var(--site-accent-color, #8c3a44) 45%, transparent);
    outline-offset: 3px;
  }

  .status {
    max-width: 100%;
    width: fit-content;
    border: 1px solid color-mix(in srgb, var(--site-text-color, #2f281f) 16%, transparent);
    border-radius: 999px;
    padding: 0.3rem 0.65rem;
    background: var(--site-surface-color, rgb(255 255 255 / 0.72));
    color: color-mix(in srgb, var(--site-text-color, #2f281f) 62%, transparent);
    font-size: 0.8rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    line-height: 1.35;
    text-transform: uppercase;
    overflow-wrap: anywhere;
    white-space: normal;
  }

  .notice {
    border-left: 3px solid color-mix(in srgb, var(--site-text-color, #2f281f) 24%, transparent);
    padding-left: 0.85rem;
    color: color-mix(in srgb, var(--site-text-color, #2f281f) 68%, transparent);
    line-height: 1.5;
  }

  .preview-link {
    margin: 0;
  }

  .preview-link a {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--site-accent-color, #8c3a44);
    border-radius: 999px;
    padding: 0.65rem 1rem;
    background: var(--site-accent-color, #8c3a44);
    color: #fff;
    font-weight: 700;
    text-decoration: none;
  }

  .preview-link a:hover {
    background: color-mix(in srgb, var(--site-accent-color, #8c3a44) 82%, black);
    border-color: color-mix(in srgb, var(--site-accent-color, #8c3a44) 82%, black);
  }

  .visitor-zone {
    display: grid;
    gap: 1.5rem;
    padding: clamp(1.25rem, 3vw, 2rem);
    border-radius: 1.35rem;
    border: 1px solid var(--site-border-color, color-mix(in srgb, var(--site-text-color, #2f281f) 12%, transparent));
    background: var(--site-card-color, rgb(255 250 242 / 0.88));
  }

  .visitor-header {
    display: grid;
    gap: 0.45rem;
    max-width: 42rem;
  }

  .eyebrow {
    margin: 0;
    color: color-mix(in srgb, var(--site-text-color, #2f281f) 55%, transparent);
    font-size: 0.78rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .visitor-header h2 {
    margin: 0;
    font-size: clamp(1.35rem, 3vw, 1.85rem);
  }

  .visitor-intro {
    margin: 0;
    color: color-mix(in srgb, var(--site-text-color, #2f281f) 68%, transparent);
    line-height: 1.55;
  }

  .visitor-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.05fr) minmax(18rem, 0.95fr);
    gap: 1.5rem;
    align-items: start;
  }

  .signal-list {
    display: grid;
    gap: 1rem;
    min-width: 0;
  }

  @media (max-width: 900px) {
    .hero {
      grid-template-columns: 1fr;
    }

    .hero-footer {
      grid-column: auto;
    }

    .visitor-grid {
      grid-template-columns: 1fr;
    }

    .image-frame {
      width: min(100%, 14rem);
    }
  }
</style>
