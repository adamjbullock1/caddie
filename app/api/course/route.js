export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return Response.json({ error: 'Missing id' }, { status: 400 });
  }

  const res = await fetch(
    `https://api.golfcourseapi.com/v1/courses/${encodeURIComponent(id)}`,
    { headers: { Authorization: `Key ${process.env.GOLF_API_KEY}` } }
  );

  if (!res.ok) {
    return Response.json({ error: `API error ${res.status}` }, { status: res.status });
  }

  const data = await res.json();
  console.log('Golf API course response:', JSON.stringify(data).slice(0, 2000));
  return Response.json(data);
}
