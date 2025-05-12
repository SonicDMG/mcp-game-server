import { StoryDO } from './do/story';

/**
 * Welcome to Cloudflare Workers! This is your first Durable Objects application.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your Durable Object in action
 * - Run `npm run deploy` to publish your application
 *
 * Bind resources to your worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/durable-objects
 */

interface Env {
	StoryDO: DurableObjectNamespace;
}

export { StoryDO };

export default {
	/**
	 * This is the standard fetch handler for a Cloudflare Worker
	 *
	 * @param request - The request submitted to the Worker from the client
	 * @param env - The interface to reference bindings declared in wrangler.jsonc
	 * @returns The response to be sent back to the client
	 */
	async fetch(request: Request, env: Env) {
		const url = new URL(request.url);
		if (url.pathname.startsWith('/story/')) {
			const storyId = url.pathname.split('/')[2];
			const id = env.StoryDO.idFromName(storyId);
			const obj = env.StoryDO.get(id);
			return obj.fetch(request);
		}
		return new Response('Not found', { status: 404 });
	},
} satisfies ExportedHandler<Env>;
