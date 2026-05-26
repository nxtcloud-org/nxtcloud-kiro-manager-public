import { S3Client, GetObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";

// 로컬: access key (환경변수), 서버: IAM role (자동)
// AWS SDK v3는 credentials chain을 자동으로 탐색:
// 1. 환경변수 (AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY)
// 2. ~/.aws/credentials
// 3. EC2 instance profile (IAM role)
const s3 = new S3Client({
  region: process.env.AWS_REGION ?? "us-east-1",
});

export async function listS3Keys(
  bucket: string,
  prefix: string,
  since?: string,
): Promise<string[]> {
  const keys: string[] = [];
  let continuationToken: string | undefined;

  do {
    const res = await s3.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      }),
    );

    for (const obj of res.Contents ?? []) {
      if (!obj.Key) continue;
      if (since && obj.Key < since) continue;
      keys.push(obj.Key);
    }

    continuationToken = res.NextContinuationToken;
  } while (continuationToken);

  return keys;
}

export async function getS3Object(
  bucket: string,
  key: string,
): Promise<Buffer> {
  const res = await s3.send(
    new GetObjectCommand({ Bucket: bucket, Key: key }),
  );
  const stream = res.Body;
  if (!stream) throw new Error(`Empty body for ${key}`);

  const chunks: Uint8Array[] = [];
  // @ts-expect-error - stream is async iterable in Node
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export function buildGarPrefix(
  accountId: string,
  region: string,
  year: number,
  month: number,
  day?: number,
): string {
  const mm = String(month).padStart(2, "0");
  const base = `kiro/AWSLogs/${accountId}/KiroLogs/GenerateAssistantResponse/${region}/${year}/${mm}`;
  if (day !== undefined) return `${base}/${String(day).padStart(2, "0")}/`;
  return `${base}/`;
}

export function buildReportPrefix(
  accountId: string,
  region: string,
  year: number,
  month: number,
  day?: number,
): string {
  const mm = String(month).padStart(2, "0");
  const base = `kiro-user-activity/AWSLogs/${accountId}/KiroLogs/user_report/${region}/${year}/${mm}`;
  if (day !== undefined) return `${base}/${String(day).padStart(2, "0")}/`;
  return `${base}/`;
}
