<script>
  import { page } from '$app/state';
  import { useVisitorI18n } from '$lib/i18n/visitor-context.js';

  const t = useVisitorI18n();
  let isNotFound = $derived(page.status === 404);
</script>

<main>
  <p class="eyebrow">{page.status}</p>

  {#if isNotFound}
    <h1>{t('error.notFoundTitle')}</h1>
    <p>{t('error.notFoundBody')}</p>
  {:else}
    <h1>{t('error.genericTitle')}</h1>
    <p>{page.error?.message ?? t('error.unexpectedError')}</p>
  {/if}

  <a href="/">{t('common.backToCatalog')}</a>
</main>

<style>
  main {
    display: grid;
    place-content: center;
    min-height: 100vh;
    width: min(760px, calc(100% - 2rem));
    margin: 0 auto;
    text-align: center;
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
  }

  p {
    color: #5d4a36;
  }

  a {
    justify-self: center;
    margin-top: 1rem;
    font-weight: 800;
  }
</style>
