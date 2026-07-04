<script>
  let { data } = $props();
</script>

<svelte:head>
  <title>Studio · Collections</title>
</svelte:head>

<p class="intro">
  Choose a collection to edit its title, description and included items.
</p>

<section class="panel">
  <div class="panel-heading">
    <h2>Collections</h2>
    <p>{data.collections.length} collection file(s) in content/collections/</p>
  </div>

  {#if data.collections.length === 0}
    <p class="empty">No collections found. Add a YAML file under content/collections/.</p>
  {:else}
    <ul class="record-list">
      {#each data.collections as collection}
        <li>
          <a href={`/studio/collections/${collection.id}`}>
            <strong>{collection.title}</strong>
            <span>{collection.id}</span>
            <span>{collection.itemCount} item(s)</span>
          </a>
        </li>
      {/each}
    </ul>
  {/if}
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

  .panel-heading h2 {
    margin: 0 0 0.35rem;
    font-size: 1.2rem;
  }

  .panel-heading p {
    margin: 0 0 1rem;
    color: #7d684f;
  }

  .empty {
    margin: 0;
    color: #5a4632;
  }

  .record-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 0.75rem;
  }

  .record-list a {
    display: grid;
    gap: 0.2rem;
    padding: 0.9rem 1rem;
    border-radius: 0.75rem;
    background: #fffdf9;
    border: 1px solid rgb(47 40 31 / 0.08);
    text-decoration: none;
  }

  .record-list span {
    color: #7d684f;
    font-size: 0.9rem;
  }
</style>
