"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  apiFetch,
  applyThemeMode,
  loadSession,
  loadThemeMode,
  type Session,
  type ThemeMode,
} from "@/lib/portal";

export type Facility = {
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
  address?: string;
  city?: string;
  state?: string;
  lga?: string;
  status?: string;
};

export type Collection = {
  id: string;
  facilityId: string;
  collectionTime: string;
  weightKg: number;
  binCount: number;
  wasteType: string;
  manifestNo: string;
  syncStatus: string;
  notes?: string | null;
};

export type Invoice = {
  id: string;
  invoiceNo: string;
  facilityId: string;
  amountDue: number;
  status: string;
  dueDate: string;
  periodStart?: string | null;
  periodEnd?: string | null;
  createdAt?: string;
};

export type Payment = {
  id: string;
  amount: number;
  paymentDate: string;
  method: string;
  reference: string;
  status: string;
  receiptNumber?: string | null;
  proofOfPayment?: string | null;
  notes?: string | null;
  invoiceId?: string | null;
  invoice?: {
    invoiceNo: string;
    facility?: { name: string } | null;
  } | null;
  createdAt?: string;
};

export type Receipt = {
  id: string;
  receiptNumber?: string | null;
  amount: number;
  paymentDate: string;
  status: string;
  reference: string;
  receiptDelivery?: {
    audiences?: string[];
    channels?: string[];
    status?: string;
  } | null;
  invoice?: {
    invoiceNo: string;
    facility?: { name: string } | null;
  } | null;
};

export type BankAccount = {
  id: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  isDefault: boolean;
};

export type Complaint = {
  id: string;
  reference: string;
  type: string;
  priority?: string;
  description: string;
  status: string;
  resolutionNotes?: string | null;
  attachments?: Array<Record<string, unknown> | string> | null;
  assignedTo?: { fullName: string } | null;
  createdAt: string;
};

export type Notification = {
  id: string;
  title: string;
  message: string;
  channel: string;
  status: string;
  createdAt: string;
  readAt?: string | null;
};

export type Visit = {
  id: string;
  facilityId: string;
  purpose: string;
  status: string;
  createdAt: string;
  staff?: { fullName: string } | null;
};

export type ServiceMonitoring = {
  facilityId: string;
  slaScore: number;
  complianceRate: number;
  missedCollections: number;
  collectionFrequency?: string;
  serviceStatus: string;
  lastCollectionDate: string;
  outstandingBalance?: number;
};

export type TimelineItem = {
  collections: Collection[];
  visits: Visit[];
  invoices: Invoice[];
  complaints: Complaint[];
  approvals: Array<{
    id: string;
    type?: string;
    status?: string;
    createdAt?: string;
  }>;
};

