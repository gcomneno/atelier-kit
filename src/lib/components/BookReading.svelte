<script>
  import EditorialText from '$lib/components/EditorialText.svelte';
  import { splitEditorialParagraphs } from '$lib/editorial-markup.js';
  import { linkifyPlainText, parseBookContent } from '$lib/book-content.js';

  /** @typedef {{ id: string, title: string, excerpt?: string, body: string }} NewsPost */

  /**
   * @type {{
   *   post: NewsPost,
   *   backHref?: string,
   *   backLabel: string
   * }}
   */
  let { post, backHref = '/news', backLabel } = $props();

  const blocks = $derived(parseBookContent(post.body));
</script>

<main class="book-reading">
  <a class="back-link" href={backHref}>{backLabel}</a>

  <div class="book-frame">
    <article class="book-page" aria-labelledby="book-title">
      <header class="book-colophon">
        {#if post.excerpt}
          {#each splitEditorialParagraphs(post.excerpt) as paragraph}<EditorialText tag="p" class="book-series" value={paragraph} />{/each}
        {/if}
        <h1 id="book-title" class="book-edition-title"><EditorialText value={post.title} /></h1>
      </header>

      <div class="book-body">
        {#each blocks as block, index (index)}
          {#if block.type === 'lead'}
            <p class="book-lead">{block.text}</p>
          {:else if block.type === 'intro'}
            <p class="book-intro">{block.text}</p>
          {:else if block.type === 'section-title'}
            <h2 class="book-section-title">{block.text}</h2>
          {:else if block.type === 'chapter-title'}
            <h2 class="book-chapter-title">{block.text}</h2>
          {:else if block.type === 'epigraph'}
            <p class="book-epigraph">{block.text}</p>
          {:else if block.type === 'dateline'}
            <p class="book-dateline">{block.text}</p>
          {:else if block.type === 'dialogue'}
            <p class="book-dialogue">{block.text}</p>
          {:else if block.type === 'staccato'}
            <p class="book-staccato">{block.text}</p>
          {:else if block.type === 'ornament'}
            <div class="book-ornament" aria-hidden="true">§</div>
          {:else if block.type === 'cta'}
            {@const linked = linkifyPlainText(block.text ?? '')}
            <p class="book-cta">
              {linked.before}
              {#if linked.url}
                <a href={linked.url} rel="noopener noreferrer" target="_blank">{linked.url}</a>
              {/if}
              {linked.after}
            </p>
          {:else if block.type === 'note'}
            <p class="book-note">{block.text}</p>
          {:else}
            <p class="book-paragraph" class:drop-cap={block.dropCap}>{block.text}</p>
          {/if}
        {/each}
      </div>
    </article>
  </div>
</main>

<style>
  .book-reading {
    width: min(100%, calc(42rem + 3rem));
    margin: 0 auto;
    padding: 1.5rem 1rem 4rem;
  }

  .back-link {
    display: inline-flex;
    margin: 0 0 1.5rem 0.25rem;
    color: color-mix(in srgb, var(--site-text-color, #e8e0d4) 78%, transparent);
    font-size: 0.92rem;
    letter-spacing: 0.04em;
    text-decoration: none;
  }

  .back-link:hover {
    color: var(--site-text-color, #e8e0d4);
    text-decoration: underline;
  }

  .book-frame {
    padding: 0.35rem;
    border-radius: 0.35rem;
    background: linear-gradient(
      145deg,
      color-mix(in srgb, var(--site-accent-color, #8c3a44) 28%, #1a1816),
      #0c0b0a 55%,
      color-mix(in srgb, var(--site-accent-color, #8c3a44) 18%, #121110)
    );
    box-shadow:
      0 28px 80px rgb(0 0 0 / 0.55),
      inset 0 1px 0 rgb(255 255 255 / 0.06);
  }

  .book-page {
    padding: clamp(2rem, 5vw, 3.25rem) clamp(1.5rem, 4.5vw, 2.75rem) clamp(2.5rem, 6vw, 3.75rem);
    border-radius: 0.2rem;
    color: #2b2219;
    background:
      linear-gradient(
        90deg,
        rgb(0 0 0 / 0.03),
        transparent 8%,
        transparent 92%,
        rgb(0 0 0 / 0.04)
      ),
      linear-gradient(180deg, #f7f0e6 0%, #efe5d6 100%);
    box-shadow: inset 0 0 0 1px rgb(255 255 255 / 0.35);
  }

  .book-colophon {
    margin-bottom: 2rem;
    padding-bottom: 1.35rem;
    border-bottom: 1px solid rgb(43 34 25 / 0.14);
    text-align: center;
  }

  :global(.book-series) {
    margin: 0 0 0.65rem;
    color: #6f5f4d;
    font-size: 0.82rem;
    font-style: italic;
    letter-spacing: 0.02em;
    line-height: 1.5;
  }

  .book-edition-title {
    margin: 0;
    color: #241c15;
    font-size: clamp(1.35rem, 3.5vw, 1.75rem);
    font-weight: 600;
    letter-spacing: 0.08em;
    line-height: 1.25;
    text-transform: uppercase;
  }

  .book-body {
    display: grid;
    gap: 0;
  }

  .book-lead {
    margin: 0 0 1.75rem;
    padding: 0.85rem 1rem;
    border-left: 3px solid color-mix(in srgb, var(--site-accent-color, #8c3a44) 72%, #6b2f38);
    color: #4f4033;
    font-size: 0.98rem;
    font-style: italic;
    line-height: 1.65;
    text-align: left;
  }

  .book-intro {
    margin: 0 0 1rem;
    color: #3f342a;
    font-size: clamp(1.02rem, 2.1vw, 1.12rem);
    line-height: 1.72;
    text-align: justify;
    text-indent: 0;
    text-wrap: pretty;
    hyphens: auto;
  }

  .book-section-title {
    margin: 1.5rem 0 1rem;
    color: #3a2f24;
    font-size: 1.05rem;
    font-style: italic;
    font-weight: 600;
    letter-spacing: 0.04em;
    line-height: 1.45;
    text-align: center;
  }

  .book-chapter-title {
    margin: 2rem 0 0.35rem;
    color: #241c15;
    font-size: clamp(1.8rem, 5vw, 2.35rem);
    font-variant: small-caps;
    font-weight: 600;
    letter-spacing: 0.06em;
    line-height: 1.1;
    text-align: center;
  }

  .book-epigraph {
    margin: 0.15rem 0 1rem;
    color: #5a4a3b;
    font-size: 1.05rem;
    font-style: italic;
    letter-spacing: 0.02em;
    line-height: 1.45;
    text-align: center;
  }

  .book-dateline {
    margin: 0 0 1.65rem;
    color: #756457;
    font-size: 0.92rem;
    font-style: italic;
    letter-spacing: 0.06em;
    line-height: 1.5;
    text-align: center;
  }

  .book-paragraph {
    margin: 0 0 1rem;
    color: #2b2219;
    font-size: clamp(1.08rem, 2.2vw, 1.18rem);
    line-height: 1.82;
    text-align: left;
    text-indent: 1.35em;
    text-wrap: pretty;
    hyphens: auto;
  }

  .book-paragraph.drop-cap {
    text-indent: 0;
  }

  .book-paragraph.drop-cap::first-letter {
    float: left;
    margin: 0.08em 0.12em 0 0;
    color: #241c15;
    font-size: 3.45em;
    font-weight: 600;
    line-height: 0.82;
  }

  .book-dialogue {
    margin: 0.35rem 0 0.85rem 1.2rem;
    color: #342920;
    font-size: clamp(1.02rem, 2.1vw, 1.12rem);
    font-style: italic;
    line-height: 1.65;
    text-align: left;
    text-indent: 0;
  }

  .book-staccato {
    margin: 0.15rem 0 0.35rem;
    color: #2b2219;
    font-size: clamp(1.02rem, 2.1vw, 1.12rem);
    line-height: 1.55;
    text-align: left;
    text-indent: 0;
  }

  .book-ornament {
    margin: 2rem auto;
    color: #8a7763;
    font-size: 1.1rem;
    letter-spacing: 0.35em;
    line-height: 1;
    text-align: center;
  }

  .book-cta,
  .book-note {
    margin: 0.75rem 0 0;
    color: #5f4f40;
    font-size: 0.95rem;
    line-height: 1.6;
    text-align: center;
    text-indent: 0;
  }

  .book-cta a {
    color: #6b2f38;
    font-weight: 600;
    word-break: break-word;
  }

  .book-note {
    font-size: 0.88rem;
    font-style: italic;
  }

  @media (min-width: 720px) {
    .book-page {
      min-height: 28rem;
    }
  }
</style>
