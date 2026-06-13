import Link from "next/link";
import { notFound } from "next/navigation";
import { getSchool, listClasses } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function SchoolPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const numId = Number(id);
  const school = getSchool(numId);

  if (!school) {
    notFound();
  }

  const classes = listClasses(numId);

  return (
    <div className="flex flex-col gap-8">
      {/* Breadcrumb */}
      <nav className="text-sm text-foreground/60">
        <Link href="/" className="hover:text-foreground transition-colors">
          Home
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{school.name}</span>
      </nav>

      {/* School header */}
      <div className="flex flex-col gap-2">
        <div className="text-4xl">{school.emoji}</div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
          {school.name}
        </h1>
        <p className="text-lg text-foreground/70">{school.description}</p>
      </div>

      {/* Classes grid or empty state */}
      {classes.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-lg text-foreground/70 mb-4">
            No classes yet — ask the companion (✨ bottom-right) to add one.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {classes.map((cls) => (
            <Link
              key={cls.id}
              href={`/class/${cls.id}`}
              className="rounded-2xl border border-black/10 dark:border-white/15 p-6 hover:shadow-md hover:-translate-y-0.5 transition-all bg-white dark:bg-black/30"
            >
              <div className="flex flex-col gap-3">
                <div className="text-3xl">{cls.emoji}</div>
                <h2 className="font-semibold text-lg">{cls.name}</h2>
                <p className="text-sm text-foreground/70">{cls.description}</p>
                <div className="text-xs font-medium text-foreground/60 mt-2">
                  {cls.completedCount}/{cls.lectureCount} lectures
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
