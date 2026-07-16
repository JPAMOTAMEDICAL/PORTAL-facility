"use client";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:4000";
export const API_PROXY_PREFIX = "/api/backend";
const SESSION_TOKEN_COOKIE = "jpmwoms_client_access_token";

export const CLIENT_SESSION_KEY = "jpmwoms_client_session";
export const BRANDING_CACHE_KEY = "jpmwoms_branding_cache";
export const THEME_MODE_KEY = "jpmwoms_theme_mode";
export const LANGUAGE_PREFERENCE_KEY = "jpmwoms_language";
export const NOTIFICATION_PREFERENCE_KEY = "jpmwoms_notification_preferences";

export type Role =
  | "SUPER_ADMIN"
  | "OPERATIONS_MANAGER"
  | "CLIENT_SERVICE_OFFICER"
  | "ACCOUNTANT"
  | "DRIVER"
  | "HOSPITAL_ADMIN";

export type SessionUser = {
  id: string;
  email: string;
  username?: string | null;
  fullName: string;
  role: Role;
  permissions?: string[];
  facilityId?: string | null;
  phone?: string | null;
  status?: string;
  lastLoginAt?: string | Date | null;
};

export type Session = {
  accessToken: string;
  user: SessionUser;
  rememberMe: boolean;
  expiresAt: number;
};

export const PERMISSIONS = {
  DOCUMENTS_VIEW: "DOCUMENTS_VIEW",
  DOCUMENTS_UPLOAD: "DOCUMENTS_UPLOAD",
  DOCUMENTS_FILE_VIEW: "DOCUMENTS_FILE_VIEW",
  DOCUMENTS_FILE_DOWNLOAD: "DOCUMENTS_FILE_DOWNLOAD",
  INVOICE_DOC_VIEW: "INVOICE_DOC_VIEW",
  INVOICE_DOC_DOWNLOAD: "INVOICE_DOC_DOWNLOAD",
  RECEIPT_DOC_VIEW: "RECEIPT_DOC_VIEW",
  RECEIPT_DOC_DOWNLOAD: "RECEIPT_DOC_DOWNLOAD",
  COLLECTIONS_VIEW: "COLLECTIONS_VIEW",
  INVOICES_VIEW: "INVOICES_VIEW",
  PAYMENTS_VIEW: "PAYMENTS_VIEW",
  PAYMENTS_CREATE: "PAYMENTS_CREATE",
  RECEIPTS_VIEW: "RECEIPTS_VIEW",
  COMPLAINTS_CREATE: "COMPLAINTS_CREATE",
  COMPLAINTS_VIEW: "COMPLAINTS_VIEW",
  NOTIFICATIONS_VIEW: "NOTIFICATIONS_VIEW",
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export type ThemeMode = "light" | "dark";
export type ClientLanguage = "en-NG" | "en-US";
export type NotificationPreferences = {
  inApp: boolean;
  email: boolean;
  billing: boolean;
  complaints: boolean;
  systemAlerts: boolean;
};

export type BrandingConfig = {
  companyName: string;
  systemName: string;
  tagline: string;
  primaryLogo?: string | null;
  secondaryLogo?: string | null;
  governmentLogo?: string | null;
  partnerLogo?: string | null;
  adminHeroImage?: string | null;
  clientHeroImage?: string | null;
  invoiceTemplateUrl?: string | null;
  receiptTemplateUrl?: string | null;
  digitalSignature?: string | null;
  invoiceFooter?: string | null;
  receiptFooter?: string | null;
  colorTheme?: string | null;
};

type ApiError = {
  message?: string | string[];
  error?: string;
};

export const defaultBranding: BrandingConfig = {
  companyName: "JP Amota Medical Waste",
  systemName: "JPMWOMS",
  tagline: "Healthcare waste operations and compliance command center",
  primaryLogo: null,
  secondaryLogo: null,
  governmentLogo: null,
  partnerLogo: null,
  adminHeroImage: null,
  clientHeroImage: null,
  invoiceTemplateUrl: null,
  receiptTemplateUrl: null,
  digitalSignature: null,
  invoiceFooter: null,
  receiptFooter: null,
  colorTheme: null,
};

export function loadSession(): Session | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(CLIENT_SESSION_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Session;
    if (parsed.expiresAt <= Date.now()) {
      clearSession();
      return null;
    }
    persistSessionCookie(parsed.accessToken, parsed.expiresAt);
    return parsed;
  } catch {
    clearSession();
    return null;
  }
}

