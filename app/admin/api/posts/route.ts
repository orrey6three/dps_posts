import { NextRequest, NextResponse } from "next/server";
import { getAllPosts, createPost } from "@/server/posts";
import { requireAdmin } from "@/server/session";
import { routeError } from "@/server/errors";
import { supabaseAdmin } from "@/server/db";
import type { PostInput } from "@/types/models";
import { getPostVoteStats } from "@/server/votes";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    requireAdmin(request);
    const posts = await getAllPosts();
    const postsWithStats = await Promise.all(
      posts.map(async (post) => ({ ...post, stats: await getPostVoteStats(post.id) }))
    );
    return NextResponse.json({ posts: postsWithStats });
  } catch (error) {
    return routeError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = requireAdmin(request);
    const body = (await request.json()) as Partial<PostInput>;
    const adminId =
      user.id === "admin"
        ? (await supabaseAdmin.from("users").select("id").eq("username", "admin").single()).data?.id
        : user.id;
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
