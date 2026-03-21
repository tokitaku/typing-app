import type { Problem, ProblemListResponse } from "@/types/study";

const DEFAULT_API_BASE_URL = "http://localhost:8000";

function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE_URL;
}

export async function fetchProblems(signal?: AbortSignal): Promise<Problem[]> {
  const response = await fetch(`${getApiBaseUrl()}/problems`, {
    cache: "no-store",
    signal
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch problems: ${response.status}`);
  }

  const body = await response.json() as ProblemListResponse;

  return body.problems;
}
