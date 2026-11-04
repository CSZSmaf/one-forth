/** Rejects the retired endpoint without exposing editorial records. */
export async function GET(): Promise<Response> {
  return Response.json(
    { error: "Not found" },
    {
      status: 404,
      headers: { "Cache-Control": "private, no-store" },
    },
  );
}
