<script>
  import { getKitCreditParts, KIT_NAME, KIT_PROJECT_URL } from '$lib/kit-branding.js';

  /** @type {string} */
  export let locale = 'en';

  $: parts = getKitCreditParts(locale);
</script>

<p class="kit-credit">
  {parts.prefix}<a
    href={KIT_PROJECT_URL}
    target="_blank"
    rel="noopener noreferrer"
    title={`${KIT_NAME} on GitHub`}
  >
    {parts.brand}
  </a>{parts.suffix}
</p>

<style>
  .kit-credit {
    margin: 0;
    font-size: 0.72rem;
    line-height: 1.4;
    letter-spacing: 0.04em;
    text-align: right;
    opacity: 0.55;
  }

  .kit-credit a {
    color: inherit;
    text-decoration: none;
  }

  .kit-credit a:hover {
    opacity: 1;
    text-decoration: underline;
  }
</style>
