<script>
  import MetaInfo from '$lib/components/MetaInfo.svelte';
  import SignalCloud from '$lib/components/SignalCloud.svelte';
  import VisitorBrief from '$lib/components/VisitorBrief.svelte';

  /** @type {import('./$types').PageData} */
  export let data;

  $: item = /** @type {NonNullable<import('./$types').PageData['item']>} */ (data.item);
  $: signalClouds = data.signalClouds;
</script>

<svelte:head>
  <title>{item.title}</title>
  <meta name="description" content={item.description} />
</svelte:head>

<main class="item-page">
  <a class="back-link" href="/">← Back to showcase</a>

  <article class="item-detail">
    <section class="hero" aria-labelledby="item-title">
      <div class="image-column">
        <div class="image-frame">
          <img src={item.image_file} alt={item.image_alt || item.title} />
        </div>
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

        <p class="description">{item.description}</p>

        <MetaInfo meta={item.meta} />

        {#if item.notice}
          <p class="notice">{item.notice}</p>
        {/if}
      </div>
    </section>

    {#if signalClouds.length > 0}
      <section class="visitor-zone" aria-labelledby="visitor-zone-title">
        <header class="visitor-header">
          <p class="eyebrow">Visitor Brief</p>
          <h2 id="visitor-zone-title">Talk about this piece</h2>
          <p class="visitor-intro">
            Choose a few preferences below. Atelier-Kit will assemble a message you can copy or send by email or WhatsApp.
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

  .back-link {
    display: inline-flex;
    margin-bottom: 1.25rem;
    color: inherit;
    text-decoration: none;
    opacity: 0.72;
  }

  .back-link:hover {
    opacity: 1;
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
  }

  .image-frame {
    display: grid;
    place-items: center;
    overflow: hidden;
    min-height: 18rem;
    max-height: min(72vh, 42rem);
    padding: 1rem;
    border-radius: 1.35rem;
    border: 1px solid color-mix(in srgb, var(--site-text-color, #2f281f) 12%, transparent);
    background: var(--site-surface-color, rgb(255 255 255 / 0.72));
    box-shadow: 0 24px 60px rgb(36 27 18 / 0.08);
  }

  img {
    display: block;
    width: 100%;
    max-height: min(68vh, 40rem);
    object-fit: contain;
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

  .description {
    color: color-mix(in srgb, var(--site-text-color, #2f281f) 82%, transparent);
    font-size: 1.05rem;
    line-height: 1.7;
    max-width: 38rem;
  }

  .status {
    width: fit-content;
    border: 1px solid color-mix(in srgb, var(--site-text-color, #2f281f) 16%, transparent);
    border-radius: 999px;
    padding: 0.3rem 0.65rem;
    background: var(--site-surface-color, rgb(255 255 255 / 0.72));
    color: color-mix(in srgb, var(--site-text-color, #2f281f) 62%, transparent);
    font-size: 0.8rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .notice {
    border-left: 3px solid color-mix(in srgb, var(--site-text-color, #2f281f) 24%, transparent);
    padding-left: 0.85rem;
    color: color-mix(in srgb, var(--site-text-color, #2f281f) 68%, transparent);
    line-height: 1.5;
  }

  .visitor-zone {
    display: grid;
    gap: 1.5rem;
    padding: clamp(1.25rem, 3vw, 2rem);
    border-radius: 1.35rem;
    border: 1px solid color-mix(in srgb, var(--site-text-color, #2f281f) 12%, transparent);
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
  }

  @media (max-width: 900px) {
    .hero {
      grid-template-columns: 1fr;
    }

    .visitor-grid {
      grid-template-columns: 1fr;
    }

    .image-frame {
      max-height: none;
    }
  }
</style>
