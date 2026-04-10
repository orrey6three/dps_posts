"use client";

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
    <div className="card">
      <h3>Новая метка</h3>
      <p className="muted">
        {props.pendingCoords
          ? `Точка: ${props.pendingCoords[0].toFixed(5)}, ${props.pendingCoords[1].toFixed(5)}`
          : "Нажмите «Выбрать точку» и кликните по карте"}
      </p>
      <div className="row wrap">
        {MARKER_TYPES.map((value) => (
          <button
            key={value}
            className={`chip ${props.type === value ? "chip-active" : ""}`}
            onClick={() => props.setType(value)}
          >
            {value}
          </button>
        ))}
      </div>
      {availableTags.length > 0 && (
        <div className="row wrap">
          {availableTags.map((tag) => (
            <button
              key={tag}
              className={`chip ${props.tags.includes(tag) ? "chip-active" : ""}`}
              onClick={() => toggleTag(tag)}
            >
              #{tag}
            </button>
          ))}
        </div>
      )}
      <textarea
        className="input"
        value={props.comment}
        onChange={(e) => props.setComment(e.target.value)}
        placeholder="Комментарий (необязательно)"
      />
      <div className="row">
        <button className={`button ${props.addMode ? "button-warning" : "button-soft"}`} onClick={props.onStartAdd}>
          {props.addMode ? "Ожидаю клик…" : "Выбрать точку"}
        </button>
        <button className="button button-primary" onClick={props.onSubmit}>
          Опубликовать
        </button>
      </div>
    </div>
  );
}
