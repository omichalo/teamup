import {
  Accessible,
  CategoryOutlined,
  EmojiEventsOutlined,
  EuroOutlined,
  GroupsOutlined,
  LocalOfferOutlined,
  MergeTypeOutlined,
  PersonOutline,
  PlaceOutlined,
  ScheduleOutlined,
  SchoolOutlined,
  SportsHandball,
  VisibilityOff,
  VolunteerActivismOutlined,
} from "@mui/icons-material";
import type { SvgIconComponent } from "@mui/icons-material";

export const CONFIG_EDITOR_ICON_KEYS = [
  "category",
  "accessible",
  "sports_handball",
  "school",
  "groups",
  "place",
  "schedule",
  "euro",
  "local_offer",
  "volunteer",
  "emoji_events",
  "merge",
  "person",
  "visibility_off",
] as const;

export type ConfigEditorIconKey = (typeof CONFIG_EDITOR_ICON_KEYS)[number];

const ICON_BY_KEY: Record<ConfigEditorIconKey, SvgIconComponent> = {
  category: CategoryOutlined,
  accessible: Accessible,
  sports_handball: SportsHandball,
  school: SchoolOutlined,
  groups: GroupsOutlined,
  place: PlaceOutlined,
  schedule: ScheduleOutlined,
  euro: EuroOutlined,
  local_offer: LocalOfferOutlined,
  volunteer: VolunteerActivismOutlined,
  emoji_events: EmojiEventsOutlined,
  merge: MergeTypeOutlined,
  person: PersonOutline,
  visibility_off: VisibilityOff,
};

export const CONFIG_EDITOR_ICON_LABELS: Record<ConfigEditorIconKey, string> = {
  category: "Catégorie",
  accessible: "Accessibilité",
  sports_handball: "Handisport",
  school: "École",
  groups: "Groupe",
  place: "Lieu",
  schedule: "Horaire",
  euro: "Euro",
  local_offer: "Remise",
  volunteer: "Aide",
  emoji_events: "Compétition",
  merge: "Regroupement",
  person: "Personne",
  visibility_off: "Masqué",
};

export function resolveConfigEditorIcon(key: string): SvgIconComponent {
  if ((CONFIG_EDITOR_ICON_KEYS as readonly string[]).includes(key)) {
    return ICON_BY_KEY[key as ConfigEditorIconKey];
  }
  return CategoryOutlined;
}
