<script>
  import { SocialIcon } from 'giadaware-ui-components';
  import { resolveAtelierSocialIconId } from '$lib/social-icon-adapter.js';

  /** @type {{ id: string }} */
  let { id } = $props();

  const normalizedId = $derived(resolveAtelierSocialIconId(id));
</script>

{#if normalizedId}
  <SocialIcon id={normalizedId} decorative={true} />
{/if}
