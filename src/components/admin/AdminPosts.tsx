"use client";

import { useState } from "react";
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
};

const EMPTY_DRAFT: Draft = { type: "ДПС", address: "", latitude: "55.2255", longitude: "63.2982", comment: "" };

export function AdminPosts({ posts, onSave, onDelete }: Props) {
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
    <div className="admin-grid">
      <section className="card">
        <h3>{draft.id ? "Редактировать метку" : "Новая метка"}</h3>
        <select className="input" value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })}>
          {MARKER_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
        <input className="input" value={draft.address} onChange={(e) => setDraft({ ...draft, address: e.target.value })} placeholder="Адрес" />
        <div className="row">
          <input className="input" value={draft.latitude} onChange={(e) => setDraft({ ...draft, latitude: e.target.value })} placeholder="Широта" />
          <input className="input" value={draft.longitude} onChange={(e) => setDraft({ ...draft, longitude: e.target.value })} placeholder="Долгота" />
        </div>
        <textarea className="input" value={draft.comment} onChange={(e) => setDraft({ ...draft, comment: e.target.value })} />
        <div className="row">
          <button className="button button-primary" onClick={() => onSave(draft).then(() => setDraft(EMPTY_DRAFT))}>
            Сохранить
          </button>
          {draft.id && (
            <button className="button button-soft" onClick={() => setDraft(EMPTY_DRAFT)}>
              Отмена
            </button>
          )}
        </div>
      </section>
      <section className="card">
        <h3>Метки</h3>
        {posts.map((post) => (
          <div key={post.id} className="admin-item">
            <strong>{post.type}</strong>
            <span className="muted">{post.address || "Без адреса"}</span>
            <span className="muted">
              ✅ {post.stats?.relevant ?? 0} · ❌ {post.stats?.irrelevant ?? 0}
            </span>
            <div className="row">
              <button className="button button-soft" onClick={() => edit(post)}>
                Изменить
              </button>
              <button className="button button-danger" onClick={() => onDelete(post.id)}>
                Удалить
              </button>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
