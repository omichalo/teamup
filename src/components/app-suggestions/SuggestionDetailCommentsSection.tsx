"use client";

import { Box, Divider, Stack, Typography } from "@mui/material";
import type { AppSuggestionDetail } from "@/lib/app-suggestions/types";
import { formatSuggestionDate } from "@/components/app-suggestions/format-utils";
import { SuggestionUserAvatar } from "@/components/app-suggestions/SuggestionUserAvatar";
import { suggestionCommentSx } from "@/components/app-suggestions/suggestions-surface-styles";
import { SuggestionCommentComposer } from "@/components/app-suggestions/SuggestionCommentComposer";
import { SuggestionRichTextContent } from "@/components/app-suggestions/rich-text/SuggestionRichTextContent";

type SuggestionDetailCommentsSectionProps = {
  comments: AppSuggestionDetail["comments"];
  onAddComment: (body: string) => Promise<void>;
};

export function SuggestionDetailCommentsSection({
  comments,
  onAddComment,
}: SuggestionDetailCommentsSectionProps) {
  return (
    <>
      <Divider />
      <Stack spacing={2}>
        <Typography variant="h6" component="h3" sx={{ fontWeight: 700 }}>
          Discussion
          <Typography
            component="span"
            variant="body2"
            color="text.secondary"
            sx={{ ml: 1, fontWeight: 500 }}
          >
            {comments.length} message{comments.length > 1 ? "s" : ""}
          </Typography>
        </Typography>

        {comments.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Aucun commentaire pour le moment. Lancez la conversation ci-dessous.
          </Typography>
        ) : (
          <Stack spacing={1.5}>
            {comments.map((comment) => (
              <Stack
                key={comment.id}
                direction="row"
                spacing={1.5}
                alignItems="flex-start"
                sx={suggestionCommentSx}
              >
                <SuggestionUserAvatar
                  displayName={comment.authorDisplayName || "Utilisateur"}
                />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Stack
                    direction="row"
                    spacing={1}
                    alignItems="baseline"
                    flexWrap="wrap"
                    useFlexGap
                  >
                    <Typography variant="subtitle2" fontWeight={600}>
                      {comment.authorDisplayName || "Utilisateur"}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatSuggestionDate(comment.createdAt)}
                    </Typography>
                  </Stack>
                  <Box sx={{ mt: 0.75 }}>
                    <SuggestionRichTextContent
                      html={comment.body}
                      format={comment.bodyFormat}
                    />
                  </Box>
                </Box>
              </Stack>
            ))}
          </Stack>
        )}

        <SuggestionCommentComposer onSubmit={onAddComment} />
      </Stack>
    </>
  );
}
