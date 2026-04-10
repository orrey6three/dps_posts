import { NextRequest, NextResponse } from "next/server";
import { deletePost, updatePost } from "@/server/posts";
import { requireAdmin } from "@/server/session";
import { routeError } from "@/server/errors";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    requireAdmin(request);
    const { id } = await params;
    const updates = await request.json();
    const post = await updatePost(id, updates);
    return NextResponse.json({ success: true, post });
  } catch (error) {
    return routeError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    requireAdmin(request);
    const { id } = await params;
    await deletePost(id);
    return NextResponse.json({ success: true, message: "Пост удалён" });
  } catch (error) {
    return routeError(error);
  }
}
