<script>
  import MarkedTextField from '$lib/components/MarkedTextField.svelte';
  import { enhance } from '$app/forms';
  import StudioFieldLabel from '$lib/components/StudioFieldLabel.svelte';
  import StudioFormLegend from '$lib/components/StudioFormLegend.svelte';
  import StudioFormStatus from '$lib/components/StudioFormStatus.svelte';
  import { useI18n } from '$lib/i18n/context.js';

  const t = useI18n();

  let { data, form } = $props();

  const newsForm = $derived(
    form?.form ?? {
      id: '',
      title: '',
      date: data.defaultDate,
      body: '',
      excerpt: '',
      image_alt: ''
    }
  );
</script>

<svelte:head>
  <title>{t('studio.newsNew.pageTitle')}</title>
</svelte:head>

<p class="studio-intro">
  {t('studio.newsNew.intro')}
</p>

<section class="studio-panel">
  <div class="panel-heading">
    <h2>{t('studio.newsNew.title')}</h2>
    <p>{t('studio.newsNew.introPanel')}</p>
  </div>

  <form method="POST" action="?/createNews" enctype="multipart/form-data" use:enhance class="studio-form">
    <StudioFormLegend />

    <label>
      <StudioFieldLabel label={t('studio.newsNew.id')} required hint={t('studio.newsNew.idHint')} />
      <input
        name="id"
        value={newsForm.id}
        required
        pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
        title={t('studio.newsNew.idPattern')}
      />
    </label>

    <label>
      <StudioFieldLabel label={t('studio.newsNew.titleField')} optional />
      <MarkedTextField name="title" value={newsForm.title} />
    </label>

    <label>
      <StudioFieldLabel label={t('studio.newsNew.date')} required hint={t('studio.newsNew.dateHint')} />
      <input name="date" type="date" value={newsForm.date} required />
    </label>

    <label>
      <StudioFieldLabel label={t('studio.newsNew.excerpt')} optional hint={t('studio.newsNew.excerptHint')} />
      <MarkedTextField name="excerpt" value={newsForm.excerpt} multiline rows={2} />
    </label>

    <label>
      <StudioFieldLabel label={t('studio.newsNew.body')} required />
      <MarkedTextField name="body" value={newsForm.body} multiline rows={8} />
    </label>

    <label>
      <StudioFieldLabel
        label={t('studio.newsNew.photo')}
        optional
        hint={t('studio.newsNew.photoHint', { id: newsForm.id || 'post-id' })}
      />
      <input type="file" name="image_upload" accept="image/jpeg,image/png,image/webp" />
    </label>

    <label>
      <StudioFieldLabel label={t('studio.newsNew.imageAlt')} optional />
      <input name="image_alt" value={newsForm.image_alt ?? ''} />
    </label>

    <div class="actions">
      <button type="submit">{t('studio.newsNew.create')}</button>
      <a class="secondary-link" href="/studio/news">{t('studio.newsNew.cancel')}</a>
    </div>

    <StudioFormStatus message={form?.createMessage} status={form?.createStatus} />
  </form>
</section>

<style>
  .actions {
    display: flex;
    gap: 1rem;
    align-items: center;
  }

  .secondary-link {
    color: var(--studio-accent);
    font-weight: 600;
    text-decoration: none;
  }

  .secondary-link:hover {
    text-decoration: underline;
  }
</style>
