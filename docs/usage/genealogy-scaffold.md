# Genealogy scaffold guide

The `genealogy` scaffold is a public, file-based starting point for a reviewed family history. It composes existing Atelier-Kit item records, metadata, galleries, document links and directed relationships with the shared visitor relationship graph.

Create a separate client site:

```bash
npm run site:scaffold -- ../family-archive --template genealogy
cd ../family-archive
npm install
```

The demo is fictional. Do not publish it unchanged.

## Template conventions and core capabilities

Each person is an ordinary file under `content/items/`. The scaffold uses relation types such as `parent` and `spouse`, and labels such as `Mother`, `Father`, `Wife` and `Husband`. Those words are template-owned editorial vocabulary, not Atelier-Kit enums or genealogy rules.

Core relationship behavior remains domain-neutral:

- every relation has a non-empty free-form `type` and an existing item `target`;
- a label is optional display copy;
- links are directed and no inverse is inferred;
- cycles, one-way links, spouse/lateral links and incomplete networks are valid;
- the graph is not required to be a tree.

The `/relationships` route calls the generic `projectItemRelationshipGraph()` projector and passes its `nodes` and `edges` to `RelationshipGraph` from `giadaware-ui-components/visitor`. Every projected node receives `/items/{id}` as its detail-page link. Atelier-Kit owns the surrounding page copy and localization; the vendored component is not customized.

## Replace the demo people

Use Studio → Items or edit YAML directly. A safe replacement sequence is:

1. Create the real person records first, with stable lowercase ids such as `ada-rossi`.
2. Add biographies, metadata and reviewed public media.
3. Add relations only after every target item exists.
4. Update `content/collections/family-archive.yaml` to reference the new ids, or replace/delete that collection.
5. Remove the five fictional item files and the unused file under `static/documents/genealogy/`.
6. Run validation before previewing or publishing.

To remove all demo people at once, first add at least one replacement item because the supported content workflow requires a non-empty item catalog. Then replace or remove the demo collection so it has no stale ids. Items without relations are valid: the relationship route renders them as disconnected nodes, and the automatic menu link and sitemap entry hide when no edges remain. The genealogy scaffold also adds an explicit relationship link to `config/footer.yaml`; keep it if visitors should still reach the disconnected overview, or remove it with the demo relationships. No demo id is hard-coded in the route or projector.

## Person detail content

The demo maps family-history content onto generic item fields:

- `title` — public display name;
- `subtitle` — concise lifespan and place summary;
- `description` — biography, source caveats and uncertainty notes;
- `meta` — nested dates, places, occupations or any other editorial facts;
- `images` — portrait and gallery files under `static/images/items/` with useful alt text;
- `preview` — one public document link, for example a transcript or reviewed scan under `static/documents/`;
- `relations` — related people by item id.

Replace `/images/items/placeholder.svg` with real reviewed images. Replace the shared fictional archive note with an appropriate public document, or remove `preview` from records that should not expose one. Atelier-Kit does not verify historical claims or source rights.

## Privacy for living people

The generated visitor site is public. Atelier-Kit does not provide authentication, member accounts or a private family portal.

Before publishing a living person:

- obtain informed consent for the exact text, images and documents;
- prefer approximate years or broad places when exact values are unnecessary;
- omit home addresses, personal contact details, identity numbers, medical information and other sensitive facts;
- verify that every photograph and source document is cleared for public use;
- remove records when consent is withdrawn;
- ask an appropriate privacy or legal professional when the publication risk is unclear.

Keep unreviewed research outside the public site. A Vercel preview URL is still an online copy and must not be treated as access control.

## Validation, build and publication

Run the focused content checks after every replacement pass:

```bash
npm run content:validate
npm run item:validate
npm run content:doctor -- --strict
npm run check
npm run build
```

Fix missing targets, collection references, images and placeholder warnings before publication. Preview every `/items/{id}` page and `/relationships`, including keyboard navigation and narrow screens.

When the reviewed site is ready:

```bash
npm run publish
```

Follow `DEPLOY.md` or [`deploy-vercel.md`](deploy-vercel.md) to publish the generated client repository. Set `site.url` in `config/site.yaml` to the production domain before launch.

## Explicit non-goals

The scaffold does not add:

- a genealogy database or runtime service;
- genealogy-specific loaders, validation rules or core data structures;
- GEDCOM import or export;
- authentication or a private family portal;
- automatic relationship inference, biological rules or strict-tree enforcement;
- historical verification, consent management or document-rights review.

Use a specialist research system outside Atelier-Kit when those capabilities are required, and publish only the reviewed public subset here.
