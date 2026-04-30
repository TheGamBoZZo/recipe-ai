import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({}, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { itemId, checked } = body as Record<string, unknown>;

  if (typeof itemId !== "string" || itemId.length > 50)
    return NextResponse.json({ error: "Invalid itemId" }, { status: 400 });

  if (typeof checked !== "boolean")
    return NextResponse.json({ error: "checked must be boolean" }, { status: 400 });

  // Verify ownership — walk the chain to confirm this item belongs to the user
  const item = await prisma.groceryItem.findUnique({
    where: { id: itemId },
    include: { category: { include: { groceryList: true } } },
  });

  if (!item || item.category.groceryList.userId !== session.user.id)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.groceryItem.update({ where: { id: itemId }, data: { checked } });
  return NextResponse.json({ ok: true });
}
