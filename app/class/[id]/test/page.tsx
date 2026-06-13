import Link from "next/link";
import { notFound } from "next/navigation";
import { getClass, getTestQuestions, listTestAttempts } from "@/lib/data";
import TestRunner from "@/components/TestRunner";

export const dynamic = "force-dynamic";

export default async function TestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const classId = Number(id);
  const cls = getClass(classId);

  if (!cls) {
    notFound();
  }

  const questions = getTestQuestions(classId);
  const attempts = listTestAttempts(classId);

  // Shuffle and cap at 10 questions per sitting
  const shuffled = [...questions].sort(() => Math.random() - 0.5).slice(0, 10);

  return (
    <div className="flex flex-col gap-8">
      {/* Breadcrumb */}
      <nav className="text-sm text-foreground/60">
        <Link href="/" className="hover:text-foreground transition-colors">
          Home
        </Link>
        <span className="mx-2">/</span>
        <Link
          href={`/class/${classId}`}
          className="hover:text-foreground transition-colors"
        >
          {cls.name}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">Test</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
          📝 Test: {cls.name}
        </h1>
      </div>

      {/* Content */}
      {shuffled.length === 0 ? (
        <div className="rounded-2xl border border-black/10 dark:border-white/15 p-8 bg-black/[.03] dark:bg-white/[.06] text-center">
          <p className="text-lg text-foreground/70">
            Nothing to test yet — complete a lecture first.
          </p>
          <Link
            href={`/class/${classId}`}
            className="inline-block mt-4 rounded-2xl bg-black dark:bg-white text-white dark:text-black px-6 py-2 font-semibold hover:shadow-md hover:-translate-y-0.5 transition-all"
          >
            Back to class
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          <TestRunner classId={classId} questions={shuffled} />

          {/* Past attempts section */}
          {attempts.length > 0 && (
            <div className="flex flex-col gap-4">
              <h2 className="text-2xl font-bold">Past attempts</h2>
              <div className="flex flex-col gap-2">
                {attempts.map((attempt) => (
                  <div
                    key={attempt.id}
                    className="rounded-2xl border border-black/10 dark:border-white/15 p-4 bg-black/[.03] dark:bg-white/[.06]"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">
                        {attempt.score}/{attempt.total}
                      </span>
                      <span className="text-sm text-foreground/60">
                        {new Date(attempt.taken_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
