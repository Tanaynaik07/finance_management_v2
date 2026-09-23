const { google } = require("googleapis");

const oAuth2Client = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  "https://developers.google.com/oauthplayground" // redirect used only when generating the refresh token
);
oAuth2Client.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });

function encodeMessage({ to, subject, html }) {
  const from = process.env.GMAIL_SENDER_ADDRESS;
  const messageParts = [
    `From: "Finance Manager" <${from}>`,
    `To: ${to}`,
    "Content-Type: text/html; charset=utf-8",
    "MIME-Version: 1.0",
    `Subject: ${subject}`,
    "",
    html,
  ];
  const message = messageParts.join("\n");

  return Buffer.from(message)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// Sends an email through the Gmail REST API (HTTPS), never opening an SMTP
// socket — this is what makes it work on hosts (like Render's free tier)
// that block outbound SMTP ports. No domain ownership needed: it sends as
// your own Gmail address.
async function sendMail({ to, subject, html }) {
  const gmail = google.gmail({ version: "v1", auth: oAuth2Client });
  const raw = encodeMessage({ to, subject, html });

  await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw },
  });
}

module.exports = { sendMail };
