export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) {
    return Response.json({ error: 'Missing query' }, { status: 400 });
  }

  const res = await fetch(
    `https://api.golfcourseapi.com/v1/search?search_query=${encodeURIComponent(query)}`,
    { headers: { Authorization: `Key ${process.env.GOLF_API_KEY}` } }
  );

  if (!res.ok) {
    return Response.json({ error: `API error ${res.status}` }, { status: res.status });
  }

  const data = await res.json();
  console.log('Golf API search response sample:', JSON.stringify((data.courses || data).slice?.(0,2) ?? data).slice(0, 2000));
  return Response.json(data);
}
