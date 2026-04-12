import { supabaseAdmin } from "@/server/db";
import { HttpError } from "@/server/errors";
import type { Report, ReportStatus } from "@/types/models";

export async function createReport(postId: string, userId: string | null, reason: string) {
  const { data, error } = await supabaseAdmin
    .from("reports")
    .insert([{ post_id: postId, user_id: userId, reason, status: "pending" }])
    .select()
    .single();

  if (error || !data) {
    throw new HttpError(500, "Не удалось отправить жалобу");
  }
  return data as Report;
}

export async function getReports() {
  const { data, error } = await supabaseAdmin
    .from("reports")
    .select(`
      *,
      post:posts (
        id,
        type,
        title,
        address
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Fetch reports error:", error);
    throw new HttpError(500, "Не удалось загрузить жалобы");
  }
  return data as Report[];
}

export async function updateReportStatus(reportId: string, status: ReportStatus) {
  const { data, error } = await supabaseAdmin
    .from("reports")
    .update({ status })
    .eq("id", reportId)
    .select()
    .single();

  if (error || !data) {
    throw new HttpError(500, "Не удалось обновить статус жалобы");
  }
  return data as Report;
}
