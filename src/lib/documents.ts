"use client";

import { API_PROXY_PREFIX } from "@/lib/portal";

export type UploadedDocument = {
  storedName?: string;
  originalName: string;
  mimeType: string;
  size: number;
  category: string;
  facilityId?: string;
  uploadedAt: string;
  previewUrl?: string;
  downloadUrl?: string;
};

export type FacilityDocument = {
  id: string;
  type: "INVOICE" | "RECEIPT" | "PAYMENT_PROOF" | "COMPLAINT_EVIDENCE";
  title: string;
  fileName: string;
  detail: string;
  createdAt: string;
  status: string;
  mimeType: string;
  size: number | null;
  previewUrl: string;
  downloadUrl: string;
  relatedEntityId: string;
  relatedEntityType: "invoice" | "payment" | "complaint";
};

export function buildDocumentUrl(path?: string | null) {
  if (!path) {
    return "";
  }

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${API_PROXY_PREFIX}${normalized}`;
}

export async function fetchDocumentBlob(token: string, path?: string | null) {
  const response = await fetch(buildDocumentUrl(path), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    let message = "Unable to open the selected document.";
    try {
      const payload = (await response.json()) as { message?: string | string[] };
      message = Array.isArray(payload.message)
        ? payload.message.join(", ")
        : payload.message || message;
    } catch {
      message = "Unable to open the selected document.";
    }

    throw new Error(message);
  }

  return response.blob();
}

export async function downloadDocument(
  token: string,
  path: string,
  fileName: string,
) {
  const blob = await fetchDocumentBlob(token, path);
  const objectUrl = window.URL.createObjectURL(blob);
  const anchor = window.document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = fileName;
  anchor.rel = "noreferrer";
  window.document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => {
    window.URL.revokeObjectURL(objectUrl);
  }, 1000);
}

export async function uploadDocument(options: {
  token: string;
  facilityId?: string | null;
  category: "PAYMENT_PROOF" | "COMPLAINT_EVIDENCE" | "STAFF_PHOTO";
  file: File;
  onProgress?: (progress: number) => void;
}) {
  const query = new URLSearchParams({
    category: options.category,
  });

  if (options.facilityId) {
    query.set("facilityId", options.facilityId);
  }

  const formData = new FormData();
  formData.append("file", options.file);

  return new Promise<UploadedDocument>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_PROXY_PREFIX}/documents/uploads?${query.toString()}`);
    xhr.setRequestHeader("Authorization", `Bearer ${options.token}`);
    xhr.responseType = "json";

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) {
        return;
      }

      options.onProgress?.(Math.round((event.loaded / event.total) * 100));
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve((xhr.response ?? JSON.parse(xhr.responseText)) as UploadedDocument);
        return;
      }

      reject(new Error(extractUploadError(xhr)));
    };

    xhr.onerror = () => {
      reject(new Error("Unable to upload the selected file right now."));
    };

    xhr.send(formData);
  });
}

export async function deleteUploadedDocument(token: string, storedName: string) {
  const response = await fetch(
    `${API_PROXY_PREFIX}/documents/uploads/${encodeURIComponent(storedName)}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!response.ok) {
    let message = "Unable to remove the uploaded document.";
    try {
      const payload = (await response.json()) as { message?: string | string[] };
      message = Array.isArray(payload.message)
        ? payload.message.join(", ")
        : payload.message || message;
    } catch {
      message = "Unable to remove the uploaded document.";
    }

    throw new Error(message);
  }
}

function extractUploadError(xhr: XMLHttpRequest) {
  const fallback = "Unable to upload the selected file.";
  const payload = xhr.response ?? safeParseJson(xhr.responseText);
  const message = payload?.message;

  if (Array.isArray(message)) {
    return message.join(", ");
  }

  return typeof message === "string" && message.trim() ? message : fallback;
}

function safeParseJson(value: string) {
  try {
    return JSON.parse(value) as { message?: string | string[] };
  } catch {
    return null;
  }
}
