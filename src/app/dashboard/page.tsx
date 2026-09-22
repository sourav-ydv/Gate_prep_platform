import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const MODULES = [
  {
    href: "/lectures",
    title: "Lectures",
    desc: "Paste a YouTube/Drive link and track your watch progress.",
  },
  {
    href: "/pyqs",
    title: "PYQ Bank",
    desc: "Previous-year questions filtered by your branch and topic.",
  },
  {
    href: "/mock-tests",
    title: "Mock Tests",
    desc: "Timed, GATE-style tests with auto scoring.",
  },
  {
    href: "/chatbot",
    title: "Doubt Chatbot",
    desc: "Ask anything — answered right here, no need to leave.",
  },
];

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-2xl font-semibold text-slate-900">
          Welcome back{user.email ? `, ${user.email.split("@")[0]}` : ""}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Here's your GATE 2027 prep, all in one place.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {MODULES.map((m) => (
            <a
              key={m.href}
              href={m.href}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md"
            >
              <h2 className="text-base font-semibold text-slate-900">
                {m.title}
              </h2>
              <p className="mt-1 text-sm text-slate-500">{m.desc}</p>
            </a>
          ))}
        </div>

        <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white/50 p-5">
          <h3 className="text-sm font-semibold text-slate-700">
            Progress overview
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Topic-wise accuracy and weak-area recommendations will show up
            here once you start attempting PYQs (Phase 6).
          </p>
        </div>
      </div>
    </main>
  );
}
