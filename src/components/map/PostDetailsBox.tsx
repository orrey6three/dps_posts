"use client";

import { formatDate, formatUsername } from "@/lib/format";
import type { AuthUser, PostRow } from "@/types/models";

type Props = {
  post: PostRow | null;
  user: AuthUser | null;
  onVote: (vote: "relevant" | "irrelevant") => Promise<void>;
  onDelete: () => Promise<void>;
};

export function PostDetailsBox({ post, user, onVote, onDelete }: Props) {
  if (!post) {
    return (
      <div className="card">
        <h3>Детали метки</h3>
        <p className="muted">Кликните на маркер на карте.</p>
      </div>
    );
  }

  const canDelete = Boolean(user && (user.role === "admin" || user.id === post.user_id));

  return (
    <div className="card">
      <h3>{post.type}</h3>
      <p>{post.comment || "Без комментария"}</p>
      <p className="muted">{post.address || "Без адреса"}</p>
      <p className="muted">Создал: {formatUsername(post.username)}</p>
      <p className="muted">Создано: {formatDate(post.created_at)}</p>
      <p className="muted">
        Голоса: ✅ {post.relevant_count} · ❌ {post.irrelevant_count}
      </p>
      {post.tags?.length ? <p className="muted">{post.tags.map((tag) => `#${tag}`).join(" ")}</p> : null}
      <div className="row">
        <button className="button button-primary" onClick={() => onVote("relevant")}>
          Актуально
        </button>
        <button className="button button-soft" onClick={() => onVote("irrelevant")}>
          Не актуально
        </button>
        {canDelete && (
          <button className="button button-danger" onClick={onDelete}>
            Удалить
          </button>
        )}
      </div>
    </div>
  );
}
