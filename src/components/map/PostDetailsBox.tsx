"use client";

import { CalendarClock, MapPin, MousePointerClick, ThumbsDown, ThumbsUp, Trash2, UserCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatDate, formatUsername } from "@/lib/format";
import type { AuthUser, PostRow } from "@/types/models";

type Props = {
  post: PostRow | null;
  user: AuthUser | null;
  onVote: (vote: "relevant" | "irrelevant") => Promise<void>;
  onDelete: () => Promise<void>;
};

const TYPE_COLOR: Record<string, { fg: string; bg: string }> = {
  "Патруль":      { fg: "var(--color-type-patrol)",   bg: "var(--color-type-patrol-bg)" },
  "ДПС":          { fg: "var(--color-type-patrol)",   bg: "var(--color-type-patrol-bg)" },
  "Нужна помощь": { fg: "var(--color-type-help)",     bg: "var(--color-type-help-bg)" },
  "Чисто":        { fg: "var(--color-type-clear)",    bg: "var(--color-type-clear-bg)" },
  "Вопрос":       { fg: "var(--color-type-question)", bg: "var(--color-type-question-bg)" }
};

export function PostDetailsBox({ post, user, onVote, onDelete }: Props) {
  if (!post) {
    return (
      <div className="ui-section">
        <div
          className="flex items-center gap-2 rounded-[var(--radius-xl)] px-3 py-6 text-[13px] ui-soft justify-center text-center"
          style={{ background: "var(--color-surface-2)", border: "1px dashed var(--color-border-strong)" }}
        >
          <MousePointerClick className="h-4 w-4 shrink-0" aria-hidden />
          Кликните на маркер на карте.
        </div>
      </div>
    );
  }

  const canDelete = Boolean(user && (user.role === "admin" || user.id === post.user_id));
  const typeColor = TYPE_COLOR[post.type] ?? { fg: "var(--color-ink-muted)", bg: "var(--color-surface-2)" };

  return (
    <div className="ui-section">
      {/* Header line: тип-pill + кто+когда */}
      <div className="flex items-start justify-between gap-2">
        <span
          className="inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-bold"
          style={{
            background: typeColor.bg,
            color: typeColor.fg,
            border: "1px solid rgba(255,255,255,0.76)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.68)"
          }}
        >
          {post.type}
        </span>
        <span className="ui-soft ui-mono shrink-0 text-[11px]">{formatDate(post.created_at)}</span>
      </div>

      {/* Comment */}
      {post.comment ? (
        <p className="text-[14px] leading-relaxed text-[color:var(--color-ink)]">{post.comment}</p>
      ) : (
        <p className="ui-soft text-[13px] italic">Без комментария</p>
      )}

      {/* Meta rows */}
      <dl className="grid gap-1.5 text-[12px]">
        <div className="flex items-start gap-2 ui-muted">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[color:var(--color-brand-accent)]" aria-hidden />
          <span>{post.address || "Без адреса"}</span>
        </div>
        <div className="flex items-start gap-2 ui-muted">
          <UserCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[color:var(--color-brand-accent)]" aria-hidden />
          <span>{formatUsername(post.username)}</span>
        </div>
      </dl>

      {/* Vote stats — bold, KPI-style */}
      <div className="grid grid-cols-2 gap-2">
        <div
          className="flex items-center justify-between rounded-[var(--radius-xl)] px-3 py-2.5"
          style={{
            background: "var(--color-success-tint)",
            color: "var(--color-success)",
            border: "1px solid rgba(4,120,87,0.1)"
          }}
        >
          <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold">
            <ThumbsUp className="h-3.5 w-3.5" aria-hidden />
            Актуально
          </span>
          <strong className="ui-mono text-[18px] font-bold leading-none">{post.relevant_count}</strong>
        </div>
        <div
          className="flex items-center justify-between rounded-[var(--radius-xl)] px-3 py-2.5"
          style={{
            background: "var(--color-danger-tint)",
            color: "var(--color-danger)",
            border: "1px solid rgba(185,28,28,0.1)"
          }}
        >
          <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold">
            <ThumbsDown className="h-3.5 w-3.5" aria-hidden />
            Неактуально
          </span>
          <strong className="ui-mono text-[18px] font-bold leading-none">{post.irrelevant_count}</strong>
        </div>
      </div>

      {(post.relevant_count > 0 && post.last_relevant) ||
      (post.irrelevant_count > 0 && post.last_irrelevant) ||
      post.last_activity ? (
        <div
          className="rounded-[var(--radius-xl)] border border-[color:var(--color-border)] px-3 py-2.5 text-[12px] leading-snug"
          style={{ background: "rgba(255,255,255,0.52)" }}
        >
          <div className="mb-1.5 inline-flex items-center gap-1.5 ui-eyebrow">
            <CalendarClock className="h-3.5 w-3.5 text-[color:var(--color-brand-deep)]" aria-hidden />
            Когда голосовали
          </div>
          <ul className="grid gap-1 text-[11px]" style={{ color: "var(--color-ink-muted)" }}>
            {post.relevant_count > 0 && post.last_relevant ? (
              <li>
                <span className="font-semibold text-[color:var(--color-success)]">Актуально</span>
                {" — "}
                <span className="ui-mono">{formatDate(post.last_relevant)}</span>
              </li>
            ) : null}
            {post.irrelevant_count > 0 && post.last_irrelevant ? (
              <li>
                <span className="font-semibold text-[color:var(--color-danger)]">Неактуально</span>
                {" — "}
                <span className="ui-mono">{formatDate(post.last_irrelevant)}</span>
              </li>
            ) : null}
            {post.last_activity ? (
              <li className="mt-1 border-t border-[color:var(--color-border)] pt-1.5">
                Последний голос:{" "}
                <span className="ui-mono">{formatDate(post.last_activity)}</span>
                {post.last_voter_username ? (
                  <>
                    {" · "}
                    {formatUsername(post.last_voter_username)}
                    {post.last_vote_type === "relevant"
                      ? " · актуально"
                      : post.last_vote_type === "irrelevant"
                        ? " · неактуально"
                        : ""}
                  </>
                ) : null}
              </li>
            ) : null}
          </ul>
        </div>
      ) : null}

      {post.tags?.length ? (
        <div className="flex flex-wrap gap-1.5">
          {post.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full px-2 py-0.5 text-[11px] font-medium"
              style={{
                background: "rgba(33, 24, 47, 0.055)",
                color: "var(--color-ink)",
                border: "1px solid rgba(33, 24, 47, 0.06)"
              }}
            >
              #{tag}
            </span>
          ))}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        <Button variant="primary" onClick={() => onVote("relevant")}>
          <ThumbsUp className="h-4 w-4" aria-hidden />
          Актуально
        </Button>
        <Button variant="ghost" onClick={() => onVote("irrelevant")}>
          <ThumbsDown className="h-4 w-4" aria-hidden />
          Неактуально
        </Button>
      </div>
      {canDelete && (
        <Button variant="danger" onClick={onDelete} className="w-full">
          <Trash2 className="h-4 w-4" aria-hidden />
          Удалить метку
        </Button>
      )}
    </div>
  );
}
