<script>
  import SignalCloud from '$lib/components/SignalCloud.svelte';

  let { data } = $props();

  let item = $derived(data.item);
  let fields = $derived(data.catalog.fields ?? {});
</script>

<svelte:head>
  <title>{item.title} · {data.site.name}</title>
  <meta name="description" content={item.description} />
</svelte:head>

<main>
  <a class="back" href="/">← Back to catalog</a>

  <article class="item">
    <div class="image-wrap">
      <img src={item.image_file} alt={item.title} />
    </div>

    <div class="content">
      {#if fields.show_status && item.status}
        <p class="status">{item.status}</p>
      {/if}

      <h1>{item.title}</h1>

      {#if item.subtitle}
        <p class="subtitle">{item.subtitle}</p>
      {/if}

      <p class="description">{item.description}</p>

      <dl>
        {#if fields.show_material && item.material}
          <div>
            <dt>Material</dt>
            <dd>{item.material}</dd>
          </div>
        {/if}

        {#if fields.show_dimensions && item.dimensions}
          <div>
            <dt>Dimensions</dt>
            <dd>{item.dimensions}</dd>
          </div>
        {/if}

        {#if fields.show_availability && item.availability}
          <div>
            <dt>Availability</dt>
            <dd>{item.availability}</dd>
          </div>
        {/if}

        {#if fields.show_price && item.price_mode}
          <div>
            <dt>Price</dt>
            <dd>{item.price_mode}</dd>
          </div>
        {/if}
      </dl>

      {#if item.notice}
        <p class="notice">{item.notice}</p>
      {/if}
    </div>
  </article>

  <section class="signals" aria-label="Signal Clouds">
    {#each data.signalClouds as cloud}
      <SignalCloud itemId={item.id} {cloud} />
    {/each}
  </section>
</main>

<style>
  main {
    width: min(1120px, calc(100% - 2rem));
    margin: 0 auto;
    padding: 2rem 0 4rem;
  }

  .back {
    display: inline-flex;
    margin-bottom: 1.4rem;
    color: #6d5841;
    font-weight: 700;
    text-decoration: none;
  }

  .item {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(18rem, 0.85fr);
    gap: clamp(1.2rem, 4vw, 3rem);
    align-items: start;
  }

  .image-wrap {
    overflow: hidden;
    border: 1px solid #e4d8c7;
    border-radius: 32px;
    background: #f3eadc;
    box-shadow: 0 20px 70px rgb(36 27 18 / 0.08);
  }

  img {
    display: block;
    width: 100%;
  }

  .content {
    padding: 1rem 0;
  }

  .status {
    width: fit-content;
    margin: 0 0 1rem;
    padding: 0.25rem 0.65rem;
    border: 1px solid #d7c1a4;
    border-radius: 999px;
    color: #6d5841;
    font-size: 0.75rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  h1 {
    margin: 0;
    font-size: clamp(3rem, 10vw, 6rem);
    line-height: 0.92;
    letter-spacing: -0.07em;
  }

  .subtitle {
    margin: 0.8rem 0 0;
    color: #725f4a;
    font-size: 1.25rem;
  }

  .description {
    margin: 1.4rem 0 0;
    color: #4f4236;
    font-size: 1.05rem;
    line-height: 1.7;
  }

  dl {
    display: grid;
    gap: 0.7rem;
    margin: 1.8rem 0 0;
  }

  dl div {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    border-top: 1px solid #e3d4bf;
    padding-top: 0.7rem;
  }

  dt {
    color: #7b6a58;
  }

  dd {
    margin: 0;
    text-align: right;
  }

  .notice {
    margin-top: 1.4rem;
    padding: 1rem;
    border: 1px solid #dfc9aa;
    border-radius: 20px;
    color: #5d4a36;
    background: rgb(255 250 242 / 0.72);
  }

  .signals {
    display: grid;
    gap: 1rem;
    margin-top: 2rem;
  }

  @media (max-width: 760px) {
    .item {
      grid-template-columns: 1fr;
    }
  }
</style>
