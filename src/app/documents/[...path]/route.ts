import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL =
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://127.0.0.1:4000";
const SESSION_TOKEN_COOKIE = "jpmwoms_client_access_token";

type RouteContext = {
  params: Promise<{
    path?: string[];
  }>;
};

async function proxyDocumentRequest(
  request: NextRequest,
  { params }: RouteContext,
) {
  const { path = [] } = await params;
  const method = request.method.toUpperCase();
  const headers = buildUpstreamHeaders(request);

  try {
    const targetUrl = new URL(`documents/${path.join("/")}`, `${API_BASE_URL}/`);
    targetUrl.search = request.nextUrl.search;
    const body =
      method === "GET" || method === "HEAD"
        ? undefined
        : Buffer.from(await request.arrayBuffer());
    const upstream = await fetch(targetUrl, {
      method,
      headers,
      body,
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(15000),
    });

    const responseHeaders = new Headers(upstream.headers);
    responseHeaders.delete("content-length");

    return new NextResponse(await upstream.arrayBuffer(), {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch {
    return NextResponse.json(
      {
        message:
          "Document service is unavailable. Confirm the backend server is running and try again.",
      },
      { status: 503 },
    );
  }
}

function buildUpstreamHeaders(request: NextRequest) {
  const headers = new Headers();
  const accept = request.headers.get("accept");
  const authorization = request.headers.get("authorization");
  const contentType = request.headers.get("content-type");
  const range = request.headers.get("range");
  const cookieToken = request.cookies.get(SESSION_TOKEN_COOKIE)?.value;

  if (accept) {
    headers.set("accept", accept);
  }

  if (authorization) {
    headers.set("authorization", authorization);
  } else if (cookieToken) {
    headers.set("authorization", `Bearer ${decodeCookieToken(cookieToken)}`);
  }

  if (contentType) {
    headers.set("content-type", contentType);
  }

  if (range) {
    headers.set("range", range);
  }

  return headers;
}

function decodeCookieToken(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export {
  proxyDocumentRequest as GET,
  proxyDocumentRequest as POST,
  proxyDocumentRequest as PUT,
  proxyDocumentRequest as PATCH,
  proxyDocumentRequest as DELETE,
  proxyDocumentRequest as HEAD,
  proxyDocumentRequest as OPTIONS,
};
