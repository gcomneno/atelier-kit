<script>
  import { useI18n } from '$lib/i18n/context.js';

  const t = useI18n();

  let { data } = $props();
</script>

<svelte:head>
  <title>{t('studio.collections.pageTitle')}</title>
</svelte:head>

<p class="intro">
  {t('studio.collections.intro')}
</p>

<section class="panel">
  <div class="panel-heading">
    <h2>{t('studio.collections.title')}</h2>
    <p>{t('studio.collections.count', { count: data.collections.length })}</p>
    <p class="create-link"><a href="/studio/collections/new">{t('studio.collections.createLink')}</a></p>
  </div>

  {#if data.collections.length === 0}
    <p class="empty">
      {t('studio.collections.empty')}
      <a href="/studio/collections/new">{t('studio.collections.createFirst')}</a>.
    </p>
  {:else}
    <ul class="record-list">
      {#each data.collections as collection}
        <li>
          <a href={`/studio/collections/${collection.id}`}>
            <strong>{collection.title}</strong>
            <span>{collection.id}</span>
            <span>{t('studio.collections.itemCount', { count: collection.itemCount })}</span>
          </a>
        </li>
      {/each}
    </ul>
  {/if}
</section>

<style>
  .intro {
    margin: 0 0 1.5rem;
    color: #5a4632;
    line-height: 1.6;
  }

  .panel {
    padding: 1.5rem;
    border: 1px solid rgb(47 40 31 / 0.12);
    border-radius: 1rem;
    background: rgb(255 250 242 / 0.82);
  }

  .panel-heading h2 {
    margin: 0 0 0.35rem;
    font-size: 1.2rem;
  }

  .panel-heading p {
    margin: 0 0 1rem;
    color: #7d684f;
  }

  .create-link {
    margin: 0;
  }

  .create-link a {
    color: #5a4632;
    font-weight: 600;
  }

  .empty {
    margin: 0;
    color: #5a4632;
  }

  .record-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 0.75rem;
  }

  .record-list a {
    display: grid;
    gap: 0.2rem;
    padding: 0.9rem 1rem;
    border-radius: 0.75rem;
    background: #fffdf9;
    border: 1px solid rgb(47 40 31 / 0.08);
    text-decoration: none;
  }

  .record-list span {
    color: #7d684f;
    font-size: 0.9rem;
  }
</style>
