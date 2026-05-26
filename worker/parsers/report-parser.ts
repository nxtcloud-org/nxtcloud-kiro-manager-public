import { parse } from "csv-parse/sync";

export interface ReportRecord {
  date: string;
  userId: string;
  clientType: string | null;
  chatConversations: number;
  creditsUsed: number;
  overageCreditsUsed: number;
  overageEnabled: boolean;
  subscriptionTier: string | null;
  totalMessages: number;
  autoMessages: number;
  simpleTaskMessages: number;
  unknownMessages: number;
  s3Key: string;
}

export function parseReportFile(
  csvBytes: Buffer,
  s3Key: string,
): ReportRecord[] {
  let text: string;
  try {
    text = csvBytes.toString("utf-8");
  } catch {
    console.warn(`[Parser] Report 디코딩 실패: ${s3Key}`);
    return [];
  }

  const rows = parse(text, {
    columns: true,
    skip_empty_lines: true,
  }) as Record<string, string>[];

  return rows
    .filter((row) => row.UserId)
    .map((row) => ({
      date: row.Date ?? "",
      userId: row.UserId ?? "",
      clientType: row.Client_Type || null,
      chatConversations: safeInt(row.Chat_Conversations),
      creditsUsed: safeFloat(row.Credits_Used),
      overageCreditsUsed: safeFloat(row.Overage_Credits_Used),
      overageEnabled: row.Overage_Enabled?.toLowerCase() === "true",
      subscriptionTier: row.Subscription_Tier || null,
      totalMessages: safeInt(row.Total_Messages),
      autoMessages: safeInt(row.auto_messages),
      simpleTaskMessages: safeInt(row.simple_task_messages),
      unknownMessages: safeInt(row.unknown_messages),
      s3Key,
    }));
}

function safeInt(val: string | undefined): number {
  const n = parseInt(val ?? "0");
  return isNaN(n) ? 0 : n;
}

function safeFloat(val: string | undefined): number {
  const n = parseFloat(val ?? "0");
  return isNaN(n) ? 0 : n;
}
