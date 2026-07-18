"use client";

import {
  Bell,
  CalendarRange,
  ClipboardList,
  FileText,
  HeartPulse,
  LayoutDashboard,
  LogOut,
  Menu,
  MoonStar,
  Receipt,
  ShieldCheck,
  SunMedium,
  UserCircle2,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  applyThemeMode,
  apiFetch,
  buildBrandingFromSettings,
  clearSession,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatNumber,
  loadBranding,
  loadSession,
  loadThemeMode,
  saveSession,
  saveBranding,
  saveThemeMode,
  type BrandingConfig,
  type Session,
  type ThemeMode,
} from "@/lib/portal";

type Facility = {
  id: string;
  name: string;
  code: string;
  type: string;
  billingType: string;
  collectionFrequency: string;
  outstandingBalance: number;
  contactPerson: string;
  phone: string;
  email: string;
};

type Collection = {
  id: string;
  facilityId: string;
  collectionTime: string;
  weightKg: number;
  binCount: number;
  wasteType: string;
  manifestNo: string;
  syncStatus: string;
};

type Invoice = {
  id: string;
  invoiceNo: string;
  facilityId: string;
  amountDue: number;
  status: string;
  dueDate: string;
};

type Payment = {
  id: string;
  amount: number;
  paymentDate: string;
  method: string;
  reference: string;
  status: string;
};

type Complaint = {
  id: string;
  reference: string;
  type: string;
  description: string;
  status: string;
  createdAt: string;
};

type Notification = {
  id: string;
  title: string;
  message: string;
  channel: string;
  status: string;
  createdAt: string;
  readAt?: string | null;
};

type Visit = {
  id: string;
  facilityId: string;
  purpose: string;
  status: string;
  createdAt: string;
  staff?: { fullName: string } | null;
};

type ServiceMonitoring = {
  facilityId: string;
  slaScore: number;
  complianceRate: number;
  missedCollections: number;
  serviceStatus: string;
  lastCollectionDate: string;
};

type Settings = {
  companyName?: string | null;
  mainLogo?: string | null;
  invoiceLogo?: string | null;
  reportLogo?: string | null;
};

