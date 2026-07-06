<script>
  import { resolveItemCoverFallbackSrc, resolveItemCoverSrc } from '$lib/item-cover.js';
  import { useVisitorI18n } from '$lib/i18n/visitor-context.js';

  let { item, catalog } = $props();
  const t = useVisitorI18n();

  let fields = $derived(catalog.fields ?? {});
</script>

<a class="card" href={`/items/${item.id}`}>
  <div class="image-wrap">
    <img
      src={resolveItemCoverSrc(item)}
      alt={item.image_alt || item.title}
      loading="lazy"
      width="400"
      height="600"
      onerror={(event) => {
        const img = event.currentTarget;

        if (img.dataset.fallbackApplied === 'true') {
          return;
        }

        img.dataset.fallbackApplied = 'true';
        img.src = resolveItemCoverFallbackSrc(item);
      }}
    />
  </div>

  <div class="body">
    {#if fields.show_status && item.status}
      <p class="status">{item.status}</p>
    {/if}

    <h2>{item.title}</h2>

    {#if item.subtitle}
      <p class="subtitle">{item.subtitle}</p>
    {/if}

    <p class="description">{item.description}</p>

    <dl>
      {#if fields.show_material && item.material}
        <div>
          <dt>{t('item.material')}</dt>
          <dd>{item.material}</dd>
        </div>
      {/if}

      {#if fields.show_dimensions && item.dimensions}
        <div>
          <dt>{t('item.dimensions')}</dt>
          <dd>{item.dimensions}</dd>
        </div>
      {/if}

      {#if fields.show_availability && item.availability}
        <div>
          <dt>{t('item.availability')}</dt>
          <dd>{item.availability}</dd>
        </div>
      {/if}
    </dl>
  </div>
</a>

<style>
  .card {
    display: grid;
    overflow: hidden;
    color: inherit;
    text-decoration: none;
    background: var(--site-card-color, #fffaf2);
    border: 1px solid color-mix(in srgb, var(--site-text-color, #2f281f) 14%, transparent);
    border-radius: 28px;
    box-shadow: 0 20px 70px rgb(36 27 18 / 0.08);
    transition:
      transform 160ms ease,
      box-shadow 160ms ease,
      border-color 160ms ease;
  }

  .card:hover {
    transform: translateY(-3px);
    border-color: #c9ad89;
    box-shadow: 0 24px 90px rgb(36 27 18 / 0.14);
  }

  .image-wrap {
    display: grid;
    place-items: center;
    aspect-ratio: 2 / 3;
    overflow: hidden;
    background: color-mix(in srgb, var(--site-base-color, #f8f0e4) 88%, white);
  }

  img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
    object-position: center;
  }

  .body {
    padding: 1.4rem;
    min-width: 0;
  }

  .status {
    max-width: 100%;
    width: fit-content;
    margin: 0 0 0.85rem;
    padding: 0.25rem 0.65rem;
    border: 1px solid #d7c1a4;
    border-radius: 999px;
    color: #6d5841;
    font-size: 0.75rem;
    letter-spacing: 0.08em;
    line-height: 1.35;
    text-transform: uppercase;
    overflow-wrap: anywhere;
    white-space: normal;
  }

  h2 {
    margin: 0;
    font-size: clamp(1.35rem, 4vw, 1.75rem);
  }

  .subtitle {
    margin: 0.35rem 0 0;
    color: #725f4a;
    font-size: 0.88rem;
    line-height: 1.45;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    overflow: hidden;
  }

  .description {
    margin: 0.75rem 0 0;
    color: #4f4236;
    font-size: 0.92rem;
    line-height: 1.55;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 4;
    overflow: hidden;
  }

  dl {
    display: grid;
    gap: 0.55rem;
    margin: 1.25rem 0 0;
  }

  dl div {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 0.35rem 1rem;
    border-top: 1px solid #efe3d2;
    padding-top: 0.55rem;
  }

  dt {
    color: #7b6a58;
    font-size: 0.85rem;
    flex: 1 1 6rem;
    min-width: 0;
  }

  dd {
    margin: 0;
    color: #2f281f;
    text-align: right;
    flex: 1 1 8rem;
    min-width: 0;
    overflow-wrap: anywhere;
  }
</style>
