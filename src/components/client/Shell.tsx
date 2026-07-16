"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { Bell, CalendarRange, ClipboardList, FileText, HeartPulse, LayoutDashboard, LogOut, Menu, Receipt, Settings, UserCircle2, Wallet } from "lucide-react";
import {
  PERMISSIONS,
  applyThemeMode,
  hasAnyPermission,
  loadBranding,
  loadSession,
  loadThemeMode,
} from "@/lib/portal";

const SIDEBAR_COLLAPSED_KEY = "jpmwoms_client_sidebar_collapsed";

export function ClientShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1";
  });
  const [branding, setBranding] = useState(() => loadBranding());
  const session = useMemo(() => loadSession(), []);
  useEffect(() => {
    applyThemeMode(loadThemeMode(session?.user.id));
    if (typeof window !== "undefined") {
      const syncBranding = () => setBranding(loadBranding());
      window.addEventListener("storage", syncBranding);
      window.addEventListener("jpmwoms-branding-update", syncBranding);
      return () => {
        window.removeEventListener("storage", syncBranding);
        window.removeEventListener("jpmwoms-branding-update", syncBranding);
      };
    }
  }, []);

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
    }
  }
  function isActive(href: string) {
    return pathname?.startsWith(href);
  }
  function logout() {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("jpmwoms_client_session");
      window.location.href = "/login";
    }
  }
  const items = [
    { label: "Dashboard", href: "/client/dashboard", icon: LayoutDashboard, permissions: [] },
    { label: "Profile", href: "/client/profile", icon: UserCircle2, permissions: [] },
    { label: "Collections", href: "/client/collections", icon: CalendarRange, permissions: [PERMISSIONS.COLLECTIONS_VIEW] },
    { label: "Invoices", href: "/client/invoices", icon: Receipt, permissions: [PERMISSIONS.INVOICES_VIEW] },
    {
      label: "Payments",
      href: "/client/payments",
      icon: Wallet,
      permissions: [PERMISSIONS.PAYMENTS_VIEW, PERMISSIONS.PAYMENTS_CREATE],
    },
    { label: "Receipts", href: "/client/receipts", icon: FileText, permissions: [PERMISSIONS.RECEIPTS_VIEW] },
    {
      label: "Complaints",
      href: "/client/complaints",
      icon: ClipboardList,
      permissions: [PERMISSIONS.COMPLAINTS_VIEW, PERMISSIONS.COMPLAINTS_CREATE],
    },
    { label: "Notifications", href: "/client/notifications", icon: Bell, permissions: [PERMISSIONS.NOTIFICATIONS_VIEW] },
    { label: "Documents", href: "/client/documents", icon: FileText, permissions: [PERMISSIONS.DOCUMENTS_VIEW] },
    { label: "Settings", href: "/client/settings", icon: Settings, permissions: [] },
  ];
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div
        className={`fixed inset-0 z-40 bg-black/40 transition lg:hidden ${
          sidebarOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setSidebarOpen(false)}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-full flex-col border-r border-white/10 bg-[var(--sidebar)] text-white shadow-2xl transition-all duration-300 ${
          collapsed ? "w-[96px]" : "w-[272px]"
        } ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-5">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{branding.systemName}</p>
          </div>
          <button
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 text-slate-300 transition hover:bg-white/5 lg:hidden"
            onClick={() => setSidebarOpen(false)}
            type="button"
            title="Close navigation menu"
            aria-label="Close navigation menu"
          >
            <Menu className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-4">
          {items.map((item) => {
            const allowed = hasAnyPermission(session, item.permissions);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? `${item.label}: open this section` : `${item.label}: open this section`}
                aria-label={`${item.label}: open this section`}
                className={`flex items-center gap-3 rounded-2xl px-3 py-3 text-sm transition ${
                  isActive(item.href) ? "bg-white/12 text-white" : "text-slate-200 hover:bg-white/8 hover:text-white"
                } ${collapsed ? "justify-center" : ""} ${allowed ? "" : "opacity-70"}`}
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!collapsed ? <span>{item.label}</span> : null}
              </Link>
            );
          })}
        </div>
        <div className="border-t border-white/10 px-3 py-4">
          <button
            className={`mb-2 flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm text-slate-200 transition hover:bg-white/8 hover:text-white ${
              collapsed ? "justify-center" : ""
            }`}
            onClick={logout}
            type="button"
            title="Sign out of the client portal"
            aria-label="Sign out of the client portal"
          >
            <LogOut className="h-4 w-4" />
            {!collapsed ? <span>Logout</span> : null}
          </button>
          <button
            className={`hidden w-full items-center gap-3 rounded-2xl border border-white/10 px-3 py-3 text-left text-sm text-slate-300 transition hover:bg-white/5 lg:flex ${
              collapsed ? "justify-center" : ""
            }`}
            onClick={toggleCollapsed}
            type="button"
            title={collapsed ? "Expand sidebar navigation" : "Collapse sidebar navigation"}
            aria-label={collapsed ? "Expand sidebar navigation" : "Collapse sidebar navigation"}
          >
            <Menu className="h-4 w-4" />
            {!collapsed ? <span>Collapse sidebar</span> : null}
          </button>
        </div>
      </aside>
      <div className={`${collapsed ? "lg:pl-[96px]" : "lg:pl-[272px]"} transition-all duration-300`}>
        <div className="mx-auto min-h-screen w-full max-w-[1600px] px-4 py-4 sm:px-6 lg:px-8">
          <div className="mb-4 flex items-center justify-between gap-3">
            <button
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-card)] lg:hidden"
              onClick={() => setSidebarOpen(true)}
              type="button"
              title="Open navigation menu"
              aria-label="Open navigation menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex-1" />
            <Link className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--surface-muted)]" href="/client/dashboard" title="Open the client dashboard overview">
              <HeartPulse className="h-4 w-4" />
              <span>Dashboard</span>
            </Link>
            <Link className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--surface-muted)]" href="/" title="Return to the public home page">
              <LayoutDashboard className="h-4 w-4" />
              <span>Home</span>
            </Link>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
