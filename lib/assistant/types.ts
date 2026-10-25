/** Client-safe shapes for the EntertainVerse Assistant. */

export interface AssistantSource {
  kind: "help" | "title" | "song" | "artist";
  title: string;
  href?: string;
  subtitle?: string;
  imageUrl?: string;
}

export interface AssistantMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** Assistant replies: what the answer was grounded in (citations [n] → sources[n-1]). */
  sources?: AssistantSource[];
  error?: boolean;
}

/** One NDJSON line from POST /api/assistant/chat. */
export type AssistantStreamEvent =
  | { type: "sources"; sources: AssistantSource[] }
  | { type: "delta"; text: string }
  | { type: "done" }
  | { type: "error"; message: string };
