export async function sendSlackMessage(
  webhookUrl: string,
  text: string,
): Promise<void> {
  if (!webhookUrl) return;

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) {
      console.error(`[Slack] 전송 실패: ${res.status}`);
    }
  } catch (err) {
    console.error("[Slack] 전송 에러:", err);
  }
}
