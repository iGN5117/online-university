import Link from "next/link";
import { notFound } from "next/navigation";
import { getClass, getSchool, listLectures } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function ClassPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const numId = Number(id);
  const cls = getClass(numId);

  if (!cls) {
    notFound();
  }

  const school = getSchool(cls.school_id);
  const lectures = listLectures(numId);

  return (
    <div className="flex flex-col gap-8">
      {/* Breadcrumb */}
      <nav className="text-sm text-foreground/60">
        <Link href="/" className="hover:text-foreground transition-colors">
          Home
        </Link>
        <span className="mx-2">/</span>
        {school && (
          <>
            <Link
              href={`/school/${school.id}`}
              className="hover:text-foreground transition-colors"
            >
              {school.name}
            </Link>
            <span className="mx-2">/</span>
          </>
        )}
        <span className="text-foreground">{cls.name}</span>
      </nav>

      {/* Class header */}
      <div className="flex flex-col gap-2">
        <div className="text-4xl">{cls.emoji}</div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
          {cls.name}
        </h1>
        <p className="text-lg text-foreground/70">{cls.description}</p>
      </div>

      {/* Progress bar */}
      <div className="flex flex-col gap-2">
        <div className="text-sm font-medium text-foreground/70">
          Progress: {cls.completedCount} / {cls.lectureCount} lectures
        </div>
        <div className="h-2 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-black dark:bg-white transition-all"
            style={{
              width: `${cls.lectureCount > 0 ? (cls.completedCount / cls.lectureCount) * 100 : 0}%`,
            }}
          />
        </div>
      </div>

      {/* Lectures list or empty state */}
      {lectures.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-lg text-foreground/70">No lectures yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {lectures.map((lecture, index) => (
            <Link
              key={lecture.id}
              href={`/lecture/${lecture.id}`}
              className="rounded-2xl border border-black/10 dark:border-white/15 p-4 hover:shadow-md hover:-translate-y-0.5 transition-all bg-white dark:bg-black/30"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-semibold text-foreground/60">
                      {index + 1}.
                    </span>
                    <h3 className="font-semibold text-lg">{lecture.title}</h3>
                  </div>
                  <p className="text-sm text-foreground/70 mt-1">
                    {lecture.summary}
                  </p>
                  <div className="text-xs text-foreground/60 mt-2">
                    {lecture.content.cards?.length || 0} cards
                  </div>
                </div>
                {lecture.completed && (
                  <div className="text-xl" title="Completed">
                    ✓
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Test button */}
      <div className="mt-4">
        {cls.completedCount === 0 ? (
          // Disabled: render a non-interactive element (a server component
          // cannot pass an onClick handler to <Link>).
          <span
            aria-disabled="true"
            title="Complete a lecture first"
            className="inline-block rounded-2xl px-6 py-3 font-semibold bg-black/10 dark:bg-white/10 text-foreground/50 cursor-not-allowed select-none"
          >
            📝 Take a test
          </span>
        ) : (
          <Link
            href={`/class/${numId}/test`}
            title="Take a test on completed lectures"
            className="inline-block rounded-2xl px-6 py-3 font-semibold transition-all bg-black dark:bg-white text-white dark:text-black hover:shadow-md hover:-translate-y-0.5"
          >
            📝 Take a test
          </Link>
        )}
        {cls.completedCount === 0 && (
          <p className="text-xs text-foreground/60 mt-2">
            Complete a lecture first
          </p>
        )}
      </div>
    </div>
  );
}
