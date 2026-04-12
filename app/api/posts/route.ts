import { NextRequest, NextResponse } from "next/server";
import { createPost, getPostsWithStats } from "@/server/posts";
import { routeError } from "@/server/errors";
import { getRequestUser, requireUser } from "@/server/session";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = getRequestUser(request);
    const posts = await getPostsWithStats(user?.id);
    return NextResponse.json({ posts });
  } catch (error) {
    return routeError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = requireUser(request);
    const body = (await request.json()) as Partial<PostInput>;
    const post = await createPost(
      {
        title: body.title ?? "",
        address: body.address ?? "",
        latitude: Number(body.latitude),
        longitude: Number(body.longitude),
        type: body.type!,
        comment: body.comment ?? "",
        tags: body.tags ?? [],
        street_geometry: body.street_geometry
      },
      user.id
    );
    return NextResponse.json({ success: true, post }, { status: 201 });
  } catch (error) {
    return routeError(error);
  }
}
