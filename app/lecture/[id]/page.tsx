import Link from "next/link";
import { notFound } from "next/navigation";
import { getLecture, getClass, listLectures } from "@/lib/data";
import CardViewer from "@/components/CardViewer";

export const dynamic = "force-dynamic";

export default async function LecturePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const numId = Number(id);
  const lecture = getLecture(numId);

  if (!lecture) {
    notFound();
  }

  const cls = getClass(lecture.class_id);
  if (!cls) {
    notFound();
  }

  // Get all lectures in this class to find next/prev
  const classLectures = listLectures(lecture.class_id);
  const currentIndex = classLectures.findIndex((l) => l.id === numId);
  const nextLecture = currentIndex >= 0 && currentIndex < classLectures.length - 1
    ? classLectures[currentIndex + 1]
    : null;

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb */}
      <nav className="text-sm text-foreground/60">
        <Link href="/" className="hover:text-foreground transition-colors">
          Home
        </Link>
        <span className="mx-2">/</span>
        <Link
          href={`/class/${lecture.class_id}`}
          className="hover:text-foreground transition-colors"
        >
          {cls.name}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{lecture.title}</span>
      </nav>

      {/* Render based on format */}
      {lecture.format === "reading" && lecture.content.body_md ? (
        <div className="prose dark:prose-invert prose-sm md:prose-base max-w-none">
          {lecture.content.body_md.split("\n").map((para, i) => (
            para.trim() && (
              <p key={i} className="text-base md:text-lg leading-relaxed text-foreground/90 mb-4">
                {para}
              </p>
            )
          ))}
        </div>
      ) : lecture.format === "video" && lecture.content.url ? (
        <div className="rounded-2xl overflow-hidden border border-black/10 dark:border-white/15">
          <a
            href={lecture.content.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block aspect-video bg-black/10 dark:bg-white/10 flex items-center justify-center hover:bg-black/20 dark:hover:bg-white/20 transition-colors"
          >
            <span className="text-4xl">▶️</span>
          </a>
        </div>
      ) : (
        <CardViewer
          lecture={lecture}
          classId={lecture.class_id}
          nextLectureId={nextLecture?.id}
        />
      )}
    </div>
  );
}
