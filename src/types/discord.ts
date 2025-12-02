export interface DiscordMember {
  id: string;
  username: string;
  displayName: string;
  avatar?: string | null;
}

export interface DiscordChannel {
  id: string;
  name: string;
  type: number;
}

