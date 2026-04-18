import { Resend } from "resend";

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not set");
  return new Resend(key);
}

interface RecordingInfo {
  title: string;
  date: string;
  duration: string;
}

interface SummaryInfo {
  overview: string;
  action_items: string[];
  key_decisions: string[];
}

/**
 * Send a formatted summary email for a recording.
 */
export async function sendSummaryEmail(
  to: string[],
  recording: RecordingInfo,
  summary: SummaryInfo,
  appUrl: string,
  recordingId: string
): Promise<void> {
  if (to.length === 0) return;

  const viewUrl = `${appUrl}/dashboard/recordings/${recordingId}`;

  const actionItemsHtml =
    summary.action_items.length > 0
      ? `
        <h3 style="margin: 24px 0 8px 0; font-size: 14px; font-weight: 600; color: #1a1a1a;">Action Items</h3>
        <ul style="margin: 0; padding-left: 20px; color: #4b5563;">
          ${summary.action_items.map((item) => `<li style="margin-bottom: 6px; font-size: 14px; line-height: 1.5;">${escapeHtml(item)}</li>`).join("")}
        </ul>`
      : "";

  const keyDecisionsHtml =
    summary.key_decisions.length > 0
      ? `
        <h3 style="margin: 24px 0 8px 0; font-size: 14px; font-weight: 600; color: #1a1a1a;">Key Decisions</h3>
        <ul style="margin: 0; padding-left: 20px; color: #4b5563;">
          ${summary.key_decisions.map((item) => `<li style="margin-bottom: 6px; font-size: 14px; line-height: 1.5;">${escapeHtml(item)}</li>`).join("")}
        </ul>`
      : "";

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 32px 16px;">
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="display: inline-block; background-color: #3b82f6; border-radius: 10px; padding: 8px 12px;">
        <span style="color: #ffffff; font-size: 16px; font-weight: 700; letter-spacing: -0.02em;">NoteGenius AI</span>
      </div>
    </div>

    <!-- Card -->
    <div style="background-color: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
      <h2 style="margin: 0 0 4px 0; font-size: 18px; font-weight: 700; color: #111827;">
        ${escapeHtml(recording.title)}
      </h2>
      <p style="margin: 0 0 20px 0; font-size: 13px; color: #9ca3af;">
        ${escapeHtml(recording.date)} &middot; ${escapeHtml(recording.duration)}
      </p>

      <div style="border-top: 1px solid #f3f4f6; padding-top: 20px;">
        <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #1a1a1a;">Summary</h3>
        <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #4b5563;">
          ${escapeHtml(summary.overview)}
        </p>
      </div>

      ${actionItemsHtml}
      ${keyDecisionsHtml}

      <!-- CTA -->
      <div style="text-align: center; margin-top: 32px;">
        <a href="${viewUrl}" style="display: inline-block; background-color: #3b82f6; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 10px 24px; border-radius: 8px;">
          View Full Recording
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align: center; margin-top: 24px;">
      <p style="font-size: 12px; color: #9ca3af; line-height: 1.5;">
        You received this email because a recording summary was shared with you via NoteGenius AI.
        <br />
        To stop receiving these emails, update your preferences in the app settings.
      </p>
    </div>
  </div>
</body>
</html>`;

  const { error } = await getResend().emails.send({
    from: "NoteGenius AI <notes@notegenius.ai>",
    to,
    subject: `Meeting Summary: ${recording.title}`,
    html,
  });

  if (error) {
    throw new Error(`Failed to send email: ${error.message}`);
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
