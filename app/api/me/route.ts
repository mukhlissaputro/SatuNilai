import { apiError, requireUser } from "../_security";

export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    return Response.json({ user }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiError(error); }
}
