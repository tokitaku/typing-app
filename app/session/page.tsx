import { StudySession } from "@/components/StudySession";
import type { StudyMode } from "@/types/study";

export default function SessionPage({
  searchParams
}: {
  searchParams: { mode?: string };
}) {
  const mode: StudyMode = searchParams.mode === "review" ? "review" : "learn";

  return <StudySession mode={mode} />;
}
