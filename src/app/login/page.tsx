"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CalendarRange,
  FileCheck2,
  HeartPulse,
} from "lucide-react";
import {
  apiFetch,
  applyThemeMode,
  buildBrandingFromSettings,
  clearSession,
  formatDateTime,
  getExpiryMs,
  loadBranding,
  loadSession,
  loadThemeMode,
  saveSession,
  type SessionUser,
} from "@/lib/portal";

type Mode = "login" | "forgot" | "reset";

type SettingsResponse = {
  companyName?: string | null;
  mainLogo?: string | null;
  invoiceLogo?: string | null;
  reportLogo?: string | null;
};

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [branding, setBranding] = useState(() => loadBranding());

  useEffect(() => {
    let mounted = true;

    async function validateStoredSession() {
      applyThemeMode(loadThemeMode());
      const session = loadSession();

      if (!session) {
        clearSession();
        return;
      }

      try {
        await apiFetch(
          `/notifications?userId=${session.user.id}`,
          undefined,
          session.accessToken,
        );

        if (mounted) {
          redirectToClientDashboard();
        }
      } catch {
        clearSession();
      }
    }

    void validateStoredSession();

    return () => {
      mounted = false;
    };
  }, []);

  const helperText = useMemo(() => {
    if (mode === "forgot") {
      return "Generate a recovery token for the approved facility account.";
    }
    if (mode === "reset") {
      return "Apply the token and continue with the new password.";
    }
    return "Secure access to service updates, invoices, collections, and support.";
  }, [mode]);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);

    try {
      const response = await apiFetch<{
        accessToken: string;
        user: SessionUser;
      }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ identifier, password, rememberMe }),
      });

      if (response.user.role !== "HOSPITAL_ADMIN") {
        throw new Error("Admin accounts must use the admin portal.");
      }

      const settings = await apiFetch<SettingsResponse>("/settings", undefined, response.accessToken).catch(
        () => null,
      );
      if (settings) {
        setBranding(buildBrandingFromSettings(settings));
      }

      saveSession({
        accessToken: response.accessToken,
        user: response.user,
        rememberMe,
        expiresAt: Date.now() + getExpiryMs(rememberMe),
      });

      setMessage(
        `Signed in as ${response.user.fullName}. Last login ${formatDateTime(
          response.user.lastLoginAt,
        )}.`,
      );
      redirectToClientDashboard();
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Login failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleForgotPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);

    try {
      const response = await apiFetch<{
        message: string;
        resetToken?: string;
        expiresAt: string;
      }>("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ identifier }),
      });
      setResetToken(response.resetToken ?? "");
      setMode("reset");
      setMessage(
        response.resetToken
          ? `Password recovery started. The reset form has been prepared for completion before ${formatDateTime(
              response.expiresAt,
            )}.`
          : `Password recovery started. Enter the reset token from the secure delivery channel before ${formatDateTime(
              response.expiresAt,
            )}.`,
      );
    } catch (forgotError) {
      setError(
        forgotError instanceof Error
          ? forgotError.message
          : "Could not generate reset token.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleResetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);

    try {
      const response = await apiFetch<{ message: string }>("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token: resetToken, newPassword }),
      });
      setMessage(response.message);
      setMode("login");
      setPassword("");
      setNewPassword("");
      setResetToken("");
    } catch (resetError) {
      setError(
        resetError instanceof Error ? resetError.message : "Password reset failed.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-7xl overflow-hidden rounded-[32px] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)] lg:grid-cols-2">
        <section className="relative flex min-h-[320px] flex-col justify-between overflow-hidden bg-[linear-gradient(180deg,#f0fdf4_0%,#dcfce7_30%,#14532d_100%)] p-8 text-[#111111] sm:p-10 lg:p-12">
          <div className="absolute inset-0 opacity-70">
            <div className="absolute left-8 top-8 h-40 w-40 rounded-full bg-white/40 blur-3xl" />
            <div className="absolute bottom-0 right-0 h-52 w-52 rounded-full bg-orange-300/40 blur-3xl" />
          </div>
          <div className="relative z-10 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-[#14532d]/80">Hospital Service Portal</p>
              <h1 className="mt-4 max-w-md text-3xl font-semibold leading-tight text-[#111111] sm:text-4xl">
                {branding.companyName}
              </h1>
              <p className="mt-3 max-w-md text-sm leading-7 text-[#14532d]/80">
                Service visibility, collection updates, invoice tracking, and support in one place.
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

          <div className="relative z-10 mt-10 flex-1 rounded-[28px] border border-white/60 bg-white/55 p-6 shadow-[var(--shadow-card)] backdrop-blur-xl sm:p-8">
            {branding.clientHeroImage ? (
              <img
                alt="Client illustration"
                className="h-full min-h-[260px] w-full rounded-[22px] object-cover"
                src={branding.clientHeroImage}
              />
            ) : (
              <div className="flex h-full min-h-[260px] flex-col justify-between rounded-[22px] border border-emerald-900/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.78),rgba(255,255,255,0.48))] p-6">
                <div className="grid grid-cols-2 gap-3 text-sm text-[#14532d]">
                  <VisualTile icon={<HeartPulse className="h-5 w-5" />} label="Healthcare service view" />
                  <VisualTile icon={<CalendarRange className="h-5 w-5" />} label="Upcoming collections" />
                  <VisualTile icon={<FileCheck2 className="h-5 w-5" />} label="Invoice and payment records" />
                  <VisualTile icon={<BadgeCheck className="h-5 w-5" />} label="Complaint and notification updates" />
                </div>
                <div className="grid gap-3">
                  <div className="rounded-2xl border border-emerald-900/10 bg-white/75 p-4">
                    <p className="text-xs uppercase tracking-[0.28em] text-[#14532d]/70">Service Snapshot</p>
                    <p className="mt-2 text-lg font-medium text-[#111111]">Collections, invoices, outstanding balance, and support in Nigerian time.</p>
                  </div>
                  <div className="rounded-2xl border border-emerald-900/10 bg-white/75 p-4">
                    <p className="text-xs uppercase tracking-[0.28em] text-[#14532d]/70">Access</p>
                    <p className="mt-2 text-sm leading-6 text-[#14532d]/80">
                      Approved facility accounts open directly into the hospital service dashboard.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="flex items-center justify-center bg-[var(--surface-muted)] px-6 py-10 sm:px-10 lg:px-12">
          <div className="w-full max-w-md">
            <div className="rounded-[28px] border border-white/50 bg-white/72 p-6 shadow-[var(--shadow-card)] backdrop-blur-xl sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-[var(--primary)]">{branding.systemName}</p>
                  <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
                    {mode === "login"
                      ? "Facility sign in"
                      : mode === "forgot"
                        ? "Recover access"
                        : "Reset password"}
                  </h2>
                  <p className="mt-2 text-sm text-[var(--muted)]">{helperText}</p>
                </div>
                <div className="hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 sm:block">
                  <HeartPulse className="h-6 w-6 text-[var(--primary)]" />
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-2 rounded-full bg-[var(--surface-strong)] p-1">
                {(["login", "forgot", "reset"] as Mode[]).map((item) => (
                  <button
                    key={item}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                      mode === item
                        ? "bg-[var(--foreground)] text-white"
                        : "text-[var(--muted)] hover:text-[var(--foreground)]"
                    }`}
                    onClick={() => setMode(item)}
                    type="button"
                  >
                    {item === "login"
                      ? "Sign in"
                      : item === "forgot"
                        ? "Forgot"
                        : "Reset"}
                  </button>
                ))}
              </div>

              {mode === "login" ? (
                <form className="mt-6 space-y-4" onSubmit={handleLogin}>
                  <Field label="Facility email or code" value={identifier} onChange={setIdentifier} />
                  <Field label="Password" type="password" value={password} onChange={setPassword} />
                  <div className="flex items-center justify-between gap-3">
                    <label className="inline-flex items-center gap-3 text-sm text-[var(--muted)]">
                      <input
                        checked={rememberMe}
                        className="h-4 w-4 rounded border-[var(--border)]"
                        onChange={(event) => setRememberMe(event.target.checked)}
                        type="checkbox"
                      />
                      Remember me
                    </label>
                    <button
                      className="text-sm font-medium text-[var(--primary)] hover:text-[var(--primary-strong)]"
                      onClick={() => setMode("forgot")}
                      type="button"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <button
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--primary)] px-4 py-3 font-medium text-white transition hover:bg-[var(--primary-strong)] disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={busy}
                    type="submit"
                  >
                    {busy ? "Signing in..." : "Open client portal"}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </form>
              ) : mode === "forgot" ? (
                <form className="mt-6 space-y-4" onSubmit={handleForgotPassword}>
                  <Field label="Facility email or code" value={identifier} onChange={setIdentifier} />
                  <button
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--primary)] px-4 py-3 font-medium text-white transition hover:bg-[var(--primary-strong)] disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={busy}
                    type="submit"
                  >
                    {busy ? "Generating..." : "Generate token"}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </form>
              ) : (
                <form className="mt-6 space-y-4" onSubmit={handleResetPassword}>
                  <Field label="Reset token" value={resetToken} onChange={setResetToken} />
                  <Field label="New password" type="password" value={newPassword} onChange={setNewPassword} />
                  <button
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--primary)] px-4 py-3 font-medium text-white transition hover:bg-[var(--primary-strong)] disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={busy}
                    type="submit"
                  >
                    {busy ? "Resetting..." : "Apply reset"}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </form>
              )}

              {message ? (
                <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {message}
                </div>
              ) : null}
              {error ? (
                <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {error}
                </div>
              ) : null}

              <div className="mt-6 flex items-center justify-between gap-3 border-t border-[var(--border)] pt-5 text-sm text-[var(--muted)]">
                <Link className="hover:text-[var(--foreground)]" href="/">
                  Back home
                </Link>
                <span>Africa/Lagos</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function redirectToClientDashboard() {
  if (typeof window !== "undefined") {
    window.location.replace("/client/dashboard");
  }
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "password";
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">{label}</span>
      <input
        className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--ring)]"
        onChange={(event) => onChange(event.target.value)}
        type={type}
        value={value}
      />
    </label>
  );
}

function VisualTile({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="rounded-2xl border border-emerald-900/10 bg-white/75 p-4">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-[var(--primary)]">
        {icon}
      </div>
      <p className="text-sm leading-6 text-[#14532d]">{label}</p>
    </div>
  );
}
