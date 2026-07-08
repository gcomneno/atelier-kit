<script>
  import { useI18n } from '$lib/i18n/context.js';

  const t = useI18n();
</script>

<section class="access-guide" aria-labelledby="access-guide-title">
  <div class="panel-heading">
    <h2 id="access-guide-title">{t('studio.accessGuide.title')}</h2>
    <p>{t('studio.accessGuide.intro')}</p>
  </div>

  <ul>
    <li>
      <strong>{t('studio.common.desktopClient')}</strong>
      {t('studio.accessGuide.desktopClient')}
    </li>
    <li>
      <strong>{t('studio.common.localOnly')}</strong>
      {t('studio.accessGuide.localOnly')}
    </li>
    <li>
      <strong>{t('studio.common.productionReadonly')}</strong>
      {t('studio.accessGuide.productionReadonly')}
    </li>
    <li>
      <strong>{t('studio.common.previewFirst')}</strong>
      {t('studio.accessGuide.previewFirst')}
    </li>
    <li>
      <strong>{t('studio.common.publishWhenReady')}</strong>
      {t('studio.accessGuide.publishWhenReady')}
    </li>
    <li>
      <strong>{t('studio.common.keepBackups')}</strong>
      {t('studio.accessGuide.keepBackups')}
    </li>
  </ul>
</section>

<style>
  .access-guide {
    margin-bottom: 1.5rem;
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

  ul {
    margin: 0;
    padding-left: 1.2rem;
    display: grid;
    gap: 0.75rem;
    color: #5a4632;
    line-height: 1.55;
  }

  li strong {
    color: #2f281f;
  }
</style>
