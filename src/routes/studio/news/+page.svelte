<script>
  import { enhance } from '$app/forms';
  import { tick } from 'svelte';
  import StudioFormLegend from '$lib/components/StudioFormLegend.svelte';
  import StudioFormStatus from '$lib/components/AtelierFormStatus.svelte';
  import { useI18n } from '$lib/i18n/context.js';
  import { studioFormDirty, studioFormEnhanceDirty } from '$lib/studio-form-dirty.js';

  /** @typedef {{ id: string, title: string, date: string }} NewsSummary */

  const t = useI18n();

  let { data, form } = $props();

  const posts = $derived(/** @type {NewsSummary[]} */ (form?.posts ?? data.posts));
  const postById = $derived(Object.fromEntries(posts.map((/** @type {NewsSummary} */ post) => [post.id, post])));

  /** @type {string[]} */
  let orderedIds = $state([]);
  let isDirty = $state(false);
  /** @type {import('$lib/studio-form-dirty.js').StudioFormDirtyControl} */
  const dirtyControl = {};

  $effect(() => {
    orderedIds = posts.map((/** @type {NewsSummary} */ post) => post.id);
    dirtyControl.resetBaseline?.();
  });

  /**
   * @param {string} value
   */
  function formatDate(value) {
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

  /**
   * @param {number} index
   */
  async function moveUp(index) {
    if (index <= 0) {
      return;
    }

    const next = [...orderedIds];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    orderedIds = next;
    await tick();
    dirtyControl.checkDirty?.();
  }

  /**
   * @param {number} index
   */
  async function moveDown(index) {
    if (index >= orderedIds.length - 1) {
      return;
    }

    const next = [...orderedIds];
    [next[index + 1], next[index]] = [next[index], next[index + 1]];
    orderedIds = next;
    await tick();
    dirtyControl.checkDirty?.();
  }
</script>

<svelte:head>
  <title>{t('studio.news.pageTitle')}</title>
</svelte:head>

<p class="studio-intro">
  {t('studio.news.intro')}
</p>

{#if data.deletedPostTitle}
  <StudioFormStatus
    status="success"
    message={t('studio.news.deletedSuccess', { title: data.deletedPostTitle })}
  />
{:else if data.missingPostId}
  <StudioFormStatus
    status="warning"
    message={t('studio.news.missingPost', { id: data.missingPostId })}
  />
{/if}

<section class="studio-panel">
  <div class="panel-heading">
    <h2>{t('studio.news.title')}</h2>
    <p>{t('studio.news.count', { count: posts.length })}</p>
    <p class="create-link"><a href="/studio/news/new">{t('studio.news.createLink')}</a></p>
  </div>

  {#if posts.length === 0}
    <p class="empty">{t('studio.news.empty')}</p>
  {:else}
    <form
      method="POST"
      action="?/saveNewsOrder"
      use:studioFormDirty={{ setDirty: (value) => (isDirty = value), dirtyControl }}
      use:enhance={() => studioFormEnhanceDirty(dirtyControl)}
      class="studio-form"
    >
      <StudioFormLegend />

      <fieldset>
        <legend>{t('studio.news.orderLegend')}</legend>
        <p class="hint">{t('studio.news.orderHint')}</p>

        <ol class="ordered-list">
          {#each orderedIds as postId, index (postId)}
            {@const post = postById[postId]}
            <li>
              <input type="hidden" name="post_ids" value={postId} />
              <span class="order-label">{index + 1}.</span>
              <a class="order-link" href={`/studio/news/${postId}`}>
                <strong>{post?.title ?? postId}</strong>
                <span>{postId}</span>
                {#if post?.date}
                  <span class="badge">{formatDate(post.date)}</span>
                {/if}
              </a>
              <div class="order-actions">
                <button type="button" onclick={() => moveUp(index)} disabled={index === 0}>↑</button>
                <button
                  type="button"
                  onclick={() => moveDown(index)}
                  disabled={index === orderedIds.length - 1}>↓</button
                >
              </div>
            </li>
          {/each}
        </ol>
      </fieldset>

      <div class="actions">
        <button type="submit" disabled={!isDirty}>{t('studio.news.saveOrder')}</button>
      </div>

      <StudioFormStatus message={form?.newsOrderMessage} status={form?.newsOrderStatus} />
    </form>
  {/if}
</section>

<style>
  .hint {
    margin: 0 0 0.75rem;
    color: var(--studio-muted);
    font-size: 0.92rem;
    line-height: 1.45;
  }

  .ordered-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 0.65rem;
  }

  .ordered-list li {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    gap: 0.65rem;
    align-items: center;
    padding: 0.75rem 0.9rem;
    border-radius: 0.75rem;
    background: #fff;
    border: 1px solid var(--studio-border);
  }

  .order-label {
    color: var(--studio-muted);
    font-weight: 700;
  }

  .order-link {
    display: grid;
    gap: 0.2rem;
    min-width: 0;
    color: inherit;
    text-decoration: none;
  }

  .order-link:hover strong {
    color: var(--studio-accent);
  }

  .order-link span {
    color: var(--studio-muted);
    font-size: 0.85rem;
  }

  .order-actions {
    display: flex;
    gap: 0.35rem;
  }

  .order-actions button {
    border: 1px solid var(--studio-border);
    border-radius: 0.45rem;
    padding: 0.25rem 0.55rem;
    background: #fff;
    color: inherit;
    font: inherit;
    cursor: pointer;
  }

  .order-actions button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .actions {
    margin-top: 1rem;
  }

  @media (max-width: 640px) {
    .ordered-list li {
      grid-template-columns: 1fr;
    }

    .order-actions {
      justify-content: flex-start;
    }
  }
</style>
