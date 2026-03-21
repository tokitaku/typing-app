import { StudySession } from "@/features/study-session/ui/StudySession";
import type { StudyMode } from "@/domain/models/study";

export default function SessionPage({
  searchParams
}: {
  searchParams: { mode?: string };
}) {
  const mode: StudyMode = searchParams.mode === "review" ? "review" : "learn";

  return <StudySession mode={mode} />;
}
