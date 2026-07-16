# PORTAL-Facility

Client-facing facility portal for the JP AMOTA Medical Waste Management platform.

## Stack

- Next.js App Router
- React
- TypeScript

## Responsibilities

- Facility user authentication and dashboard
- Collections, invoices, payments, receipts, complaints, notifications, documents, and settings
- Authenticated document preview and download through the portal proxy

## Environment

Create a local `.env` file from `.env.example`.

```env
NEXT_PUBLIC_API_URL="http://127.0.0.1:4000"
API_BASE_URL="http://127.0.0.1:4000"
```

## Install

```bash
npm install
```

## Development

```bash
npm run dev
```

Client portal default local port: `3000`

## Production

```bash
npm run build
npm run start
```

## Release Notes

- Keep `.env`, `.next`, build logs, and `node_modules` out of Git.
- The portal proxies backend requests through `/api/backend`.
- For production, point `API_BASE_URL` and `NEXT_PUBLIC_API_URL` to the deployed backend.
