"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { MoonStar, RefreshCw, Save, SunMedium, Upload } from "lucide-react";
import { Controls, EmptyPanel, PageScaffold, TableShell } from "@/components/client/Scaffold";
import { RouteDenied, RouteError, RouteLoading } from "@/components/client/RouteState";
import { useClientPortalData } from "@/lib/client-data";
import { uploadDocument } from "@/lib/documents";
import {
  apiFetch,
  applyThemeMode,
  buildPortalAssetUrl,
  loadLanguagePreference,
  loadNotificationPreferences,
  saveLanguagePreference,
  saveNotificationPreferences,
  saveSession,
  saveThemeMode,
  type ClientLanguage,
  type NotificationPreferences,
} from "@/lib/portal";

export default function ClientSettingsPage() {
  const {
    session,
    sessionLoading,
    loading,
    error,
    themeMode,
    setThemeMode,
    recentActivity,
    refresh,
  } = useClientPortalData();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [busy, setBusy] = useState(false);
  const [profileBusy, setProfileBusy] = useState(false);
  const [preferenceBusy, setPreferenceBusy] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
  });
  const [profileForm, setProfileForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    address: "",
    photoUrl: "",
  });
  const [language, setLanguage] = useState<ClientLanguage>("en-NG");
  const [notificationPreferences, setNotificationPreferences] =
    useState<NotificationPreferences>({
      inApp: true,
      email: true,
      billing: true,
      complaints: true,
      systemAlerts: true,
    });

  useEffect(() => {
    if (!session?.accessToken) {
      return;
    }

    let active = true;
    setLanguage(loadLanguagePreference(session.user.id));
    setNotificationPreferences(loadNotificationPreferences(session.user.id));

    void apiFetch<{
      fullName: string;
      email: string;
      phone?: string | null;
      address?: string | null;
      photoUrl?: string | null;
      facility?: { code?: string | null } | null;
    }>("/users/me", undefined, session.accessToken)
      .then((response) => {
        if (!active) {
          return;
        }

        setProfileForm({
          fullName: response.fullName ?? "",
          email: response.email ?? "",
          phone: response.phone ?? "",
          address: response.address ?? "",
          photoUrl: response.photoUrl ?? "",
        });
      })
      .catch((requestError) => {
        if (!active) {
          return;
        }

        setLocalError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load your profile settings.",
        );
      });

    return () => {
      active = false;
    };
  }, [session?.accessToken, session?.user.id]);

  const settingsRows = useMemo(() => {
    const rows = [
      { key: "Theme mode", value: themeMode === "light" ? "Light" : "Dark", scope: "Preference" },
      { key: "Language", value: language, scope: "Preference" },
      { key: "In-app notifications", value: notificationPreferences.inApp ? "Enabled" : "Disabled", scope: "Preference" },
      { key: "Email notifications", value: notificationPreferences.email ? "Enabled" : "Disabled", scope: "Preference" },
      { key: "Portal access", value: "Hospital client only", scope: "Security" },
      { key: "Branding control", value: "Managed by admin portal", scope: "Permission" },
      { key: "Facility code", value: session?.user.facilityId ?? "Linked to facility account", scope: "Permission" },
      { key: "Recent activity items", value: String(recentActivity.length), scope: "Audit" },
    ];

    return rows.filter((item) => {
      const haystack = `${item.key} ${item.value} ${item.scope}`.toLowerCase();
      const matchesSearch = haystack.includes(search.toLowerCase());
      const matchesFilter = filter === "All" || item.scope === filter;
      return matchesSearch && matchesFilter;
    });
  }, [filter, language, notificationPreferences.email, notificationPreferences.inApp, recentActivity.length, search, session?.user.facilityId, themeMode]);

  function toggleTheme() {
    if (!session) {
      return;
    }

    const nextMode = themeMode === "light" ? "dark" : "light";
    setThemeMode(nextMode);
    applyThemeMode(nextMode);
    saveThemeMode(nextMode, session.user.id);
    setMessage(`Theme updated to ${nextMode} mode.`);
  }

  async function handleProfileSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.accessToken) {
      return;
    }

    setProfileBusy(true);
    setLocalError(null);
    setMessage(null);

    try {
      const response = await apiFetch<{
        id: string;
        fullName: string;
        email: string;
        phone?: string | null;
        address?: string | null;
        photoUrl?: string | null;
      }>(
        "/users/me",
        {
          method: "PATCH",
          body: JSON.stringify(profileForm),
        },
        session.accessToken,
      );

      setProfileForm({
        fullName: response.fullName ?? "",
        email: response.email ?? "",
        phone: response.phone ?? "",
        address: response.address ?? "",
        photoUrl: response.photoUrl ?? "",
      });
      saveSession({
        ...session,
        user: {
          ...session.user,
          fullName: response.fullName,
          email: response.email,
          phone: response.phone ?? null,
        },
      });
      setMessage("Client profile updated successfully.");
    } catch (requestError) {
      setLocalError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to save your profile settings.",
      );
    } finally {
      setProfileBusy(false);
    }
  }

  async function handleProfilePhotoChange(file?: File | null) {
    if (!session?.accessToken || !file) {
      return;
    }

    setUploadingPhoto(true);
    setLocalError(null);
    setMessage(null);

    try {
      const uploaded = await uploadDocument({
        token: session.accessToken,
        category: "STAFF_PHOTO",
        file,
      });
      setProfileForm((current) => ({
        ...current,
        photoUrl: uploaded.previewUrl || uploaded.downloadUrl || current.photoUrl,
      }));
      setMessage("Profile picture uploaded. Save profile to apply it permanently.");
    } catch (requestError) {
      setLocalError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to upload the selected profile picture.",
      );
    } finally {
      setUploadingPhoto(false);
    }
  }

  function handlePreferenceToggle(key: keyof NotificationPreferences) {
    setNotificationPreferences((current) => ({
      ...current,
      [key]: !current[key],
    }));
  }

  function handlePreferenceSave() {
    if (!session) {
      return;
    }

    setPreferenceBusy(true);
    setLocalError(null);
    setMessage(null);

    try {
      saveLanguagePreference(language, session.user.id);
      saveNotificationPreferences(notificationPreferences, session.user.id);
      setMessage("Client preferences saved successfully.");
    } catch {
      setLocalError("Unable to save your client preferences.");
    } finally {
      setPreferenceBusy(false);
    }
  }

  async function handlePasswordChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) {
      return;
    }

    setBusy(true);
    setLocalError(null);
    setMessage(null);

    try {
      const response = await apiFetch<{ message: string }>(
        "/auth/change-password",
        {
          method: "POST",
          body: JSON.stringify(passwordForm),
        },
        session.accessToken,
      );
      setMessage(response.message);
      setPasswordForm({ currentPassword: "", newPassword: "" });
    } catch (requestError) {
      setLocalError(
        requestError instanceof Error ? requestError.message : "Password update failed.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (sessionLoading || (loading && !recentActivity.length && !error)) {
    return <RouteLoading label="Loading settings..." />;
  }

  if (!session) {
    return <RouteDenied message="A client facility session is required to open settings." />;
  }

  if (error && !recentActivity.length) {
    return <RouteError message={error} onRetry={() => void refresh()} />;
  }

  return (
    <PageScaffold
      title="Settings"
      description="A dedicated settings page for theme preference, password changes, and client-side account controls."
      breadcrumb={[
        { label: "Client", href: "/client/dashboard" },
        { label: "Settings" },
      ]}
      actions={
        <button
          className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--surface-muted)]"
          onClick={() => void refresh()}
          type="button"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Refresh settings</span>
        </button>
      }
    >
      {error ? <RouteError message={error} onRetry={() => void refresh()} /> : null}
      {localError ? <RouteError message={localError} /> : null}
      {message ? (
        <div className="rounded-[var(--radius-card)] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700 shadow-[var(--shadow-card)]">
          {message}
        </div>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <form
          className="space-y-4 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-card)]"
          onSubmit={handleProfileSave}
        >
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Client Profile</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm text-[var(--foreground)]">Profile picture</span>
              {profileForm.photoUrl ? (
                <img
                  src={buildPortalAssetUrl(profileForm.photoUrl)}
                  alt="Client profile"
                  className="mb-3 h-20 w-20 rounded-2xl border border-[var(--border)] object-cover"
                />
              ) : null}
              <input
                className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--foreground)]"
                type="file"
                accept="image/*"
                onChange={(event) => void handleProfilePhotoChange(event.target.files?.[0])}
              />
              <p className="mt-2 text-xs text-[var(--muted)]">
                Upload a profile photo. Facility code, billing, balances, collections, invoices, and KG rates remain read-only.
              </p>
            </label>
            <label className="block">
              <span className="mb-2 block text-sm text-[var(--foreground)]">Profile image URL</span>
              <input
                className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--ring)]"
                onChange={(event) =>
                  setProfileForm((current) => ({ ...current, photoUrl: event.target.value }))
                }
                value={profileForm.photoUrl}
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm text-[var(--foreground)]">Full name</span>
              <input
                className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--ring)]"
                onChange={(event) =>
                  setProfileForm((current) => ({ ...current, fullName: event.target.value }))
                }
                value={profileForm.fullName}
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm text-[var(--foreground)]">Email</span>
              <input
                className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--ring)]"
                onChange={(event) =>
                  setProfileForm((current) => ({ ...current, email: event.target.value }))
                }
                type="email"
                value={profileForm.email}
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm text-[var(--foreground)]">Phone number</span>
              <input
                className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--ring)]"
                onChange={(event) =>
                  setProfileForm((current) => ({ ...current, phone: event.target.value }))
                }
                value={profileForm.phone}
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm text-[var(--foreground)]">Address</span>
              <input
                className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--ring)]"
                onChange={(event) =>
                  setProfileForm((current) => ({ ...current, address: event.target.value }))
                }
                value={profileForm.address}
              />
            </label>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              className="inline-flex items-center gap-2 rounded-2xl bg-[var(--primary)] px-4 py-3 text-sm font-medium text-white transition hover:bg-[var(--primary-strong)] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={profileBusy}
              type="submit"
              title="Save your editable client profile information"
            >
              <Save className="h-4 w-4" />
              {profileBusy ? "Saving..." : "Save profile"}
            </button>
            <button
              className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--surface-muted)] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={uploadingPhoto}
              type="button"
              title="Upload a new profile picture file"
            >
              <Upload className="h-4 w-4" />
              {uploadingPhoto ? "Uploading..." : "Profile image upload ready"}
            </button>
          </div>
        </form>

        <article className="space-y-4 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-card)]">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Preferences</h2>
          <button
            className="inline-flex items-center gap-2 rounded-2xl bg-[var(--primary)] px-4 py-3 text-sm font-medium text-white transition hover:bg-[var(--primary-strong)]"
            onClick={toggleTheme}
            type="button"
            title={`Switch to ${themeMode === "light" ? "dark" : "light"} mode`}
          >
            {themeMode === "light" ? <MoonStar className="h-4 w-4" /> : <SunMedium className="h-4 w-4" />}
            <span>Switch to {themeMode === "light" ? "dark" : "light"} mode</span>
          </button>
          <label className="block">
            <span className="mb-2 block text-sm text-[var(--foreground)]">Language</span>
            <select
              className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--ring)]"
              value={language}
              onChange={(event) => setLanguage(event.target.value as ClientLanguage)}
            >
              <option value="en-NG">English (Nigeria)</option>
              <option value="en-US">English (United States)</option>
            </select>
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ["inApp", "In-app alerts"],
              ["email", "Email alerts"],
              ["billing", "Billing updates"],
              ["complaints", "Complaint updates"],
              ["systemAlerts", "System alerts"],
            ].map(([key, label]) => (
              <label
                key={key}
                className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-sm"
              >
                <span>{label}</span>
                <input
                  checked={notificationPreferences[key as keyof NotificationPreferences]}
                  onChange={() => handlePreferenceToggle(key as keyof NotificationPreferences)}
                  type="checkbox"
                />
              </label>
            ))}
          </div>
          <button
            className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--surface-muted)] disabled:cursor-not-allowed disabled:opacity-60"
            onClick={handlePreferenceSave}
            type="button"
            disabled={preferenceBusy}
            title="Save your theme, language, and notification preferences"
          >
            <Save className="h-4 w-4" />
            {preferenceBusy ? "Saving..." : "Save preferences"}
          </button>
          <EmptyPanel text="Facility code, billing information, balances, collection records, invoice history, and KG rates remain protected and are managed from the operations system." />
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <form
          className="space-y-4 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-card)]"
          onSubmit={handlePasswordChange}
        >
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Security</h2>
          <label className="block">
            <span className="mb-2 block text-sm text-[var(--foreground)]">Current password</span>
            <input
              className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--ring)]"
              onChange={(event) =>
                setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))
              }
              type="password"
              value={passwordForm.currentPassword}
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm text-[var(--foreground)]">New password</span>
            <input
              className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--ring)]"
              onChange={(event) =>
                setPasswordForm((current) => ({ ...current, newPassword: event.target.value }))
              }
              type="password"
              value={passwordForm.newPassword}
            />
          </label>
          <button
            className="rounded-2xl bg-[var(--primary)] px-4 py-3 text-sm font-medium text-white transition hover:bg-[var(--primary-strong)] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={busy || !passwordForm.currentPassword || !passwordForm.newPassword}
            type="submit"
          >
            {busy ? "Updating..." : "Change password"}
          </button>
        </form>

        <article className="space-y-4 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-card)]">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Protected Records</h2>
          <EmptyPanel text="The following fields are intentionally read-only: Facility Code, Billing Information, Current Balance, Collection Records, Invoice History, and KG Rates." />
        </article>
      </section>

      <Controls
        filterOptions={["All", "Preference", "Security", "Permission", "Audit"]}
        filterValue={filter}
        onFilterChange={setFilter}
        onSearchChange={setSearch}
        searchPlaceholder="Search settings and account controls"
        searchValue={search}
      />

      <TableShell
        empty="No settings records match the selected search or filter."
        head={["Setting", "Value", "Scope"]}
        loading={loading && !recentActivity.length}
        rows={settingsRows.map((item) => [item.key, item.value, item.scope])}
      />
    </PageScaffold>
  );
}
