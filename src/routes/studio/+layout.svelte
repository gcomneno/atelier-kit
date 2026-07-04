<script>
  let { children } = $props();
</script>

<div class="studio-shell">
  <header class="studio-header">
    <div>
      <p class="eyebrow">Atelier-Kit studio</p>
      <h1>Local authoring</h1>
    </div>

    <nav aria-label="Studio">
      <a href="/studio">Site settings</a>
      <a href="/" target="_blank" rel="noreferrer">Preview site</a>
    </nav>
  </header>

  {@render children()}
</div>

<style>
  .studio-shell {
    width: min(880px, calc(100% - 2rem));
    margin: 0 auto;
    padding: 2rem 0 4rem;
  }

  .studio-header {
    display: flex;
    justify-content: space-between;
    align-items: end;
    gap: 1.5rem;
    margin-bottom: 2rem;
    padding-bottom: 1.5rem;
    border-bottom: 1px solid rgb(47 40 31 / 0.12);
  }

  .eyebrow {
    margin: 0 0 0.35rem;
    color: #7d684f;
    font-size: 0.8rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  h1 {
    margin: 0;
    font-size: 1.75rem;
    font-weight: 600;
  }

  nav {
    display: flex;
    gap: 1rem;
    font-size: 0.95rem;
  }

  nav a {
    color: #5a4632;
  }
</style>
