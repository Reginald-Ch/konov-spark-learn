import { useState, type FormEvent, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { analytics } from "@/hooks/useAnalytics";

// All site forms land in contact_submissions, which already accepts public
// inserts. `program_interest` says which form it came from; every answer is
// written into `message` so nothing is lost. The table requires an email, so
// an empty string is stored when the person left it out.
export const useSiteForm = (form: string) => {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const onSubmit = async (e: FormEvent<HTMLFormElement>, labels: Record<string, string>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const value = (key: string) => String(data.get(key) ?? "").trim();
    const lines = Object.entries(labels)
      .map(([key, label]) => [label, value(key)])
      .filter(([, v]) => v)
      .map(([label, v]) => `${label}: ${v}`);

    setStatus("sending");
    const { error } = await supabase.from("contact_submissions").insert({
      name: value("name"),
      email: value("email"),
      phone: value("phone") || null,
      program_interest: [form, value("topic") || value("class") || value("role")].filter(Boolean).join(" · "),
      message: lines.join("\n") || "(no details)",
    });
    if (error) {
      console.error(`[${form}]`, error);
      setStatus("error");
      analytics.trackFormSubmission(form, false);
      return;
    }
    setStatus("sent");
    analytics.trackFormSubmission(form, true);
  };

  return { status, onSubmit, reset: () => setStatus("idle") };
};

export const Field = ({ label, optional, hint, full, children }: {
  label: string; optional?: boolean; hint?: string; full?: boolean; children: ReactNode;
}) => (
  <div className={`k-field ${full ? "k-full" : ""}`}>
    <label>
      {label}{optional && <span> (optional)</span>}{hint && <span> {hint}</span>}
      <span style={{ display: "block", marginTop: 8 }}>{children}</span>
    </label>
  </div>
);

export const SubmitRow = ({ status, label, variant = "red", fine }: {
  status: string; label: string; variant?: "red" | "orange"; fine: ReactNode;
}) => (
  <div className="k-full" style={{ display: "grid", gap: 16 }}>
    <p className="k-form__fine">{fine}</p>
    {status === "error" && (
      <p className="k-form__error" role="alert">That didn't send. Please try again, or email hello@konovtech.com.</p>
    )}
    <div>
      <button type="submit" className={`k-btn k-btn--${variant}`} disabled={status === "sending"}>
        {status === "sending" ? "Sending…" : label} <span className="k-arrow" aria-hidden="true">→</span>
      </button>
    </div>
  </div>
);

export const Thanks = ({ title, children, onAgain }: { title: string; children: ReactNode; onAgain?: () => void }) => (
  <div className="k-thanks" role="status">
    <h3 className="k-h3">{title}</h3>
    <p className="k-lede">{children}</p>
    {onAgain && (
      <button type="button" className="k-link" style={{ background: "none", border: 0, borderBottom: "2px solid var(--red)", marginTop: 20, cursor: "pointer", font: "inherit", fontWeight: 700 }} onClick={onAgain}>
        Send another
      </button>
    )}
  </div>
);