export function saveSession(session: Session) {
  window.localStorage.setItem(CLIENT_SESSION_KEY, JSON.stringify(session));
  persistSessionCookie(session.accessToken, session.expiresAt);
}

export function clearSession() {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(CLIENT_SESSION_KEY);
    clearSessionCookie();
  }
}

export function loadThemeMode(userId?: string | null): ThemeMode {
  if (typeof window === "undefined") {
    return "light";
  }

  const key = themeStorageKey(userId);
  const stored = window.localStorage.getItem(key);
  return stored === "dark" ? "dark" : "light";
}

export function saveThemeMode(mode: ThemeMode, userId?: string | null) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(themeStorageKey(userId), mode);
  window.localStorage.setItem(THEME_MODE_KEY, mode);
}

export function applyThemeMode(mode: ThemeMode) {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.dataset.theme = mode;
  document.documentElement.style.colorScheme = mode;
}

export function loadLanguagePreference(userId?: string | null): ClientLanguage {
  if (typeof window === "undefined") {
    return "en-NG";
  }

  const stored = window.localStorage.getItem(languageStorageKey(userId));
  return stored === "en-US" ? "en-US" : "en-NG";
}

export function saveLanguagePreference(
  language: ClientLanguage,
  userId?: string | null,
) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(languageStorageKey(userId), language);
  document.documentElement.lang = language;
}

export function loadNotificationPreferences(
  userId?: string | null,
): NotificationPreferences {
  if (typeof window === "undefined") {
    return defaultNotificationPreferences;
  }

  const raw = window.localStorage.getItem(notificationPreferenceKey(userId));
  if (!raw) {
    return defaultNotificationPreferences;
  }

  try {
    return {
      ...defaultNotificationPreferences,
      ...(JSON.parse(raw) as Partial<NotificationPreferences>),
    };
  } catch {
    return defaultNotificationPreferences;
  }
}

export function saveNotificationPreferences(
  preferences: NotificationPreferences,
  userId?: string | null,
) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    notificationPreferenceKey(userId),
    JSON.stringify(preferences),
  );
}

function themeStorageKey(userId?: string | null) {
  return userId ? `${THEME_MODE_KEY}:${userId}` : THEME_MODE_KEY;
}

function languageStorageKey(userId?: string | null) {
  return userId ? `${LANGUAGE_PREFERENCE_KEY}:${userId}` : LANGUAGE_PREFERENCE_KEY;
}

function notificationPreferenceKey(userId?: string | null) {
  return userId
    ? `${NOTIFICATION_PREFERENCE_KEY}:${userId}`
    : NOTIFICATION_PREFERENCE_KEY;
}

export function loadBranding(): BrandingConfig {
  if (typeof window === "undefined") {
    return defaultBranding;
  }

  const raw = window.localStorage.getItem(BRANDING_CACHE_KEY);
  if (!raw) {
    return defaultBranding;
  }

  try {
    return normalizeBrandingAssetUrls({
      ...defaultBranding,
      ...(JSON.parse(raw) as Partial<BrandingConfig>),
    });
  } catch {
    return defaultBranding;
  }
}

export function saveBranding(branding: BrandingConfig) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    BRANDING_CACHE_KEY,
    JSON.stringify(normalizeBrandingAssetUrls(branding)),
  );
  window.dispatchEvent(new Event("jpmwoms-branding-update"));
}

