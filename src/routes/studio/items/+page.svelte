<script>
  let { data } = $props();
</script>

<svelte:head>
  <title>Studio · Items</title>
</svelte:head>

<p class="intro">
  Choose an item to edit, or create a new one for the catalog.
</p>

<section class="panel">
  <div class="panel-heading">
    <h2>Items</h2>
    <p>{data.items.length} item file(s) in content/items/</p>
    <p class="create-link"><a href="/studio/items/new">+ Create new item</a></p>
  </div>

  {#if data.items.length === 0}
    <p class="empty">No items yet. <a href="/studio/items/new">Create your first item</a>.</p>
  {:else}
    <ul class="record-list">
      {#each data.items as item}
        <li>
          <a href={`/studio/items/${item.id}`}>
            <strong>{item.title}</strong>
            <span>{item.id}</span>
            {#if item.status}
              <span class="badge">{item.status}</span>
            {/if}
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

  .create-link {
    margin: 0;
  }

  .create-link a {
    color: #5a4632;
    font-weight: 600;
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

  .badge {
    display: inline-block;
    width: fit-content;
    margin-top: 0.25rem;
    padding: 0.15rem 0.5rem;
    border-radius: 999px;
    background: rgb(47 40 31 / 0.08);
    font-size: 0.8rem;
  }
</style>
