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
    <div class="visual-column">
      <div class="image-frame">
        <img src={item.image_file} alt={item.image_alt || item.title} />
      </div>

      {#if signalClouds.length > 0}
        <section class="signals" aria-labelledby="signals-heading">
          <h2 id="signals-heading">Signal Clouds</h2>

          <div class="signal-list">
            {#each signalClouds as cloud}
              <SignalCloud itemId={item.id} {cloud} />
            {/each}
          </div>
        </section>

        <VisitorBrief {item} {signalClouds} contact={data.contact} />
      {/if}
    </div>

    <div class="content">
      <header>
        {#if item.status}
          <p class="status">{item.status}</p>
        {/if}

        <h1>{item.title}</h1>

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
  </article>
</main>

<style>
  .item-page {
    width: min(1080px, calc(100% - 2rem));
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
    grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr);
    gap: 2rem;
    align-items: start;
  }

  .visual-column,
  .content {
    display: grid;
    gap: 1.25rem;
  }

  .image-frame {
    overflow: hidden;
    border-radius: 1.25rem;
    border: 1px solid rgba(20, 20, 20, 0.12);
    background: rgba(255, 255, 255, 0.72);
  }

  img {
    display: block;
    width: 100%;
    aspect-ratio: 4 / 3;
    object-fit: cover;
  }

  header {
    display: grid;
    gap: 0.35rem;
  }

  h1 {
    margin: 0;
    font-size: clamp(2rem, 7vw, 4rem);
    line-height: 0.95;
    letter-spacing: -0.06em;
  }

  .subtitle,
  .description,
  .notice,
  .status {
    margin: 0;
  }

  .subtitle {
    color: rgba(20, 20, 20, 0.68);
    font-size: 1.1rem;
  }

  .description {
    color: rgba(20, 20, 20, 0.82);
    font-size: 1.05rem;
    line-height: 1.65;
  }

  .status {
    width: fit-content;
    border: 1px solid rgba(20, 20, 20, 0.16);
    border-radius: 999px;
    padding: 0.3rem 0.65rem;
    background: rgba(255, 255, 255, 0.72);
    color: rgba(20, 20, 20, 0.62);
    font-size: 0.8rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .notice {
    border-left: 3px solid rgba(20, 20, 20, 0.24);
    padding-left: 0.85rem;
    color: rgba(20, 20, 20, 0.68);
    line-height: 1.5;
  }

  .signals {
    display: grid;
    gap: 0.85rem;
  }

  .signals > h2 {
    margin: 0;
    font-size: 1.15rem;
  }

  .signal-list {
    display: grid;
    gap: 1rem;
  }

  @media (max-width: 820px) {
    .item-detail {
      grid-template-columns: 1fr;
    }
  }
</style>
