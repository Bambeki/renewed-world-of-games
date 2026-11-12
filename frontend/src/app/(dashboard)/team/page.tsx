"use client";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getApiUrl } from "@/lib/api";
export default function TeamPage() {
  const router = useRouter();
  const [name, setName] = useState(""),
    [shortName, setShortName] = useState(""),
    [message, setMessage] = useState(""),
    [ready, setReady] = useState(false),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    const token = localStorage.getItem("rwog_token");
    if (!token) {
      router.replace("/login");
      return;
    }
    fetch(`${getApiUrl()}/teams/my-team`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (r) => {
        if (!r.ok) throw new Error("Unable to load team. Please log in again.");
        return r.json();
      })
      .then((t) => {
        setName(t.name);
        setShortName(t.shortName);
        setReady(true);
      })
      .catch((e) => setMessage(e.message));
  }, [router]);
  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const r = await fetch(`${getApiUrl()}/teams/my-team`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("rwog_token")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, shortName }),
      });
      const d = await r.json();
      if (!r.ok)
        throw new Error(
          Array.isArray(d.message) ? d.message.join(", ") : d.message,
        );
      setMessage("Club identity saved.");
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="game">
      <h1>Club settings</h1>
      <p role="status">{message}</p>
      {ready ? (
        <section>
          <form onSubmit={save} className="club-form">
            <label>
              Team name
              <input
                required
                maxLength={100}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label>
              Short name
              <input
                required
                maxLength={5}
                value={shortName}
                onChange={(e) => setShortName(e.target.value)}
              />
            </label>
            <button disabled={busy}>{busy ? "Saving…" : "Save club"}</button>
          </form>
        </section>
      ) : (
        <p>Loading club…</p>
      )}
    </div>
  );
}
