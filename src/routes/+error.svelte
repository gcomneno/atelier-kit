<script>
  import { page } from '$app/state';
  import { useVisitorI18n } from '$lib/i18n/visitor-context.js';

  const t = useVisitorI18n();
  let isNotFound = $derived(page.status === 404);
  let missingItemId = $derived.by(() => {
    const match = page.url.pathname.match(/^\/items\/([^/]+)\/?$/);

    return match?.[1] ? decodeURIComponent(match[1]) : '';
  });
  let isItemNotFound = $derived(isNotFound && missingItemId !== '');
  let backHref = $derived(isItemNotFound ? '/catalog' : '/');
  let backLabel = $derived(
    isItemNotFound ? t('common.backToCatalog') : t('error.backToHome')
  );
</script>

<main class="error-page">
  <p class="eyebrow">{page.status}</p>

  {#if isItemNotFound}
    <h1>{t('error.itemNotFoundTitle')}</h1>
    <p>{t('error.itemNotFoundBody')}</p>
    <p class="requested-id">{t('error.itemNotFoundId', { id: missingItemId })}</p>
  {:else if isNotFound}
    <h1>{t('error.pageNotFoundTitle')}</h1>
    <p>{t('error.pageNotFoundBody')}</p>
  {:else}
    <h1>{t('error.genericTitle')}</h1>
    <p>{page.error?.message ?? t('error.unexpectedError')}</p>
  {/if}

  <a href={backHref}>{backLabel}</a>
</main>

<style>
  main {
    display: grid;
    justify-items: center;
    place-content: center;
    min-height: 100vh;
    width: min(760px, calc(100% - 2rem));
    margin: 0 auto;
    text-align: center;
  }

  .eyebrow,
  p {
    width: 100%;
    max-width: 36rem;
    margin: 0;
    text-align: center;
    text-wrap: balance;
    hyphens: none;
  }

  .eyebrow {
    color: #7d684f;
    font-size: 0.8rem;
    font-weight: 800;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  h1 {
    margin: 0;
    font-size: clamp(3rem, 12vw, 6rem);
    letter-spacing: -0.07em;
    text-align: center;
  }

  p {
    color: #5d4a36;
  }

  .requested-id {
    margin-top: 0.75rem;
    color: #7d684f;
    font-size: 0.95rem;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  }

  a {
    justify-self: center;
    margin-top: 1rem;
    font-weight: 800;
  }
</style>
