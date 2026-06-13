import Link from "next/link";
import { listSchools } from "@/lib/data";

export const dynamic = "force-dynamic";

export default function Home() {
  const schools = listSchools();

  return (
    <div className="flex flex-col gap-8">
      {/* Hero section */}
      <div className="py-4">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
          Pick a school. Learn one card at a time.
        </h1>
      </div>

      {/* Schools grid or empty state */}
      {schools.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-lg text-foreground/70 mb-4">
            No schools yet. Use the ✨ chat button to create one!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {schools.map((school) => (
            <Link
              key={school.id}
              href={`/school/${school.id}`}
              className="rounded-2xl border border-black/10 dark:border-white/15 p-6 hover:shadow-md hover:-translate-y-0.5 transition-all bg-white dark:bg-black/30"
            >
              <div className="flex flex-col gap-3">
                <div className="text-4xl">{school.emoji}</div>
                <h2 className="font-semibold text-xl">{school.name}</h2>
                <p className="text-sm text-foreground/70">{school.description}</p>
                <div className="text-xs font-medium text-foreground/60 mt-2">
                  {school.classCount} class{school.classCount !== 1 ? "es" : ""}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
