/**
 * Run once, locally: npm run get-gmail-token
 *
 * Walks you through Google's OAuth consent flow so you can obtain a
 * GMAIL_REFRESH_TOKEN for the account you want the app to send mail from.
 * Requires GMAIL_CLIENT_ID / GMAIL_CLIENT_SECRET to already be set in .env
 * (same values as your Google OAuth client — enable the Gmail API on that
 * project in Google Cloud Console first).
 */
require("dotenv").config();
const readline = require("readline");
const { google } = require("googleapis");

const REDIRECT_URI = "https://developers.google.com/oauthplayground";

const oAuth2Client = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  REDIRECT_URI
);

const authUrl = oAuth2Client.generateAuthUrl({
  access_type: "offline",
  prompt: "consent",
  scope: ["https://www.googleapis.com/auth/gmail.send"],
});

console.log("\n1. Open this URL, sign in with the Gmail account you want to send from, and approve access:\n");
console.log(authUrl);
console.log("\n2. Google will redirect you to the OAuth Playground page. Copy the 'code' value from its URL bar.\n");

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.question("Paste the code here: ", async (code) => {
  rl.close();
  try {
    const { tokens } = await oAuth2Client.getToken(code.trim());
    console.log("\nAdd this to your .env file:\n");
    console.log(`GMAIL_REFRESH_TOKEN=${tokens.refresh_token}\n`);
  } catch (err) {
    console.error("Failed to exchange code for token:", err.message);
  }
});
