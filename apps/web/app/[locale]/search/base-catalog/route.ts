import { isPublishedLocale } from "@one-forth/config";
import { publicSearchSchemaVersion } from "@one-forth/search/client";
import { createSearchCatalog } from "@/lib/catalog";

interface BaseSearchCatalogRouteContext {
  readonly params: Promise<{ locale: string }>;
}

export async function GET(
  request: Request,
  { params }: BaseSearchCatalogRouteContext,
): Promise<Response> {
  const { locale } = await params;
  if (!isPublishedLocale(locale)) {
    return Response.json({ error: "Unsupported locale" }, { status: 404 });
  }

  const requestedSchema = new URL(request.url).searchParams.get("schema");
  if (requestedSchema !== String(publicSearchSchemaVersion)) {
    return Response.json(
      {
        error: "Search catalog schema version is required",
        currentSchema: publicSearchSchemaVersion,
      },
      {
        status: 410,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }

  return Response.json(await createSearchCatalog(locale), {
    headers: {
      "Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
      "X-One-Forth-Search-Schema": String(publicSearchSchemaVersion),
    },
  });
}