export default function DashboardPage() {
  const initialState = useMemo(() => getInitialDashboardState(), []);
  const [session] = useState<Session | null>(initialState.session);
  const [themeMode, setThemeMode] = useState<ThemeMode>(initialState.themeMode);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [clock, setClock] = useState(() => new Date());
  const [branding, setBranding] = useState<BrandingConfig>(() => loadBranding());
  const [facility, setFacility] = useState<Facility | null>(null);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [serviceMonitoring, setServiceMonitoring] = useState<ServiceMonitoring | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [complaintForm, setComplaintForm] = useState({
    type: "SERVICE",
    description: "Please review our recent collection schedule.",
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
  });

  useEffect(() => {
    if (initialState.shouldRedirect) {
      redirectToLogin();
    }
    applyThemeMode(themeMode);
  }, [initialState.shouldRedirect, themeMode]);

  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const refreshDashboard = useCallback(async () => {
    if (!session?.user.facilityId) {
      return;
    }

    try {
      const [
        facilityResponse,
        collectionsResponse,
        invoicesResponse,
        paymentsResponse,
        complaintsResponse,
        notificationsResponse,
        visitsResponse,
        monitoringResponse,
        settingsResponse,
      ] = await Promise.all([
        apiFetch<Facility>(
          `/facilities/${session.user.facilityId}`,
          undefined,
          session.accessToken,
        ),
        apiFetch<Collection[]>("/collections", undefined, session.accessToken),
        apiFetch<Invoice[]>(
          `/invoices?facilityId=${session.user.facilityId}`,
          undefined,
          session.accessToken,
        ),
        apiFetch<Payment[]>(
          `/payments?facilityId=${session.user.facilityId}`,
          undefined,
          session.accessToken,
        ),
        apiFetch<Complaint[]>(
          `/complaints?facilityId=${session.user.facilityId}`,
          undefined,
          session.accessToken,
        ),
        apiFetch<Notification[]>(
          `/notifications?userId=${session.user.id}`,
          undefined,
          session.accessToken,
        ),
        apiFetch<Visit[]>(
          `/visits?facilityId=${session.user.facilityId}`,
          undefined,
          session.accessToken,
        ),
        apiFetch<ServiceMonitoring>(
          `/facilities/${session.user.facilityId}/service-monitoring`,
          undefined,
          session.accessToken,
        ),
        apiFetch<Settings | null>("/settings", undefined, session.accessToken).catch(() => null),
      ]);

      setFacility(facilityResponse);
      setCollections(
        collectionsResponse.filter(
          (collection) => collection.facilityId === session.user.facilityId,
        ),
      );
      setInvoices(invoicesResponse);
      setPayments(paymentsResponse);
      setComplaints(complaintsResponse);
      setNotifications(notificationsResponse);
      setVisits(visitsResponse);
      setServiceMonitoring(monitoringResponse);
      const nextBranding = buildBrandingFromSettings(settingsResponse, loadBranding());
      setBranding(nextBranding);
      saveBranding(nextBranding);
      setError(null);
    } catch (dashboardError) {
      setError(
        dashboardError instanceof Error
          ? dashboardError.message
          : "Could not load the client dashboard.",
      );
    }
  }, [session]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void refreshDashboard();
    }, 0);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [refreshDashboard]);

  async function handleSubmitComplaint(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.user.facilityId) {
      return;
    }

    setBusy(true);
    setMessage(null);
    setError(null);

    try {
      await apiFetch(
        "/complaints",
        {
          method: "POST",
          body: JSON.stringify({
            facilityId: session.user.facilityId,
            submittedById: session.user.id,
            type: complaintForm.type,
            description: complaintForm.description,
          }),
        },
        session.accessToken,
      );

      setMessage("Complaint submitted successfully.");
      await refreshDashboard();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Complaint submission failed.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleChangePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) {
      return;
    }

    setBusy(true);
    setMessage(null);
    setError(null);

    try {
      const response = await apiFetch<{ message: string }>(
        "/auth/change-password",
        {
          method: "POST",
          body: JSON.stringify(passwordForm),
        },
        session.accessToken,
      );
      if (session.user.status === "PASSWORD_CHANGE_REQUIRED") {
        saveSession({
          ...session,
          user: {
            ...session.user,
            status: "ACTIVE",
          },
        });
        window.location.reload();
        return;
      }
      setMessage(response.message);
    } catch (passwordError) {
      setError(
        passwordError instanceof Error
          ? passwordError.message
          : "Password change failed.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function markNotificationRead(notificationId: string) {
    if (!session) {
      return;
    }

    try {
      await apiFetch(
        `/notifications/${notificationId}/read`,
        { method: "POST" },
        session.accessToken,
      );
      await refreshDashboard();
    } catch (notificationError) {
      setError(
        notificationError instanceof Error
          ? notificationError.message
          : "Could not update notification.",
      );
    }
  }

  function logout() {
    clearSession();
    redirectToLogin();
  }

  function toggleTheme() {
    if (!session) {
      return;
    }
    const nextMode: ThemeMode = themeMode === "light" ? "dark" : "light";
    setThemeMode(nextMode);
    applyThemeMode(nextMode);
    saveThemeMode(nextMode, session.user.id);
  }

  function scrollToSection(sectionId: string) {
    const element = document.getElementById(sectionId);
    element?.scrollIntoView({ behavior: "smooth", block: "start" });
    setSidebarOpen(false);
  }

  const totalDue = invoices.reduce(
    (sum, invoice) => sum + Number(invoice.amountDue),
    0,
  );
  const totalCollected = collections.reduce(
    (sum, collection) => sum + Number(collection.weightKg),
    0,
  );
  const requiresPasswordChange =
    session?.user.status === "PASSWORD_CHANGE_REQUIRED";

  if (!session) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] px-6 py-5 text-sm text-[var(--muted)] shadow-[var(--shadow-soft)]">
          Loading client workspace...
        </div>
      </main>
    );
  }

  if (requiresPasswordChange) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-transparent px-6 py-10">
        <div className="w-full max-w-xl rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-8 shadow-[var(--shadow-soft)]">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Password change is required before you can continue. Use the temporary password from the onboarding email as your current password.
          </div>
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
          <div className="mt-6">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--primary)]">First Login Security</p>
            <h1 className="mt-2 text-3xl font-semibold text-[var(--foreground)]">Change your password</h1>
            <p className="mt-2 text-sm text-[var(--muted)]">
              This account is using a temporary onboarding password. Create a new password now to unlock the facility workspace.
            </p>
          </div>
          <form className="mt-6 space-y-4" onSubmit={handleChangePassword}>
            <Field
              label="Current password"
              type="password"
              value={passwordForm.currentPassword}
              onChange={(value) =>
                setPasswordForm((current) => ({ ...current, currentPassword: value }))
              }
            />
            <Field
              label="New password"
              type="password"
              value={passwordForm.newPassword}
              onChange={(value) =>
                setPasswordForm((current) => ({ ...current, newPassword: value }))
              }
            />
            <button
              className="rounded-2xl bg-sky-400 px-4 py-3 text-sm font-medium text-slate-950 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={busy}
              type="submit"
            >
              {busy ? "Updating..." : "Update Password"}
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-transparent">
      <div
        className={`fixed inset-0 z-40 bg-black/40 transition lg:hidden ${
          sidebarOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setSidebarOpen(false)}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[272px] flex-col bg-[#111111] text-white shadow-2xl transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="border-b border-white/10 px-5 py-5">
          <p className="text-sm font-semibold">{branding.systemName}</p>
          <p className="mt-1 text-xs text-slate-400">{branding.companyName}</p>
        </div>
        <div className="flex-1 space-y-6 px-4 py-5">
          <SidebarGroup title="Dashboard" items={[{ label: "Overview", icon: LayoutDashboard, onClick: () => scrollToSection("top") }]} />
          <SidebarGroup title="Services" items={[{ label: "Collections", icon: CalendarRange, onClick: () => scrollToSection("collections") }, { label: "Invoices", icon: Receipt, onClick: () => scrollToSection("billing") }, { label: "Complaints", icon: ClipboardList, onClick: () => scrollToSection("complaints") }]} />
          <SidebarGroup title="Portal" items={[{ label: "Notifications", icon: Bell, onClick: () => scrollToSection("notifications") }, { label: "Documents", icon: FileText, onClick: () => scrollToSection("documents") }, { label: "Profile", icon: UserCircle2, onClick: () => scrollToSection("profile") }]} />
        </div>
        <div className="border-t border-white/10 px-4 py-4">
          <button className="flex w-full items-center gap-3 rounded-2xl border border-white/10 px-4 py-3 text-sm text-white transition hover:bg-white/5" onClick={logout} type="button">
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <div className="lg:pl-[272px]">
        <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col gap-6 px-4 py-4 sm:px-6 lg:px-8">
          <header
            id="top"
            className="rounded-[2rem] border border-[var(--border)] bg-[color:color-mix(in_srgb,var(--surface)_92%,transparent)] p-6 shadow-[var(--shadow-soft)] backdrop-blur"
          >
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="flex items-start gap-3">
                <button className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 text-[var(--foreground)] lg:hidden" onClick={() => setSidebarOpen(true)} type="button">
                  <Menu className="h-5 w-5" />
                </button>
                <div className="rounded-2xl bg-[var(--primary)] p-3 text-white shadow-[var(--shadow-soft)]">
                  <HeartPulse className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--primary)]">Client Portal</p>
                  <h1 className="mt-2 text-3xl font-semibold text-[var(--foreground)]">
                    {facility?.name ?? "Hospital service center"}
                  </h1>
                  <p className="mt-2 max-w-3xl text-sm text-[var(--muted)]">
                    Signed in as {session.user.fullName}. This workspace presents service status, collections, billing, complaints, notifications, and profile controls in a premium healthcare portal layout.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button className={buttonClassName} onClick={() => scrollToSection("collections")} type="button">
                      <CalendarRange className="h-4 w-4" />
                      <span>Collection Calendar</span>
                    </button>
                    <button className={ghostButtonClassName} onClick={() => scrollToSection("billing")} type="button">
                      <Receipt className="h-4 w-4" />
                      <span>Billing Center</span>
                    </button>
                    <button className={ghostButtonClassName} onClick={() => scrollToSection("complaints")} type="button">
                      <ClipboardList className="h-4 w-4" />
                      <span>Complaint Center</span>
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Badge label={themeMode === "light" ? "Light Mode" : "Dark Mode"} tone="blue" />
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-2 text-right">
                  <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Africa/Lagos</p>
                  <p className="text-sm font-semibold text-[var(--foreground)]">{formatPortalClock(clock)}</p>
                </div>
                <button className={ghostButtonClassName} onClick={toggleTheme} type="button">
                  {themeMode === "light" ? <MoonStar className="h-4 w-4" /> : <SunMedium className="h-4 w-4" />}
                  <span>Switch Theme</span>
                </button>
                <button className={ghostButtonClassName} onClick={() => void refreshDashboard()} type="button">
                  <Bell className="h-4 w-4" />
                  <span>Refresh</span>
                </button>
                <Link className={ghostButtonClassName} href="/">
                  <LayoutDashboard className="h-4 w-4" />
                  <span>Home</span>
                </Link>
                <button className={ghostButtonClassName} onClick={logout} type="button">
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </header>

      {message ? (
        <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700 shadow-[var(--shadow-soft)]">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 shadow-[var(--shadow-soft)]">
          {error}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Outstanding Balance"
          value={formatCurrency(facility?.outstandingBalance)}
          detail={`Current invoices total ${formatCurrency(totalDue)}`}
        />
        <StatCard
          title="Collected KG"
          value={formatNumber(totalCollected)}
          detail={`${collections.length} collection records`}
        />
        <StatCard
          title="Invoices"
          value={String(invoices.length)}
          detail={`${payments.length} payment records`}
        />
        <StatCard
          title="SLA Score"
          value={`${serviceMonitoring?.slaScore ?? 0}%`}
          detail={`${serviceMonitoring?.serviceStatus ?? "N/A"} service status`}
        />
      </section>

      <section id="profile" className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Panel title="Facility Profile" subtitle="Facility details and service monitoring">
          {facility ? (
            <div className="grid gap-4 md:grid-cols-2">
              <InfoRow label="Facility code" value={facility.code} />
              <InfoRow label="Facility type" value={facility.type} />
              <InfoRow label="Billing type" value={facility.billingType} />
              <InfoRow label="Collection frequency" value={facility.collectionFrequency} />
              <InfoRow label="Contact person" value={facility.contactPerson} />
              <InfoRow label="Phone" value={facility.phone} />
              <InfoRow label="Email" value={facility.email} />
              <InfoRow
                label="Last collection"
                value={formatDateTime(serviceMonitoring?.lastCollectionDate)}
              />
              <InfoRow
                label="Compliance rate"
                value={`${serviceMonitoring?.complianceRate ?? 0}%`}
              />
              <InfoRow
                label="Missed collections"
                value={String(serviceMonitoring?.missedCollections ?? 0)}
              />
            </div>
          ) : (
            <EmptyState text="Facility profile is loading." />
          )}
        </Panel>

        <Panel id="notifications" title="Notifications" subtitle="In-app and email-ready notifications">
          <div className="space-y-3">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className="rounded-2xl border border-white/10 bg-slate-950/50 p-4"
              >
                <p className="font-medium text-white">{notification.title}</p>
                <p className="mt-1 text-sm text-slate-300">{notification.message}</p>
                <p className="mt-2 text-xs text-slate-400">
                  {notification.channel} | {formatDateTime(notification.createdAt)}
                </p>
                {!notification.readAt ? (
                  <button
                    className="mt-3 rounded-2xl border border-white/10 px-4 py-2 text-sm text-white transition hover:bg-white/5"
                    onClick={() => void markNotificationRead(notification.id)}
                    type="button"
                  >
                    Mark as read
                  </button>
                ) : null}
              </div>
            ))}
            {!notifications.length ? (
              <EmptyState text="No notifications available." />
            ) : null}
          </div>
        </Panel>
      </section>

      <section id="collections" className="grid gap-6 xl:grid-cols-3">
        <Panel title="Collections" subtitle="Collection history">
          <div className="space-y-3">
            {collections.map((collection) => (
              <ListRow
                key={collection.id}
                title={`${formatNumber(collection.weightKg)} KG - ${collection.manifestNo}`}
                meta={`${collection.wasteType} | ${formatDateTime(
                  collection.collectionTime,
                )} | ${collection.syncStatus}`}
              />
            ))}
            {!collections.length ? (
              <EmptyState text="No collections recorded yet." />
            ) : null}
          </div>
        </Panel>

        <Panel id="billing" title="Invoices" subtitle="Invoice history and outstanding totals">
          <div className="space-y-3">
            {invoices.map((invoice) => (
              <ListRow
                key={invoice.id}
                title={`${invoice.invoiceNo} - ${formatCurrency(invoice.amountDue)}`}
                meta={`${invoice.status} | Due ${formatDate(invoice.dueDate)}`}
              />
            ))}
            {!invoices.length ? (
              <EmptyState text="No invoices available." />
            ) : null}
          </div>
        </Panel>

        <Panel title="Payments" subtitle="Verified and pending payments">
          <div className="space-y-3">
            {payments.map((payment) => (
              <ListRow
                key={payment.id}
                title={`${payment.reference} - ${formatCurrency(payment.amount)}`}
                meta={`${payment.method} | ${payment.status} | ${formatDateTime(
                  payment.paymentDate,
                )}`}
              />
            ))}
            {!payments.length ? (
              <EmptyState text="No payments available." />
            ) : null}
          </div>
        </Panel>
      </section>

      <section id="complaints" className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Panel title="Complaint Center" subtitle="Submit and track service requests">
          <form className="space-y-3" onSubmit={handleSubmitComplaint}>
            <label className="block">
              <span className="mb-2 block text-sm text-slate-300">Complaint type</span>
              <select
                className={inputClassName}
                onChange={(event) =>
                  setComplaintForm((current) => ({
                    ...current,
                    type: event.target.value,
                  }))
                }
                value={complaintForm.type}
              >
                {["SERVICE", "BILLING", "STAFF", "ENVIRONMENTAL"].map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-2 block text-sm text-slate-300">Description</span>
              <textarea
                className={`${inputClassName} min-h-28 resize-y`}
                onChange={(event) =>
                  setComplaintForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                value={complaintForm.description}
              />
            </label>
            <button
              className="rounded-2xl bg-sky-400 px-4 py-3 text-sm font-medium text-slate-950 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={busy}
              type="submit"
            >
              Submit complaint
            </button>
          </form>
          <div className="mt-4 space-y-3">
            {complaints.map((complaint) => (
              <ListRow
                key={complaint.id}
                title={`${complaint.reference} - ${complaint.type}`}
                meta={`${complaint.status} | ${formatDateTime(complaint.createdAt)}`}
              />
            ))}
          </div>
        </Panel>

        <Panel id="documents" title="Visits And Security" subtitle="Facility visits and password management">
          <div className="space-y-3">
            {visits.map((visit) => (
              <ListRow
                key={visit.id}
                title={visit.purpose}
                meta={`${visit.staff?.fullName ?? "Staff"} | ${visit.status} | ${formatDateTime(
                  visit.createdAt,
                )}`}
              />
            ))}
            {!visits.length ? (
              <EmptyState text="No visit records available yet." />
            ) : null}
          </div>
          <form className="mt-6 space-y-3" onSubmit={handleChangePassword}>
            <Field
              label="Current password"
              type="password"
              value={passwordForm.currentPassword}
              onChange={(value) =>
                setPasswordForm((current) => ({ ...current, currentPassword: value }))
              }
            />
            <Field
              label="New password"
              type="password"
              value={passwordForm.newPassword}
              onChange={(value) =>
                setPasswordForm((current) => ({ ...current, newPassword: value }))
              }
            />
            <button
              className="rounded-2xl bg-sky-400 px-4 py-3 text-sm font-medium text-slate-950 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={busy}
              type="submit"
            >
              Change password
            </button>
          </form>
        </Panel>
      </section>
        </div>
      </div>
    </main>
  );
}

function redirectToLogin() {
  if (typeof window !== "undefined") {
    window.location.replace("/login");
  }
}

function getInitialDashboardState() {
  const activeSession = loadSession();
  if (!activeSession) {
    return {
      session: null,
      themeMode: "light" as ThemeMode,
      shouldRedirect: true,
    };
  }

  return {
    session: activeSession,
    themeMode: loadThemeMode(activeSession.user.id),
    shouldRedirect: false,
  };
}

function Panel({
  id,
  title,
  subtitle,
  children,
}: {
  id?: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="rounded-[1.75rem] border border-[var(--border)] bg-[color:color-mix(in_srgb,var(--surface)_94%,transparent)] p-6 shadow-[var(--shadow-card)] backdrop-blur"
    >
      <h2 className="text-xl font-semibold text-[var(--foreground)]">{title}</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">{subtitle}</p>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function StatCard({
  title,
  value,
  detail,
}: {
  title: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-card)]">
      <p className="text-sm text-[var(--muted)]">{title}</p>
      <h2 className="mt-2 text-3xl font-semibold text-[var(--foreground)]">{value}</h2>
      <p className="mt-2 text-sm text-[var(--muted)]">{detail}</p>
    </article>
  );
}

function ListRow({ title, meta }: { title: string; meta: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
      <p className="font-medium text-[var(--foreground)]">{title}</p>
      <p className="mt-1 text-sm text-[var(--muted)]">{meta}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
      <p className="text-sm text-[var(--muted)]">{label}</p>
      <p className="mt-1 font-medium text-[var(--foreground)]">{value}</p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-muted)] px-4 py-5 text-sm text-[var(--muted)]">
      {text}
    </div>
  );
}

function Badge({
  label,
  tone,
}: {
  label: string;
  tone: "blue" | "green";
}) {
  const classes = {
    blue: "border-sky-200 bg-sky-50 text-sky-700",
    green: "border-emerald-200 bg-emerald-50 text-emerald-700",
  }[tone];

  return <span className={`rounded-full border px-3 py-1 text-xs font-medium ${classes}`}>{label}</span>;
}

function SidebarGroup({
  title,
  items,
}: {
  title: string;
  items: Array<{ label: string; icon: LucideIcon; onClick: () => void }>;
}) {
  return (
    <div>
      <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{title}</p>
      <div className="space-y-1">
        {items.map((item) => (
          <button
            key={item.label}
            className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm text-slate-200 transition hover:bg-white/7 hover:text-white"
            onClick={item.onClick}
            type="button"
          >
            <item.icon className="h-4 w-4" />
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function formatPortalClock(value: Date) {
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Lagos",
  }).format(value);
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
      <span className="mb-2 block text-sm text-[var(--foreground)]">{label}</span>
      <input
        className={inputClassName}
        onChange={(event) => onChange(event.target.value)}
        type={type}
        value={value}
      />
    </label>
  );
}

const inputClassName =
  "w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--ring)]";
const buttonClassName =
  "inline-flex items-center gap-2 rounded-2xl bg-[var(--primary)] px-4 py-3 text-sm font-medium text-white transition hover:bg-[var(--primary-strong)] disabled:cursor-not-allowed disabled:opacity-60";
const ghostButtonClassName =
  "inline-flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--surface-muted)]";
