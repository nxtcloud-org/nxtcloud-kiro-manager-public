import { gunzipSync } from "zlib";

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

export interface GarRecord {
  requestId: string;
  userId: string;
  conversationId: string | null;
  chatTriggerType: string | null;
  modelId: string | null;
  timestamp: string;
  date: string;
  hour: number;
  promptLength: number;
  responseLength: number;
  s3Key: string;
}

export function parseGarFile(
  gzippedBytes: Buffer,
  s3Key: string,
): GarRecord[] {
  let data: unknown;
  try {
    const raw = gunzipSync(gzippedBytes);
    data = JSON.parse(raw.toString("utf-8"));
  } catch {
    console.warn(`[Parser] GAR 파싱 실패: ${s3Key}`);
    return [];
  }

  const rawRecords: Record<string, unknown>[] = Array.isArray(data)
    ? data
    : ((data as Record<string, unknown>).records as Record<string, unknown>[]) ?? [data as Record<string, unknown>];

  return rawRecords
    .map((rec) => parseGarRecord(rec, s3Key))
    .filter((r): r is GarRecord => r !== null);
}

function parseGarRecord(
  rec: Record<string, unknown>,
  s3Key: string,
): GarRecord | null {
  const request =
    (rec.generateAssistantResponseEventRequest as Record<string, unknown>) ??
    (rec.request as Record<string, unknown>) ??
    rec;

  const response =
    (rec.generateAssistantResponseEventResponse as Record<string, unknown>) ??
    (rec.response as Record<string, unknown>) ??
    rec;

  const userId =
    (request.userId as string) ?? (rec.userId as string) ?? null;
  const timestampStr =
    (request.timeStamp as string) ?? (rec.timeStamp as string) ?? null;

  if (!userId || !timestampStr) return null;

  const dt = parseTimestamp(timestampStr);
  if (!dt) return null;

  // UTC → KST
  const kstTime = new Date(dt.getTime() + KST_OFFSET_MS);

  const requestId =
    (response.requestId as string) ??
    (rec.requestId as string) ??
    `${userId}_${timestampStr}`;

  const prompt = (request.prompt as string) ?? "";
  const assistantResponse = (response.assistantResponse as string) ?? "";

  const meta = (response.messageMetadata as Record<string, unknown>) ?? {};
  const conversationId = (meta.conversationId as string) ?? null;

  return {
    requestId,
    userId,
    conversationId,
    chatTriggerType: (request.chatTriggerType as string) ?? null,
    modelId: (request.modelId as string) ?? null,
    timestamp: timestampStr,
    date: kstTime.toISOString().slice(0, 10),
    hour: kstTime.getUTCHours(),
    promptLength: prompt.length,
    responseLength: assistantResponse.length,
    s3Key,
  };
}

function parseTimestamp(ts: string): Date | null {
  // ISO 8601 변형 처리
  const cleaned = ts.replace("Z", "+00:00");
  const d = new Date(cleaned);
  return isNaN(d.getTime()) ? null : d;
}
