// Momence waitlist card, shared by the home hero and the standalone
// /waitlist page. Momence owns the lead-form DOM; the embed credentials
// and field wiring below are the client's (host 319187, source 301458).
import { useEffect, useState } from "react";

export function WaitlistForm() {
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    const style = document.createElement("style");
    style.id = "momence-waitlist-colors";
    style.textContent = `:root {
      --momenceColorBackground: #F7F5F6;
      --momenceColorPrimary: 33, 33, 33;
      --momenceColorBlack: 3, 1, 13;
    }`;
    document.head.appendChild(style);

    const script = document.createElement("script");
    script.id = "momence-plugin-lead-form-src";
    script.type = "module";
    script.async = true;
    script.setAttribute("host_id", "319187");
    script.setAttribute("fields", "firstName,lastName,email");
    script.setAttribute("token", "KajVVpeQjP");
    script.setAttribute("country_code", "es");
    script.setAttribute("source_id", "301458");
    script.setAttribute(
      "data-field-def",
      JSON.stringify({
        firstName: { type: "text", label: "Name", required: true, hidden: false, placeholder: "Name" },
        lastName: { type: "text", label: "Surname", required: true, hidden: false, placeholder: "Surname" },
        email: { type: "email", label: "Email", required: true, hidden: false, placeholder: "Email" },
      }),
    );
    script.setAttribute("data-on-success-msg", "You joined the waitlist.");
    script.src = "https://momence.com/plugin/lead-form/lead-form.js";
    document.body.appendChild(script);

    // Momence owns this DOM. Normalize its generated fields after the plugin renders.
    const formRoot = document.getElementById("momence-plugin-lead-form");
    const normalizeForm = () => {
      if (formRoot?.textContent?.includes("You joined the waitlist.")) setJoined(true);
      if (!formRoot) return;
      const fields = Array.from(formRoot.querySelectorAll<HTMLInputElement>('input:not([type="hidden"]):not([type="submit"]):not([type="checkbox"]):not([type="radio"])'));
      const placeholders = ["Name", "Surname", "Email"];
      fields.slice(0, 3).forEach((input, i) => {
        if (input.placeholder !== placeholders[i]) input.placeholder = placeholders[i];
        input.setAttribute("aria-label", placeholders[i]);
      });
      formRoot.querySelectorAll("label").forEach((label) => {
        const value = (label.textContent ?? "").replaceAll("*", "").trim().toLowerCase();
        if (["first name", "last name", "name", "surname", "email"].includes(value) && !label.querySelector("input")) {
          label.classList.add("volumes-waitlist-field-label");
        }
      });
      const submit = formRoot.querySelector<HTMLButtonElement>('button[type="submit"], input[type="submit"]');
      if (submit) {
        if (submit instanceof HTMLInputElement) {
          if (submit.value !== "Join the waitlist") submit.value = "Join the waitlist";
        } else if (submit.textContent?.trim() !== "Join the waitlist") {
          submit.textContent = "Join the waitlist";
        }
      }
    };
    const observer = new MutationObserver(normalizeForm);
    if (formRoot) observer.observe(formRoot, { childList: true, subtree: true, characterData: true });
    normalizeForm();

    return () => {
      observer.disconnect();
      script.remove();
      style.remove();
    };
  }, []);

  return (
    <div className={`volumes-waitlist flex w-full min-w-0 flex-col border border-border bg-card px-6 pb-4 pt-6 text-center text-foreground ${joined ? "volumes-waitlist-joined min-h-[160px] justify-center" : ""}`}>
      {!joined && <h2 className="volumes-waitlist-title mb-4 font-display text-lg font-bold uppercase leading-tight">Join the Waitlist</h2>}
      <div id="momence-plugin-lead-form" className={joined ? "volumes-waitlist-success" : ""} />
    </div>
  );
}
