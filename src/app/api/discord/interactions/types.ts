export const InteractionType = {
  PING: 1,
  APPLICATION_COMMAND: 2,
  MESSAGE_COMPONENT: 3,
  APPLICATION_COMMAND_AUTOCOMPLETE: 4,
  MODAL_SUBMIT: 5,
} as const;

export type InteractionTypeValue =
  (typeof InteractionType)[keyof typeof InteractionType];

export interface DiscordUser {
  id: string;
}

export interface DiscordMember {
  user: DiscordUser;
}

export interface DiscordApplicationCommandOption {
  name: string;
  value: string | number;
}

export interface DiscordApplicationCommandData {
  name: string;
  options?: DiscordApplicationCommandOption[];
}

export interface DiscordInteraction {
  type: InteractionTypeValue;
  data?: DiscordApplicationCommandData;
  member?: DiscordMember;
  user?: DiscordUser;
  application_id?: string;
  token?: string;
}
