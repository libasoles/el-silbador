// Login funnel from GA4: login_view -> login_link_sent -> login (active users per step).
//
//   GA_PROPERTY_ID=556197712 GOOGLE_APPLICATION_CREDENTIALS=./el-silbador-*.json \
//     node scripts/ga-login-funnel.mjs [days=28]
//
// Uses a service account (Viewer on the GA property) and the Data API's v1alpha runFunnelReport.
// No dependencies: the JWT is signed with node:crypto. The key file is gitignored; never commit it.
import { createSign } from "node:crypto";
import { readFileSync } from "node:fs";

const propertyId = process.env.GA_PROPERTY_ID;
const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
const days = Number(process.argv[2] ?? 28);

if (!propertyId || !keyPath) {
  console.error("Set GA_PROPERTY_ID and GOOGLE_APPLICATION_CREDENTIALS.");
  process.exit(1);
}

const base64url = (input) => Buffer.from(input).toString("base64url");

async function getAccessToken({ client_email, private_key }) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64url(
    JSON.stringify({
      iss: client_email,
      scope: "https://www.googleapis.com/auth/analytics.readonly",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );
  const signature = createSign("RSA-SHA256").update(`${header}.${claims}`).sign(private_key, "base64url");
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${header}.${claims}.${signature}`,
    }),
  });
  if (!response.ok) throw new Error(`Token request failed: ${response.status} ${await response.text()}`);
  return (await response.json()).access_token;
}

const steps = [
  ["Vio el login", "login_view"],
  ["Pidió el enlace", "login_link_sent"],
  ["Inició sesión", "login"],
];

const token = await getAccessToken(JSON.parse(readFileSync(keyPath, "utf8")));
const response = await fetch(`https://analyticsdata.googleapis.com/v1alpha/properties/${propertyId}:runFunnelReport`, {
  method: "POST",
  headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify({
    dateRanges: [{ startDate: `${days}daysAgo`, endDate: "today" }],
    // Open funnel: a user counts at a step even if they skipped earlier ones, which matters
    // because a magic link may be opened on another device/session than the one that requested it.
    funnel: {
      isOpenFunnel: true,
      steps: steps.map(([name, eventName]) => ({
        name,
        filterExpression: { funnelEventFilter: { eventName } },
      })),
    },
  }),
});
if (!response.ok) throw new Error(`runFunnelReport failed: ${response.status} ${await response.text()}`);

const { funnelTable } = await response.json();
const rows = funnelTable?.rows ?? [];
console.log(`Últimos ${days} días (usuarios activos por paso)`);
let first;
for (const row of rows) {
  const users = Number(row.metricValues[0].value);
  first ??= users;
  const pct = first ? ` (${((users / first) * 100).toFixed(1)}% de los que vieron el login)` : "";
  console.log(`${row.dimensionValues[0].value.padEnd(18)} ${String(users).padStart(6)}${pct}`);
}
if (rows.length === 0) console.log("Sin datos todavía: ¿ya está el ID de GA en producción?");
