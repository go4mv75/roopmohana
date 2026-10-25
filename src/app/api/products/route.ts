import { NextResponse, type NextRequest } from "next/server";
import { getCardsByIds } from "@/lib/catalog";

/** Product cards by id — used by the wishlist (ids are stored in the browser). */
export async function GET(req: NextRequest) {
  const ids = (req.nextUrl.searchParams.get("ids") ?? "")
    .split(",")
    .map(Number)
    .filter((n) => Number.isInteger(n) && n > 0)
    .slice(0, 60);
  return NextResponse.json(await getCardsByIds(ids));
}
