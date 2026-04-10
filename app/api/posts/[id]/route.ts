import { NextRequest, NextResponse } from "next/server";
import { deletePost, getPostOwner } from "@/server/posts";
import { HttpError, routeError } from "@/server/errors";
import { requireUser } from "@/server/session";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const user = requireUser(request);
    const ownerId = await getPostOwner(id);
    if (ownerId !== user.id && user.role !== "admin") {
      throw new HttpError(403, "Нет прав для удаления этой метки");
    }
    await deletePost(id);
    return NextResponse.json({ success: true, message: "Метка удалена" });
  } catch (error) {
    return routeError(error);
  }
}
