import Link from "next/link";

const highlights = [
  { label: "Portal status", value: "Ready", detail: "Hospital clients can access the shell from preview and browser channels." },
  { label: "Preferred port", value: "Dynamic", detail: "Automatically shifts to the next free port when needed." },
  { label: "Experience", value: "Client-safe", detail: "Simple navigation for login, signup, dashboard, and health checks." },
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-10">
      <header className="rounded-3xl border border-white/10 bg-white/10 p-8 shadow-2xl shadow-sky-950/20 backdrop-blur-xl">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-4">
            <span className="inline-flex rounded-full border border-sky-400/30 bg-sky-500/10 px-3 py-1 text-sm text-sky-100">
              Hospital Client Portal
            </span>
            <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Client application shell is live for browser and Trae access.
            </h1>
            <p className="max-w-2xl text-base text-slate-200 sm:text-lg">
              This portal provides a verified landing page, login route, signup route, dashboard route,
              and health endpoint for runtime and connectivity checks.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link className="rounded-full bg-sky-400 px-5 py-3 font-medium text-slate-950 transition hover:bg-sky-300" href="/client/dashboard">
              Open dashboard
            </Link>
            <Link className="rounded-full border border-white/15 px-5 py-3 font-medium text-white transition hover:bg-white/10" href="/signup">
              Open signup
            </Link>
          </div>
        </div>
      </header>

      <section className="mt-8 grid gap-4 md:grid-cols-3">
        {highlights.map((item) => (
          <article key={item.label} className="rounded-2xl border border-white/10 bg-slate-900/70 p-5 backdrop-blur">
            <p className="text-sm text-slate-400">{item.label}</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">{item.value}</h2>
            <p className="mt-2 text-sm text-slate-300">{item.detail}</p>
          </article>
        ))}
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <article className="rounded-3xl border border-white/10 bg-white/8 p-6 backdrop-blur-xl">
          <h2 className="text-xl font-semibold text-white">Client-ready access flows</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              "Login with email or facility code",
              "OTP and password reset architecture",
              "Interest signup and onboarding flow",
              "Invoice and collection portal entry",
            ].map((item) => (
              <div key={item} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-sm text-slate-200">
                {item}
              </div>
            ))}
          </div>
        </article>
        <article className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 backdrop-blur-xl">
          <h2 className="text-xl font-semibold text-white">Verification targets</h2>
          <ul className="mt-4 space-y-3 text-sm text-slate-200">
            <li>Preview access inside Trae.</li>
            <li>External browser access using localhost.</li>
            <li>No runtime errors during initial navigation.</li>
            <li>Health endpoint available for smoke tests.</li>
          </ul>
        </article>
      </section>
    </main>
  );
}