export function buildBrandingFromSettings(
  settings?: {
    companyName?: string | null;
    systemName?: string | null;
    tagline?: string | null;
    mainLogo?: string | null;
    secondaryLogo?: string | null;
    tertiaryLogo?: string | null;
    invoiceLogo?: string | null;
    reportLogo?: string | null;
    adminHeroImage?: string | null;
    clientHeroImage?: string | null;
    invoiceTemplateUrl?: string | null;
    receiptTemplateUrl?: string | null;
    digitalSignature?: string | null;
    invoiceFooter?: string | null;
    receiptFooter?: string | null;
    colorTheme?: string | null;
  } | null,
  overrides?: Partial<BrandingConfig>,
): BrandingConfig {
  return normalizeBrandingAssetUrls({
    ...defaultBranding,
    companyName: settings?.companyName || overrides?.companyName || defaultBranding.companyName,
    systemName: settings?.systemName || overrides?.systemName || defaultBranding.systemName,
    tagline: settings?.tagline || overrides?.tagline || defaultBranding.tagline,
    primaryLogo: settings?.mainLogo || overrides?.primaryLogo || null,
    secondaryLogo: settings?.secondaryLogo || overrides?.secondaryLogo || settings?.invoiceLogo || null,
    governmentLogo: settings?.tertiaryLogo || overrides?.governmentLogo || null,
    partnerLogo: overrides?.partnerLogo || settings?.reportLogo || null,
    adminHeroImage: settings?.adminHeroImage || overrides?.adminHeroImage || null,
    clientHeroImage: settings?.clientHeroImage || overrides?.clientHeroImage || null,
    invoiceTemplateUrl:
      settings?.invoiceTemplateUrl || overrides?.invoiceTemplateUrl || null,
    receiptTemplateUrl:
      settings?.receiptTemplateUrl || overrides?.receiptTemplateUrl || null,
    digitalSignature:
      settings?.digitalSignature || overrides?.digitalSignature || null,
    invoiceFooter: settings?.invoiceFooter || overrides?.invoiceFooter || null,
    receiptFooter: settings?.receiptFooter || overrides?.receiptFooter || null,
    colorTheme: settings?.colorTheme || overrides?.colorTheme || null,
  });
}

export function getExpiryMs(rememberMe: boolean) {
  return rememberMe ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
}

export function getUserPermissions(session?: Session | null) {
  return new Set(session?.user.permissions ?? []);
}

export function hasPermission(
  session: Session | null | undefined,
  permission: PermissionCode,
) {
  return getUserPermissions(session).has(permission);
}

export function hasAnyPermission(
  session: Session | null | undefined,
  permissions: PermissionCode[],
) {
  if (!permissions.length) {
    return true;
  }

  if (!Array.isArray(session?.user.permissions)) {
    return true;
  }

  const granted = getUserPermissions(session);
  return permissions.some((permission) => granted.has(permission));
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
  token?: string,
): Promise<T> {
  const requestPath = normalizeApiPath(path);
  const isFormData =
    typeof FormData !== "undefined" && init?.body instanceof FormData;
  const headers = new Headers(init?.headers ?? {});
  headers.set("Accept", "application/json");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (!isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  let response: Response;

  try {
    response = await fetch(buildApiUrl(requestPath), {
      ...init,
      headers,
      cache: "no-store",
    });
  } catch {
    throw new Error(buildNetworkErrorMessage(requestPath));
  }

  const payload = (await safeJson(response)) as ApiError | T | null;
  if (!response.ok) {
    throw new Error(extractApiErrorMessage(payload as ApiError | null, response.status));
  }

  return payload as T;
}

async function safeJson(response: Response) {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return {
      message:
        response.ok
          ? "The server returned an unreadable response."
          : "The server returned an unexpected error response.",
    };
  }
}

function buildApiUrl(path: string) {
  if (typeof window !== "undefined") {
    return `${API_PROXY_PREFIX}${path}`;
  }

  return `${API_BASE_URL}${path}`;
}

export function buildApiFileUrl(path: string) {
  return buildApiUrl(normalizeApiPath(path));
}

