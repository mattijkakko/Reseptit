const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Password',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS });
    }

    const password = request.headers.get('X-Auth-Password') || '';
    if (!env.AUTH_PASSWORD || password !== env.AUTH_PASSWORD) {
      return json({ error: 'Luvaton pyyntö' }, 401);
    }

    const { pathname } = new URL(request.url);

    if (pathname === '/verify') {
      return json({ ok: true });
    }

    if (pathname === '/analyze' && request.method === 'POST') {
      let messages;
      try {
        ({ messages } = await request.json());
      } catch {
        return json({ error: 'Virheellinen pyyntö' }, 400);
      }

      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 2048,
          messages,
        }),
      });

      const data = await resp.json();
      return json(data, resp.status);
    }

    return json({ error: 'Ei löydy' }, 404);
  },
};
