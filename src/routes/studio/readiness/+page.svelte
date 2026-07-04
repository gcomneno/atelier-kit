<script>
  let { data } = $props();
</script>

<svelte:head>
  <title>Studio · Publish readiness</title>
</svelte:head>

<p class="intro">
  Content Doctor checks for placeholder text, missing images and other pre-launch notes in plain language.
  Run the publish script when you are ready to build and deploy.
</p>

<section class="panel">
  <div class="panel-heading">
    <h2>Content Doctor</h2>
    <p class={data.report.ok ? 'ok' : 'review'}>
      {data.report.ok ? 'Nothing obvious to review.' : 'Review the notes below before publishing.'}
    </p>
  </div>

  <pre class="report">{data.report.output}</pre>
</section>

<section class="panel">
  <div class="panel-heading">
    <h2>Publish commands</h2>
    <p>From the project folder:</p>
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
