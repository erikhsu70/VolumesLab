// Waitlist card, shared by the home hero and the standalone /waitlist page.
// The form is ours and posts to /api/waitlist (worker/index.mjs), which saves
// the signup into Momence on the server. The card only switches to the
// confirmation once the server reports that Momence created the lead. The
// markup keeps the class names the old Momence embed used, so the existing
// styles in styles.css still apply.
import { useEffect, useRef, useState } from "react";

// Momence silently drops submits that arrive within about 1-2 s of the form
// appearing (its bot check). A real visitor on autofill can be that fast, so
// the request is held until the form has been open this long. The measured
// time is sent as is.
const MIN_FORM_MS = 2500;
const RETRY_DELAYS_MS = [0, 1500, 4000];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function saveSignup(payload: Record<string, unknown>): Promise<boolean> {
  for (const delay of RETRY_DELAYS_MS) {
    if (delay) await sleep(delay);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok && (await res.json())?.ok) return true;
      if (res.status >= 400 && res.status < 500) return false;
    } catch {
      // network hiccup: try again
    }
  }
  return false;
}

export function WaitlistForm() {
  const [joined, setJoined] = useState(false);
  const [busy, setBusy] = useState(false);
  const openedAt = useRef(0);

  useEffect(() => {
    openedAt.current = Date.now();
  }, []);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const data = new FormData(event.currentTarget);
    setBusy(true);
    const wait = MIN_FORM_MS - (Date.now() - openedAt.current);
    if (wait > 0) await sleep(wait);
    const ok = await saveSignup({
      firstName: String(data.get("firstName") ?? ""),
      lastName: String(data.get("lastName") ?? ""),
      email: String(data.get("email") ?? ""),
      hp: String(data.get("hp") ?? ""),
      elapsed: Date.now() - openedAt.current,
    });
    if (ok) setJoined(true);
    else setBusy(false);
  }

  return (
    <div className={`volumes-waitlist flex w-full min-w-0 flex-col border border-border bg-card px-6 pb-4 pt-6 text-center text-foreground ${joined ? "volumes-waitlist-joined min-h-[160px] justify-center" : ""}`}>
      {!joined && <h2 className="volumes-waitlist-title mb-4 font-display text-lg font-bold uppercase leading-tight">Join the Waitlist</h2>}
      <div id="momence-plugin-lead-form" className={joined ? "volumes-waitlist-success" : ""}>
        <div className="momence-lead_form-base_container">
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@100;400;500;600;700&display=swap" rel="stylesheet" />
          {joined ? (
            <span className="momence-lead_form-success" role="status">You joined the waitlist.</span>
          ) : (
            <form className="momence-lead_form-form_container" onSubmit={onSubmit}>
              <div className="momence-lead_form-field">
                <label htmlFor="waitlist-firstName" className="momence-lead_form-field_label volumes-waitlist-field-label">Name*</label>
                <input id="waitlist-firstName" name="firstName" type="text" placeholder="Name" aria-label="Name" autoComplete="given-name" required maxLength={80} className="momence-lead_form-field_input" />
              </div>
              <div className="momence-lead_form-field">
                <label htmlFor="waitlist-lastName" className="momence-lead_form-field_label volumes-waitlist-field-label">Surname*</label>
                <input id="waitlist-lastName" name="lastName" type="text" placeholder="Surname" aria-label="Surname" autoComplete="family-name" required maxLength={80} className="momence-lead_form-field_input" />
              </div>
              <div className="momence-lead_form-field">
                <label htmlFor="waitlist-email" className="momence-lead_form-field_label volumes-waitlist-field-label">Email*</label>
                <input id="waitlist-email" name="email" type="email" placeholder="Email" aria-label="Email" autoComplete="email" required maxLength={200} className="momence-lead_form-field_input" />
              </div>
              <input type="text" name="hp" defaultValue="" autoComplete="off" tabIndex={-1} aria-hidden="true" style={{ position: "absolute", left: "-9999px", opacity: 0, height: 0, width: 0 }} />
              <div className="momence-lead_form-actions">
                <button type="submit" disabled={busy} className="momence-lead_form-submit_btn">Join the waitlist</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
