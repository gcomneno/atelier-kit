import { redirect } from '@sveltejs/kit';

/** @type {import('./$types').RequestHandler} */
export function GET() {
  redirect(308, '/favicon.svg');
}
