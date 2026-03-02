export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const lat = searchParams.get('lat')
  const lng = searchParams.get('lng')

  if (!lat || !lng) {
    return Response.json({ error: 'Missing lat/lng' }, { status: 400 })
  }

  // Reverse geocode to get city name
  const geoRes = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
    { headers: { 'User-Agent': 'CaddieApp/1.0' } }
  )
  const geoData = await geoRes.json()
  const city = geoData.address?.city || geoData.address?.town || geoData.address?.village || geoData.address?.county || ''

  if (!city) return Response.json({ courses: [] })

  const res = await fetch(
    `https://api.golfcourseapi.com/v1/search?search_query=${encodeURIComponent(city)}`,
    { headers: { Authorization: `Key ${process.env.GOLF_API_KEY}` } }
  )

  if (!res.ok) return Response.json({ courses: [] })

  const data = await res.json()
  return Response.json({ courses: data.courses || [] })
}
