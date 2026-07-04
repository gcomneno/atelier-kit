# Recipe: private preview before public launch

Use this recipe to review a customized showcase before announcing it publicly.

Atelier-Kit does not include authentication or private content controls.

Use your hosting platform workflow for private previews.

## Recommended workflow

## 1. Work on a branch

```bash
git checkout -b preview/custom-showcase
```

## 2. Replace demo content

Edit:

```text
config/site.yaml
config/contact.yaml
config/signal-clouds.yaml
content/items/
content/collections/
static/images/items/
```

## 3. Run local checks

```bash
npm run item:list
npm run content:validate
npm run content:doctor
npm run check
npm run build
```

## 4. Push the branch

```bash
git push -u origin preview/custom-showcase
```

Use the preview deployment created by your hosting workflow.

## 5. Review manually

Check:

- homepage;
- collection index;
- collection detail pages;
- every item detail page;
- images;
- Signal Cloud choices;
- Visitor Brief copy;
- contact actions.

## 6. Merge when ready

After review, merge into the main branch and deploy publicly.

## Important boundary

Do not put confidential content into the repo unless the repository and deployment workflow are private.
