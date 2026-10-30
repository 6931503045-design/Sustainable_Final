export const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8' } });

export const fail = (message, status = 400) => json({ error: message }, status);

export const originOf = (request) => {
  const u = new URL(request.url);
  const proto = request.headers.get('x-forwarded-proto') || u.protocol.replace(':', '');
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || u.host;
  return `${proto}://${host}`;
};

export async function body(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}
