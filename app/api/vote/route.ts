import { NextRequest, NextResponse } from "next/server";
import { canVote, submitVote } from "@/server/votes";
import { HttpError, routeError } from "@/server/errors";
import { requireUser } from "@/server/session";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const user = requireUser(request);
    const postId = body.post_id as string;
    const voteType = body.vote_type as "relevant" | "irrelevant";
    const deviceId = user.id ?? body.device_id;
    if (!postId || !deviceId || !voteType) {
      throw new HttpError(400, "Отсутствуют обязательные поля: post_id, device_id, vote_type");
    }
    if (!["relevant", "irrelevant"].includes(voteType)) {
      throw new HttpError(400, 'vote_type должен быть "relevant" или "irrelevant"');
    }
    const allowed = await canVote(postId, deviceId);
    if (!allowed) {
      return NextResponse.json(
        { error: "Вы уже голосовали за этот пост. Попробуйте через 10 минут.", retry_after: 600 },
        { status: 429 }
      );
    }
    const vote = await submitVote(postId, deviceId, voteType);
    return NextResponse.json({ success: true, vote, message: "Голос принят" });
  } catch (error) {
    return routeError(error);
  }
}
