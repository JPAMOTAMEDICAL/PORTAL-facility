"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Building2,
  ClipboardCheck,
  FileBadge2,
  Image as ImageIcon,
  ShieldCheck,
} from "lucide-react";
import { apiFetch, applyThemeMode, loadBranding, loadThemeMode } from "@/lib/portal";

const defaultForm = {
  facilityName: "",
  facilityType: "HOSPITAL",
  address: "",
  contactPerson: "",
  phone: "",
  email: "",
  state: "Lagos",
  lga: "Ikeja",
};

const workflowSteps = [
  "Submit facility profile",
  "Internal review and approval",
  "Account and facility setup",
  "Welcome credentials and activation",
];

export default function SignupPage() {
  const [form, setForm] = useState(defaultForm);
  const [savedDraft, setSavedDraft] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [branding] = useState(() => loadBranding());

  useEffect(() => {
    applyThemeMode(loadThemeMode());
  }, []);

  const preview = useMemo(
    () => [
      `${form.facilityName || "Facility"} onboarding request created`,
      "Operations and client service teams notified automatically",
      "Approval workflow enters pending review immediately",
      "Approved facilities receive profile setup and access credentials",
    ],
    [form.facilityName],
  );

  function saveDraft() {
    setSavedDraft(new Date().toISOString());
    setMessage("Draft saved locally in the current browser session.");
    setError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    setError(null);

    try {
      const response = await apiFetch<{ id: string; status: string }>(
        "/signup-requests",
        {
          method: "POST",
          body: JSON.stringify(form),
        },
      );

      setMessage(
        `Signup request submitted successfully. Request ID ${response.id} is now ${response.status}.`,
      );
      setForm(defaultForm);
      setSavedDraft(null);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not submit signup request.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-7xl overflow-hidden rounded-[32px] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)] lg:grid-cols-[0.95fr_1.05fr]">
        <section className="relative flex min-h-[320px] flex-col justify-between overflow-hidden bg-[linear-gradient(180deg,#f0fdf4_0%,#dcfce7_32%,#14532d_100%)] p-8 text-[#111111] sm:p-10 lg:p-12">
          <div className="absolute inset-0 opacity-70">
            <div className="absolute left-8 top-8 h-40 w-40 rounded-full bg-white/45 blur-3xl" />
            <div className="absolute bottom-0 right-0 h-52 w-52 rounded-full bg-orange-300/40 blur-3xl" />
          </div>
          <div className="relative z-10 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-[#14532d]/80">Facility Onboarding</p>
              <h1 className="mt-4 max-w-md text-3xl font-semibold leading-tight sm:text-4xl">
                Register healthcare facility interest
              </h1>
              <p className="mt-3 max-w-md text-sm leading-7 text-[#14532d]/80">
                Submit a clean onboarding request for review by the operations and client service teams.
              </p>
            </div>
            {branding.primaryLogo ? (
              <img
                alt="Primary logo"
                className="h-16 w-16 rounded-2xl border border-white/60 bg-white/80 object-cover p-2"
                src={branding.primaryLogo}
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/60 bg-white/80">
                <Building2 className="h-8 w-8 text-[#14532d]" />
              </div>
            )}
          </div>

          <div className="relative z-10 mt-10 rounded-[28px] border border-white/60 bg-white/60 p-6 shadow-[var(--shadow-card)] backdrop-blur-xl sm:p-8">
            <div className="grid gap-4 sm:grid-cols-2">
              {workflowSteps.map((step, index) => (
                <div key={step} className="rounded-2xl border border-emerald-900/10 bg-white/75 p-4">
                  <p className="text-xs uppercase tracking-[0.28em] text-[#14532d]/70">Step {index + 1}</p>
                  <p className="mt-2 text-sm leading-6 text-[#14532d]">{step}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 grid gap-3">
              {preview.map((item, index) => (
                <VisualRow
                  key={item}
                  icon={index % 2 === 0 ? <ClipboardCheck className="h-5 w-5" /> : <FileBadge2 className="h-5 w-5" />}
                  text={item}
                />
              ))}
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center bg-[var(--surface-muted)] px-6 py-10 sm:px-10 lg:px-12">
          <div className="w-full max-w-2xl rounded-[28px] border border-white/50 bg-white/74 p-6 shadow-[var(--shadow-card)] backdrop-blur-xl sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-[var(--primary)]">{branding.companyName}</p>
                <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">Facility interest form</h2>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  Provide the operational and contact information required for onboarding review.
                </p>
              </div>
              <div className="hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 sm:block">
                <ShieldCheck className="h-6 w-6 text-[var(--primary)]" />
              </div>
            </div>

            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Facility name" value={form.facilityName} onChange={(value) => setForm((current) => ({ ...current, facilityName: value }))} />
                <SelectField
                  label="Facility type"
                  value={form.facilityType}
                  onChange={(value) => setForm((current) => ({ ...current, facilityType: value }))}
                  options={["HOSPITAL", "CLINIC", "LABORATORY", "DIAGNOSTIC_CENTRE"]}
                />
                <Field label="Contact person" value={form.contactPerson} onChange={(value) => setForm((current) => ({ ...current, contactPerson: value }))} />
                <Field label="Phone" value={form.phone} onChange={(value) => setForm((current) => ({ ...current, phone: value }))} />
                <Field label="Email" value={form.email} onChange={(value) => setForm((current) => ({ ...current, email: value }))} />
                <Field label="State" value={form.state} onChange={(value) => setForm((current) => ({ ...current, state: value }))} />
                <Field label="LGA" value={form.lga} onChange={(value) => setForm((current) => ({ ...current, lga: value }))} />
                <Field label="Address" value={form.address} onChange={(value) => setForm((current) => ({ ...current, address: value }))} />
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-5 py-3 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--surface-muted)]"
                  onClick={saveDraft}
                  type="button"
                >
                  Save draft
                </button>
                <button
                  className="inline-flex items-center gap-2 rounded-2xl bg-[var(--primary)] px-5 py-3 text-sm font-medium text-white transition hover:bg-[var(--primary-strong)] disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={busy}
                  type="submit"
                >
                  {busy ? "Submitting..." : "Submit request"}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
              {savedDraft ? (
                <p className="text-sm text-[var(--muted)]">
                  Draft saved {new Intl.DateTimeFormat("en-NG", {
                    dateStyle: "medium",
                    timeStyle: "short",
                    timeZone: "Africa/Lagos",
                  }).format(new Date(savedDraft))}
                </p>
              ) : null}
              {message ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {message}
                </div>
              ) : null}
              {error ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {error}
                </div>
              ) : null}
            </form>

            <div className="mt-6 flex items-center justify-between gap-3 border-t border-[var(--border)] pt-5 text-sm text-[var(--muted)]">
              <Link className="hover:text-[var(--foreground)]" href="/">
                Back home
              </Link>
              <Link className="hover:text-[var(--foreground)]" href="/login">
                Return to sign in
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">{label}</span>
      <input
        className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--ring)]"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">{label}</span>
      <select
        className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--ring)]"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function VisualRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-emerald-900/10 bg-white/75 px-4 py-4 text-sm text-[#14532d]">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-[var(--primary)]">
        {icon}
      </div>
      <span className="leading-6">{text}</span>
    </div>
  );
}
