"use client";

import { Crosshair, Send, Tag } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Textarea } from "@/components/ui/Input";
import { MARKER_TYPES, TAGS_BY_TYPE } from "@/lib/constants";

type Props = {
  addMode: boolean;
  pendingCoords: [number, number] | null;
  type: string;
  comment: string;
  tags: string[];
  setType: (value: string) => void;
  setComment: (value: string) => void;
  setTags: (value: string[]) => void;
  onStartAdd: () => void;
  onSubmit: () => Promise<void>;
};

export function AddPostBox(props: Props) {
  const availableTags = TAGS_BY_TYPE[props.type] ?? [];

  function toggleTag(tag: string) {
    const has = props.tags.includes(tag);
    const next = has ? props.tags.filter((x) => x !== tag) : [...props.tags, tag];
    props.setTags(next);
  }

  return (
    <div className="ui-section">
      {/* Coords readout — премиальная dashed-зона */}
      <div
        className="flex items-center gap-2 rounded-[12px] px-3 py-2.5 text-[12px] transition-all duration-200"
        style={{
          background: props.pendingCoords ? "rgba(239, 68, 68, 0.08)" : "rgba(255, 255, 255, 0.66)",
          border: `1px dashed ${props.pendingCoords ? "var(--color-brand-accent)" : "var(--color-border-strong)"}`,
          color: props.pendingCoords ? "var(--color-brand-accent)" : "var(--color-ink-muted)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.72)"
        }}
      >
        <Crosshair
          className={`h-4 w-4 shrink-0 ${props.addMode ? "animate-pulse text-[color:var(--color-brand-accent)]" : ""}`}
          aria-hidden
        />
        {props.pendingCoords ? (
          <span className="ui-mono truncate text-[12px] font-semibold">
            {props.pendingCoords[0].toFixed(5)}, {props.pendingCoords[1].toFixed(5)}
          </span>
        ) : (
          <span>{props.addMode ? "Кликните на карте, чтобы поставить точку" : "Нажмите «Выбрать точку» и кликните по карте"}</span>
        )}
      </div>

      <div className="grid gap-1.5">
        <span className="ui-eyebrow">Тип</span>
        <div className="flex flex-wrap gap-1.5">
          {MARKER_TYPES.map((value) => (
            <Chip key={value} active={props.type === value} onClick={() => props.setType(value)}>
              {value}
            </Chip>
          ))}
        </div>
      </div>

      {availableTags.length > 0 && (
        <div className="grid gap-1.5">
          <span className="ui-eyebrow flex items-center gap-1">
            <Tag className="h-3 w-3" aria-hidden />
            Теги
          </span>
          <div className="flex flex-wrap gap-1.5">
            {availableTags.map((tag) => (
              <Chip key={tag} active={props.tags.includes(tag)} onClick={() => toggleTag(tag)}>
                #{tag}
              </Chip>
            ))}
          </div>
        </div>
      )}

      <label className="grid gap-1">
        <span className="ui-eyebrow">Комментарий</span>
        <Textarea
          value={props.comment}
          onChange={(e) => props.setComment(e.target.value)}
          placeholder="Что важно знать другим водителям?"
          rows={2}
          aria-label="Комментарий"
        />
      </label>

      <div className="grid grid-cols-2 gap-2">
        <Button variant={props.addMode ? "warning" : "ghost"} onClick={props.onStartAdd}>
          <Crosshair className={`h-4 w-4 ${props.addMode ? "animate-pulse" : ""}`} aria-hidden />
          {props.addMode ? "Ожидаю клик…" : "Выбрать точку"}
        </Button>
        <Button variant="primary" onClick={props.onSubmit} disabled={!props.pendingCoords}>
          <Send className="h-4 w-4" aria-hidden />
          Опубликовать
        </Button>
      </div>
    </div>
  );
}
