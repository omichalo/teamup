import { Box } from "@mui/material";
import { CompositionsSummary } from "../CompositionsSummary";

const meta = {
  title: "Compositions/Chips",
  component: CompositionsSummary,
  args: {
    totalTeams: 6,
    completedTeams: 3,
    incompleteTeams: 2,
    invalidTeams: 1,
    matchesPlayed: 4,
    discordMessagesSent: 2,
    discordMessagesTotal: 4,
    percentage: 50,
    completionLabel: "terminé",
  },
};

export default meta;

type StoryProps = typeof meta.args;

export const Overview = {
  render: (props: StoryProps) => (
    <Box sx={{ maxWidth: 720 }}>
      <CompositionsSummary {...props} />
    </Box>
  ),
};