export function useClientPortalData() {
  const initialState = useMemo(() => getInitialPortalState(), []);
  const [session] = useState<Session | null>(initialState.session);
  const [themeMode, setThemeMode] = useState<ThemeMode>(initialState.themeMode);
  const [sessionLoading] = useState(initialState.sessionLoading);
  const [loading, setLoading] = useState(initialState.loading);
  const [error, setError] = useState<string | null>(initialState.error);
  const [facility, setFacility] = useState<Facility | null>(null);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [serviceMonitoring, setServiceMonitoring] = useState<ServiceMonitoring | null>(null);
  const [timeline, setTimeline] = useState<TimelineItem | null>(null);

  useEffect(() => {
    applyThemeMode(themeMode);
    if (initialState.shouldRedirect) {
      redirectToLogin();
    }
  }, [initialState.shouldRedirect, themeMode]);

  const refresh = useCallback(async () => {
    if (!session?.user.facilityId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const facilityId = session.user.facilityId;
      const [facilityResponse, collectionsResponse, invoicesResponse, paymentsResponse, receiptsResponse, bankAccountsResponse, complaintsResponse, notificationsResponse, visitsResponse, monitoringResponse, timelineResponse] = await Promise.all([
        apiFetch<Facility>(`/facilities/${facilityId}`, undefined, session.accessToken),
        apiFetch<Collection[]>("/collections", undefined, session.accessToken),
        apiFetch<Invoice[]>(`/invoices?facilityId=${facilityId}`, undefined, session.accessToken),
        apiFetch<Payment[]>(`/payments?facilityId=${facilityId}`, undefined, session.accessToken),
        apiFetch<Receipt[]>(`/payments/receipts?facilityId=${facilityId}`, undefined, session.accessToken),
        apiFetch<BankAccount[]>("/payments/bank-accounts", undefined, session.accessToken).catch(() => []),
        apiFetch<Complaint[]>(`/complaints?facilityId=${facilityId}`, undefined, session.accessToken),
        apiFetch<Notification[]>("/notifications", undefined, session.accessToken),
        apiFetch<Visit[]>(`/visits?facilityId=${facilityId}`, undefined, session.accessToken),
        apiFetch<ServiceMonitoring>(`/facilities/${facilityId}/service-monitoring`, undefined, session.accessToken),
        apiFetch<TimelineItem>(`/facilities/${facilityId}/timeline`, undefined, session.accessToken).catch(() => null),
      ]);

      setFacility(facilityResponse);
      setCollections(
        collectionsResponse.filter((item) => item.facilityId === facilityId),
      );
      setInvoices(invoicesResponse);
      setPayments(paymentsResponse);
      setReceipts(receiptsResponse);
      setBankAccounts(bankAccountsResponse);
      setComplaints(complaintsResponse);
      setNotifications(notificationsResponse);
      setVisits(visitsResponse);
      setServiceMonitoring(monitoringResponse);
      setTimeline(timelineResponse);
      setError(null);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load the client portal data.",
      );
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (!session) {
      return;
    }

    const timeout = window.setTimeout(() => {
      void refresh();
    }, 0);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [refresh, session]);

  useEffect(() => {
    if (!session) {
      return;
    }

    const interval = window.setInterval(() => {
      void refresh();
    }, 20000);

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    };

    window.addEventListener("focus", onVisibilityChange);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", onVisibilityChange);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [refresh, session]);

  const recentActivity = useMemo(() => {
    return [
      ...collections.map((item) => ({
        id: item.id,
        label: `Collection ${item.manifestNo}`,
        detail: `${item.weightKg} KG`,
        timestamp: item.collectionTime,
        status: item.syncStatus,
      })),
      ...invoices.map((item) => ({
        id: item.id,
        label: item.invoiceNo,
        detail: "Invoice generated",
        timestamp: item.createdAt ?? item.dueDate,
        status: item.status,
      })),
      ...payments.map((item) => ({
        id: item.id,
        label: item.reference,
        detail: "Payment recorded",
        timestamp: item.paymentDate,
        status: item.status,
      })),
      ...complaints.map((item) => ({
        id: item.id,
        label: item.reference,
        detail: item.type,
        timestamp: item.createdAt,
        status: item.status,
      })),
      ...visits.map((item) => ({
        id: item.id,
        label: item.purpose,
        detail: item.staff?.fullName ?? "Service visit",
        timestamp: item.createdAt,
        status: item.status,
      })),
    ]
      .sort((left, right) => {
        return new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime();
      })
      .slice(0, 8);
  }, [collections, complaints, invoices, payments, visits]);

  return {
    session,
    themeMode,
    setThemeMode,
    sessionLoading,
    loading,
    error,
    setError,
    facility,
    collections,
    invoices,
    payments,
    receipts,
    bankAccounts,
    complaints,
    notifications,
    visits,
    serviceMonitoring,
    timeline,
    recentActivity,
    refresh,
  };
}

function redirectToLogin() {
  if (typeof window !== "undefined") {
    window.location.replace("/login");
  }
}

function getInitialPortalState() {
  const activeSession = loadSession();
  if (!activeSession) {
    return {
      session: null,
      themeMode: "light" as ThemeMode,
      sessionLoading: false,
      loading: false,
      error: null,
      shouldRedirect: true,
    };
  }

  if (activeSession.user.role !== "HOSPITAL_ADMIN") {
    return {
      session: null,
      themeMode: "light" as ThemeMode,
      sessionLoading: false,
      loading: false,
      error: "This portal is available only to client facility accounts.",
      shouldRedirect: true,
    };
  }

  const storedMode = loadThemeMode(activeSession.user.id);
  return {
    session: activeSession,
    themeMode: storedMode,
    sessionLoading: false,
    loading: true,
    error: null,
    shouldRedirect: false,
  };
}