export function buildPortalAssetUrl(path?: string | null) {
  if (!path) {
    return "";
  }

  if (/^(https?:|data:|blob:)/i.test(path)) {
    return path;
  }

  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (normalized.startsWith(API_PROXY_PREFIX)) {
    return normalized;
  }

  if (normalized.startsWith("/documents/")) {
    return `${API_PROXY_PREFIX}${normalized}`;
  }

  return normalized;
}

function normalizeApiPath(path: string) {
  return path.startsWith("/") ? path : `/${path}`;
}

function extractApiErrorMessage(payload: ApiError | null, status: number) {
  const message = Array.isArray(payload?.message)
    ? payload.message.join(", ")
    : payload?.message || payload?.error;

  if (message) {
    return message;
  }

  if (status >= 500) {
    return "The server is temporarily unavailable. Please try again shortly.";
  }

  if (status === 404) {
    return "The requested API endpoint could not be reached.";
  }

  return "Request failed.";
}

function buildNetworkErrorMessage(path: string) {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return "You appear to be offline. Check your internet connection and try again.";
  }

  if (path.startsWith("/auth/login")) {
    return "Unable to reach the sign-in service right now. Confirm the backend is running and try again.";
  }

  return "Unable to reach the server right now. Please try again shortly.";
}

function normalizeBrandingAssetUrls(branding: BrandingConfig): BrandingConfig {
  return {
    ...branding,
    primaryLogo: buildPortalAssetUrl(branding.primaryLogo),
    secondaryLogo: buildPortalAssetUrl(branding.secondaryLogo),
    governmentLogo: buildPortalAssetUrl(branding.governmentLogo),
    partnerLogo: buildPortalAssetUrl(branding.partnerLogo),
    adminHeroImage: buildPortalAssetUrl(branding.adminHeroImage),
    clientHeroImage: buildPortalAssetUrl(branding.clientHeroImage),
    invoiceTemplateUrl: buildPortalAssetUrl(branding.invoiceTemplateUrl),
    receiptTemplateUrl: buildPortalAssetUrl(branding.receiptTemplateUrl),
    digitalSignature: buildPortalAssetUrl(branding.digitalSignature),
  };
}

function persistSessionCookie(accessToken: string, expiresAt: number) {
  if (typeof document === "undefined") {
    return;
  }

  document.cookie = [
    `${SESSION_TOKEN_COOKIE}=${encodeURIComponent(accessToken)}`,
    "Path=/",
    `Expires=${new Date(expiresAt).toUTCString()}`,
    "SameSite=Lax",
    typeof window !== "undefined" && window.location.protocol === "https:"
      ? "Secure"
      : "",
  ]
    .filter(Boolean)
    .join("; ");
}

function clearSessionCookie() {
  if (typeof document === "undefined") {
    return;
  }

  document.cookie = [
    `${SESSION_TOKEN_COOKIE}=`,
    "Path=/",
    "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
    "SameSite=Lax",
    typeof window !== "undefined" && window.location.protocol === "https:"
      ? "Secure"
      : "",
  ]
    .filter(Boolean)
    .join("; ");
}

export function formatDateTime(value?: string | Date | null) {
  if (!value) {
    return "N/A";
  }

  return new Intl.DateTimeFormat(getClientLocale(), {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Lagos",
  }).format(new Date(value));
}

export function formatDate(value?: string | Date | null) {
  if (!value) {
    return "N/A";
  }

  return new Intl.DateTimeFormat(getClientLocale(), {
    dateStyle: "medium",
    timeZone: "Africa/Lagos",
  }).format(new Date(value));
}

export function formatCurrency(value?: number | string | null) {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat(getClientLocale(), {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

export function formatNumber(value?: number | string | null) {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat(getClientLocale(), {
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

const defaultNotificationPreferences: NotificationPreferences = {
  inApp: true,
  email: true,
  billing: true,
  complaints: true,
  systemAlerts: true,
};

function getClientLocale() {
  if (typeof window === "undefined") {
    return "en-NG";
  }

  return loadLanguagePreference();
}
