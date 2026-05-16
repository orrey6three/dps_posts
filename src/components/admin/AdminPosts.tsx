"use client";

import { useState } from "react";
import { MapPin, Pencil, Save, ThumbsDown, ThumbsUp, Trash2, Vote, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { MARKER_TYPES } from "@/lib/constants";

type Post = {
  id: string;
  title: string;
  address: string;
  latitude: number;
  longitude: number;
  type: string;
  comment?: string;
  stats?: { relevant: number; irrelevant: number };
};

type Draft = {
  id?: string;
  type: string;
  address: string;
  latitude: string;
  longitude: string;
  comment: string;
};

type Props = {
  posts: Post[];
  onSave: (draft: Draft) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onClearVotes: (id: string) => Promise<void>;
};

const EMPTY_DRAFT: Draft = { type: "ДПС", address: "", latitude: "55.2255", longitude: "63.2982", comment: "" };

export function AdminPosts({ posts, onSave, onDelete, onClearVotes }: Props) {
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);

  function edit(post: Post) {
    setDraft({
      id: post.id,
      type: post.type,
      address: post.address ?? "",
      latitude: String(post.latitude),
      longitude: String(post.longitude),
      comment: post.comment ?? ""
    });
  }

  return (
    <div className="grid gap-3 lg:grid-cols-[340px_1fr]">
      <Card
        title={draft.id ? "Редактировать метку" : "Новая метка"}
        icon={
          draft.id ? (
            <Pencil className="h-4 w-4 text-[color:var(--color-brand-accent)]" aria-hidden />
          ) : (
            <MapPin className="h-4 w-4 text-[color:var(--color-brand-accent)]" aria-hidden />
          )
        }
      >
        <label className="grid gap-1 text-xs">
          <span className="ui-eyebrow">Тип</span>
          <Select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })}>
            {MARKER_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </Select>
        </label>

        <label className="grid gap-1 text-xs">
          <span className="ui-eyebrow">Адрес</span>
          <Input
            value={draft.address}
            onChange={(e) => setDraft({ ...draft, address: e.target.value })}
            placeholder="Шумиха, ул. Ленина"
          />
        </label>

        <div className="grid grid-cols-2 gap-2">
          <label className="grid gap-1 text-xs">
            <span className="ui-eyebrow">Широта</span>
            <Input
              inputMode="decimal"
              value={draft.latitude}
              onChange={(e) => setDraft({ ...draft, latitude: e.target.value })}
              placeholder="55.2255"
              className="ui-mono"
            />
          </label>
          <label className="grid gap-1 text-xs">
            <span className="ui-eyebrow">Долгота</span>
            <Input
              inputMode="decimal"
              value={draft.longitude}
              onChange={(e) => setDraft({ ...draft, longitude: e.target.value })}
              placeholder="63.2982"
              className="ui-mono"
            />
          </label>
        </div>

        <label className="grid gap-1 text-xs">
          <span className="ui-eyebrow">Комментарий</span>
          <Textarea
            value={draft.comment}
            onChange={(e) => setDraft({ ...draft, comment: e.target.value })}
            placeholder="Комментарий"
          />
        </label>

        <div className="flex gap-2">
          <Button
            variant="primary"
            onClick={() => onSave(draft).then(() => setDraft(EMPTY_DRAFT))}
            className="flex-1"
          >
            <Save className="h-4 w-4" aria-hidden />
            Сохранить
          </Button>
          {draft.id && (
            <Button variant="ghost" onClick={() => setDraft(EMPTY_DRAFT)}>
              <X className="h-4 w-4" aria-hidden />
              Отмена
            </Button>
          )}
        </div>
      </Card>

      <Card title="Метки" icon={<MapPin className="h-4 w-4 text-[color:var(--color-brand-accent)]" aria-hidden />}>
        {posts.length === 0 ? (
          <p className="ui-muted text-sm">Пока нет меток.</p>
        ) : (
          <ul className="flex flex-col divide-y" style={{ borderColor: "var(--color-hairline)" }}>
            {posts.map((post) => (
              <li key={post.id} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
                <div className="flex items-center justify-between gap-2">
                  <strong className="text-[14px] tracking-normal">{post.type}</strong>
                  <div className="flex items-center gap-1.5 text-[12px]">
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5"
                      style={{ background: "var(--color-success-tint)", color: "var(--color-success)" }}
                    >
                      <ThumbsUp className="h-3 w-3" aria-hidden />
                      <span className="ui-mono">{post.stats?.relevant ?? 0}</span>
                    </span>
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5"
                      style={{ background: "var(--color-danger-tint)", color: "var(--color-danger)" }}
                    >
                      <ThumbsDown className="h-3 w-3" aria-hidden />
                      <span className="ui-mono">{post.stats?.irrelevant ?? 0}</span>
                    </span>
                  </div>
                </div>
                <span className="ui-muted text-[12px]">{post.address || "Без адреса"}</span>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="warning"
                    onClick={() => {
                      if (confirm("Удалить все голоса по этой метке?")) void onClearVotes(post.id);
                    }}
                  >
                    <Vote className="h-4 w-4" aria-hidden />
                    Голоса
                  </Button>
                  <Button variant="ghost" onClick={() => edit(post)}>
                    <Pencil className="h-4 w-4" aria-hidden />
                    Изменить
                  </Button>
                  <Button variant="danger" onClick={() => onDelete(post.id)}>
                    <Trash2 className="h-4 w-4" aria-hidden />
                    Удалить
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
