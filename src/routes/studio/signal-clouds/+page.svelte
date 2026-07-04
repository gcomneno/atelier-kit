<script>
  import { enhance } from '$app/forms';

  let { data, form } = $props();

  const clouds = $derived(form?.clouds ?? data.clouds);
</script>

<svelte:head>
  <title>Studio · Signal Clouds</title>
</svelte:head>

<p class="intro">
  Edit visitor questions and answer labels. Question ids and answer ids stay fixed so existing item pages remain stable.
</p>

<section class="panel">
  <form method="POST" action="?/saveSignalClouds" use:enhance class="studio-form">
    {#each clouds as cloud, cloudIndex}
      <fieldset>
        <legend>{cloud.id}</legend>

        <label>
          Question
          <input name={`cloud_${cloudIndex}_question`} value={cloud.question} required />
        </label>

        <label>
          Hint
          <input name={`cloud_${cloudIndex}_hint`} value={cloud.hint} />
        </label>

        {#each cloud.options as option, optionIndex}
          <label>
            Answer · {option.id}
            <input
              name={`cloud_${cloudIndex}_option_${optionIndex}_label`}
              value={option.label}
              required
            />
          </label>
        {/each}
      </fieldset>
    {/each}

    <div class="actions">
      <button type="submit">Save Signal Clouds</button>
    </div>

    {#if form?.cloudMessage}
      <p class={`status ${form.cloudStatus || 'info'}`}>{form.cloudMessage}</p>
    {/if}
  </form>
</section>

<style>
  .intro {
    margin: 0 0 1.5rem;
    color: #5a4632;
    line-height: 1.6;
  }

  .panel {
    padding: 1.5rem;
    border: 1px solid rgb(47 40 31 / 0.12);
    border-radius: 1rem;
    background: rgb(255 250 242 / 0.82);
  }

  .studio-form {
    display: grid;
    gap: 1.25rem;
  }

  fieldset {
    margin: 0;
    padding: 0 0 1rem;
    border: 0;
    border-bottom: 1px solid rgb(47 40 31 / 0.1);
    display: grid;
    gap: 0.85rem;
  }

  legend {
    margin-bottom: 0.25rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-size: 0.85rem;
    color: #7d684f;
  }

  label {
    display: grid;
    gap: 0.4rem;
    font-size: 0.95rem;
  }

  input {
    width: 100%;
    padding: 0.7rem 0.8rem;
    border: 1px solid rgb(47 40 31 / 0.18);
    border-radius: 0.65rem;
    background: #fffdf9;
    color: inherit;
    font: inherit;
  }

  button {
    border: 0;
    border-radius: 999px;
    padding: 0.75rem 1.2rem;
    background: #2f281f;
    color: #f8f0e4;
    font: inherit;
    cursor: pointer;
  }

  .status {
    margin: 0;
    padding: 0.85rem 1rem;
    border-radius: 0.75rem;
    white-space: pre-wrap;
    line-height: 1.5;
  }

  .status.success {
    background: rgb(56 102 65 / 0.12);
    color: #2f4f35;
  }

  .status.warning {
    background: rgb(158 106 33 / 0.14);
    color: #6a4a1b;
  }

  .status.error {
    background: rgb(132 46 46 / 0.12);
    color: #6d2a2a;
  }
</style>
