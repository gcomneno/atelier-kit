<script>
  import StudioAccessGuide from '$lib/components/StudioAccessGuide.svelte';
  import { useI18n } from '$lib/i18n/context.js';

  const t = useI18n();
</script>

<svelte:head>
  <title>{t('studio.help.pageTitle')}</title>
</svelte:head>

<StudioAccessGuide />
