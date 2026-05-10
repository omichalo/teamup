export interface MentionAnchorState {
  teamId: string;
  anchorEl: HTMLElement;
  startPos: number;
}

export interface MentionMemberLite {
  id: string;
  username: string;
  displayName: string;
}

interface ComputeMentionAutocompleteStateParams {
  value: string;
  cursorPos: number;
  teamId: string;
  anchorEl: HTMLElement;
}

export function computeMentionAutocompleteState({
  value,
  cursorPos,
  teamId,
  anchorEl,
}: ComputeMentionAutocompleteStateParams): {
  anchor: MentionAnchorState | null;
  query: string;
} {
  const textBeforeCursor = value.substring(0, cursorPos);
  const lastAtIndex = textBeforeCursor.lastIndexOf("@");

  if (lastAtIndex === -1) {
    return { anchor: null, query: "" };
  }

  const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
  if (textAfterAt.includes(" ") || textAfterAt.includes("\n")) {
    return { anchor: null, query: "" };
  }

  return {
    anchor: {
      teamId,
      anchorEl,
      startPos: lastAtIndex,
    },
    query: textAfterAt.toLowerCase(),
  };
}

export function filterMentionMembers(
  members: MentionMemberLite[],
  query: string
): MentionMemberLite[] {
  const normalizedQuery = query.toLowerCase();
  return members.filter(
    (member) =>
      member.displayName.toLowerCase().includes(normalizedQuery) ||
      member.username.toLowerCase().includes(normalizedQuery)
  );
}

export function isMentionNavigationKey(key: string): boolean {
  return (
    key === "ArrowDown" ||
    key === "ArrowUp" ||
    key === "Enter" ||
    key === "Escape"
  );
}
