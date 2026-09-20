import type { SuggestionStatus, SuggestionWaitingOn } from "@/lib/app-suggestions/types";
import { SUGGESTION_OPEN_STATUSES } from "@/lib/app-suggestions/status";

export function defaultWaitingOnForStatus(
  status: SuggestionStatus
): SuggestionWaitingOn {
  if ((SUGGESTION_OPEN_STATUSES as readonly string[]).includes(status)) {
    return "handlers";
  }
  return "none";
}

export function waitingOnAfterAuthorComment(
  current: SuggestionWaitingOn | undefined
): SuggestionWaitingOn {
  if (current === "none") {
    return "handlers";
  }
  return "handlers";
}

export function waitingOnAfterHandlerComment(): SuggestionWaitingOn {
  return "author";
}
