<section class="access-guide" aria-labelledby="access-guide-title">
  <div class="panel-heading">
    <h2 id="access-guide-title">Recommended access</h2>
    <p>How to use the studio safely and publish changes online.</p>
  </div>

  <ul>
    <li>
      <strong>Local only.</strong>
      Start with <code>npm run studio:launch</code> from the site folder. Do not expose the dev server on your network.
    </li>
    <li>
      <strong>Production is read-only.</strong>
      <code>/studio</code> is disabled on the live Vercel site. Never set <code>ATELIER_STUDIO=1</code> in production.
    </li>
    <li>
      <strong>Preview first.</strong>
      Open <a href="/" target="_blank" rel="noreferrer">Preview</a> in another tab to check visitor-facing pages after each save.
    </li>
    <li>
      <strong>Publish when ready.</strong>
      Run <code>npm run publish -- --deploy</code> from the project folder to push changes to Vercel.
    </li>
    <li>
      <strong>Keep backups.</strong>
      Commit to Git (or copy the folder) before large edits. Photos live in <code>static/images/items/</code>.
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

  code {
    font-size: 0.88em;
    padding: 0.1rem 0.35rem;
    border-radius: 0.35rem;
    background: rgb(47 40 31 / 0.08);
  }

  a {
    color: #5a4632;
    font-weight: 600;
  }
</style>
