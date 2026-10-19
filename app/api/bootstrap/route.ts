// Initialization runs only in the container entrypoint.
export async function POST() {
  return Response.json({ error: "Inisialisasi hanya tersedia melalui server" }, { status: 403 });
}
