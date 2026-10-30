// Uses the real registration/login flows; never resets an existing account.
const base = process.env.API_URL || "http://localhost:4001/api/v1";
const email = process.env.DEMO_EMAIL || "investor@rwog.example";
const password = process.env.DEMO_PASSWORD;
if (!password || password.length < 8)
  throw new Error("Set DEMO_PASSWORD (at least 8 characters).");
async function call(path, body, token, method = "POST") {
  const res = await fetch(base + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return { res, data };
}
const register = await call("/auth/register", {
  email,
  username: process.env.DEMO_USERNAME || "InvestorDemo",
  password,
});
if (!register.res.ok && register.res.status !== 409)
  throw new Error(JSON.stringify(register.data));
const login = await call("/auth/login", { email, password });
if (!login.res.ok)
  throw new Error(
    "Account exists with another password; use a different DEMO_EMAIL and DEMO_USERNAME.",
  );
const token = login.data.access_token;
const update = await call(
  "/teams/my-team",
  { name: "Renewed United", shortName: "RWU" },
  token,
  "PATCH",
);
if (!update.res.ok) throw new Error(JSON.stringify(update.data));
const state = await fetch(base + "/game", {
  headers: { Authorization: `Bearer ${token}` },
});
if (!state.ok) throw new Error("Game initialization failed.");
console.log(
  `Demo account ready: ${email}. Password is the DEMO_PASSWORD you supplied. Existing season progress was preserved.`,
);
