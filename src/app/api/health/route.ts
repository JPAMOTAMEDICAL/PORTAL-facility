export function GET() {
  return Response.json({
    portal: "client",
    status: "ok",
    runtime: "nextjs",
  });
}