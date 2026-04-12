export type VoteType = "relevant" | "irrelevant";

export type MarkerType = "ДПС" | "Нужна помощь" | "Чисто" | "Вопрос" | "Патруль";

export interface AuthUser {
  id: string;
  username: string;
  role: "user" | "admin";
  created_at?: string;
  is_shadowbanned?: boolean;
}

export interface JwtUser {
  id: string;
  username: string;
  role: "user" | "admin";
}

export interface PostInput {
  title: string;
  address?: string;
  latitude: number;
  longitude: number;
  type: MarkerType;
  comment?: string;
  tags?: string[];
  street_geometry?: number[][];
  created_at?: string;
}

export interface PostRow {
  post_id: string;
  title: string;
  address: string | null;
  latitude: number;
  longitude: number;
  type: MarkerType;
  comment: string | null;
  tags: string[] | null;
  user_id: string | null;
  username: string | null;
  created_at: string;
  last_relevant: string | null;
  last_irrelevant: string | null;
  last_activity: string | null;
  relevant_count: number;
  irrelevant_count: number;
  last_voter_username: string | null;
  last_vote_type: VoteType | null;
  is_static: boolean;
  street_geometry: number[][] | null;
  is_shadowbanned: boolean;
}

export type ReportStatus = "pending" | "resolved" | "dismissed";

export interface Report {
  id: string;
  post_id: string;
  user_id: string | null;
  reason: string;
  created_at: string;
  status: ReportStatus;
  post?: PostRow;
}
