import favicon from '$lib/assets/favicon.svg?raw';

/** @type {import('./$types').RequestHandler} */
export function GET() {
  return new Response(favicon, {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=604800'
    }
  });
}
