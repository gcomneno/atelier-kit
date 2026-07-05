<script>
  import { useI18n } from '$lib/i18n/context.js';

  const t = useI18n();

  let { data } = $props();

  function formatDate(/** @type {string} */ value) {
    if (!value) {
      return '';
    }

    const parsed = new Date(`${value}T12:00:00`);

    if (Number.isNaN(parsed.getTime())) {
      return value;
    }

    return parsed.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
</script>

<svelte:head>
  <title>{t('studio.news.pageTitle')}</title>
</svelte:head>

<p class="intro">
  {t('studio.news.intro')}
</p>

<section class="panel">
  <div class="panel-heading">
    <h2>{t('studio.news.title')}</h2>
    <p>{t('studio.news.count', { count: data.posts.length })}</p>
    <p class="create-link"><a href="/studio/news/new">{t('studio.news.createLink')}</a></p>
  </div>

  {#if data.posts.length === 0}
    <p class="empty">
      {t('studio.news.empty')}
      <a href="/studio/news/new">{t('studio.news.createFirst')}</a>.
    </p>
  {:else}
    <ul class="record-list">
      {#each data.posts as post}
        <li>
          <a href={`/studio/news/${post.id}`}>
            <strong>{post.title}</strong>
            <span>{post.id}</span>
            {#if post.date}
              <span class="date">{formatDate(post.date)}</span>
            {/if}
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

  .date {
    font-size: 0.85rem;
  }
</style>
