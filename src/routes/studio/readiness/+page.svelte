<script>
  import StudioAccessGuide from '$lib/components/StudioAccessGuide.svelte';
  import { useI18n } from '$lib/i18n/context.js';

  const t = useI18n();

  let { data } = $props();
</script>

<svelte:head>
  <title>{t('studio.readiness.pageTitle')}</title>
</svelte:head>

<StudioAccessGuide />

<p class="intro">
  {t('studio.readiness.intro')}
</p>

<section class="panel">
  <div class="panel-heading">
    <h2>{t('studio.readiness.doctorTitle')}</h2>
    <p class={data.report.ok ? 'ok' : 'review'}>
      {data.report.ok ? t('studio.readiness.doctorOk') : t('studio.readiness.doctorReview')}
    </p>
  </div>

  <pre class="report">{data.report.output}</pre>
</section>

<section class="panel">
  <div class="panel-heading">
    <h2>{t('studio.readiness.publishTitle')}</h2>
    <p>{t('studio.readiness.publishIntro')}</p>
  </div>

  <pre><code>npm run publish
npm run publish -- --deploy</code></pre>
</section>

<style>
  .intro {
    margin: 0 0 1.5rem;
    color: #5a4632;
    line-height: 1.6;
  }

  .panel {
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

  .ok {
    color: #2f4f35;
  }

  .review {
    color: #6a4a1b;
  }

  .report,
  pre code {
    margin: 0;
    padding: 1rem;
    overflow-x: auto;
    border-radius: 0.75rem;
    background: #2f281f;
    color: #f8f0e4;
    white-space: pre-wrap;
    line-height: 1.5;
  }
</style>
