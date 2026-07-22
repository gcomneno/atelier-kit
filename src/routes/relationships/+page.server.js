import { projectItemRelationshipGraph } from '$lib/item-relationship-graph.js';
import { getItems, getSiteConfig } from '$lib/server/showcase.js';

/** @type {import('./$types').PageServerLoad} */
export function load() {
  const graph = projectItemRelationshipGraph(getItems());

  return {
    site: getSiteConfig(),
    graph
  };
}
