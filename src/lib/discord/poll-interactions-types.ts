export interface DiscordMessageComponentInteraction {
  type: number;
  data: {
    custom_id: string;
    component_type: number;
    values?: string[];
  };
  member?: {
    user: {
      id: string;
      username: string;
    };
  };
  user?: {
    id: string;
    username: string;
  };
  message?: {
    id: string;
  };
  application_id?: string;
  token?: string;
}

export interface DiscordModalSubmitInteraction {
  type: number;
  data: {
    custom_id: string;
    components: Array<{
      type: number;
      components: Array<{
        type: number;
        custom_id: string;
        value: string;
      }>;
    }>;
  };
  member?: {
    user: {
      id: string;
      username: string;
    };
  };
  user?: {
    id: string;
    username: string;
  };
}

export type SelectMenuOption = {
  label: string;
  value: string;
  emoji: { name: string };
  default?: boolean;
};
