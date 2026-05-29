import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 bg-zinc-50 font-sans dark:bg-black">
      <h1 className="text-4xl font-bold tracking-tight text-black dark:text-white">
        EduPulse AI
      </h1>
      <p className="max-w-md text-center text-lg text-zinc-600 dark:text-zinc-400">
        Real-Time Student Engagement &amp; Micro-Intervention Dashboard
      </p>
      <div className="flex gap-4">
        <Link
          href="/student"
          className="rounded-full bg-blue-600 px-6 py-3 text-white transition-colors hover:bg-blue-700"
        >
          Join as Student
        </Link>
        <span className="rounded-full border border-zinc-300 px-6 py-3 text-zinc-400 dark:border-zinc-700">
          Teacher (Phase 3)
        </span>
      </div>
    </div>
  );
}
