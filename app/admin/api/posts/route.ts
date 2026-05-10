import { NextRequest, NextResponse } from "next/server";
import { resolveAdminPostAuthorId } from "@/server/admin";
import { createPost, getAllPosts } from "@/server/posts";
import { requireAdmin } from "@/server/session";
import { routeError } from "@/server/errors";
import type { PostInput } from "@/types/models";
import { getVoteCountsBulk } from "@/server/votes";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    requireAdmin(request);
    const posts = await getAllPosts();
    const ids = posts.map((p) => p.id as string);
    const counts = await getVoteCountsBulk(ids);
    const postsWithStats = posts.map((post) => {
      const id = post.id as string;
      const c = counts[id] ?? { relevant: 0, irrelevant: 0 };
      return {
        ...post,
        stats: { relevant: c.relevant, irrelevant: c.irrelevant }
      };
    });
    return NextResponse.json({ posts: postsWithStats });
  } catch (error) {
    return routeError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = requireAdmin(request);
    const body = (await request.json()) as Partial<PostInput>;
    const adminId = await resolveAdminPostAuthorId(user.id);
    const post = await createPost(
      {
        title: body.title ?? "",
        address: body.address ?? "",
        latitude: Number(body.latitude),
        longitude: Number(body.longitude),
        type: body.type!,
        comment: body.comment ?? "",
        tags: body.tags ?? []
      },
      adminId ?? null
    );
    return NextResponse.json({ success: true, post });
  } catch (error) {
    return routeError(error);
  }
}
