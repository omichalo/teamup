"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  Grid,
  IconButton,
  Paper,
  Stack,
  useMediaQuery,
  useTheme,
  Typography,
} from "@mui/material";
import { Add as AddIcon, ArrowBack as ArrowBackIcon, ReportProblem as ReportProblemIcon } from "@mui/icons-material";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { SuggestionCreateDialog } from "@/components/app-suggestions/SuggestionCreateDialog";
import { SuggestionsFiltersBar } from "@/components/app-suggestions/SuggestionsFiltersBar";
import { SuggestionsListPanel } from "@/components/app-suggestions/SuggestionsListPanel";
import { SuggestionDetailPanel } from "@/components/app-suggestions/SuggestionDetailPanel";
import {
  suggestionsDetailPaneSx,
  suggestionsListPaneSx,
  suggestionsToolbarSx,
  suggestionsWorkspaceSx,
} from "@/components/app-suggestions/suggestions-surface-styles";
import {
  useSuggestionDetail,
  useSuggestionsList,
} from "@/components/app-suggestions/useSuggestions";
import { resolveSuggestionSelection } from "@/lib/app-suggestions/resolve-suggestion-selection";
import type { SuggestionKind } from "@/lib/app-suggestions/types";

const LIST_REFRESH_INTERVAL_MS = 60_000;

export function SuggestionsClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { user } = useAuth();

  const {
    suggestions,
    pageInfo,
    isMaintainer,
    loading: listLoading,
    error: listError,
    statusFilter,
    setStatusFilter,
    categoryFilter,
    setCategoryFilter,
    kindFilter,
    setKindFilter,
    mineOnly,
    setMineOnly,
    lastRefreshedAt,
    loadSuggestions,
  } = useSuggestionsList();

  const {
    detail,
    viewer,
    loading: detailLoading,
    error: detailError,
    loadDetail,
    createSuggestion,
    addComment,
    patchMaintainer,
    patchAuthor,
    setDetail,
  } = useSuggestionDetail();

  const selectedId = searchParams.get("id");
  const [createOpen, setCreateOpen] = useState(false);
  const [createKind, setCreateKind] = useState<SuggestionKind>("improvement");
  const mobileDetailRef = useRef<HTMLDivElement>(null);

  const openCreateDialog = (kind: SuggestionKind) => {
    setCreateKind(kind);
    setCreateOpen(true);
  };

  const updateSelectedId = useCallback(
    (id: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (id) {
        params.set("id", id);
      } else {
        params.delete("id");
      }
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  useEffect(() => {
    void loadSuggestions();
  }, [loadSuggestions]);

  useEffect(() => {
    if (listLoading) {
      return;
    }

    const nextSelection = resolveSuggestionSelection({
      selectedId,
      suggestionIds: suggestions.map((suggestion) => suggestion.id),
      isMobile,
      hasUrlId: searchParams.get("id") !== null,
    });

    if (nextSelection !== undefined && nextSelection !== selectedId) {
      updateSelectedId(nextSelection);
    }
  }, [
    isMobile,
    listLoading,
    searchParams,
    selectedId,
    suggestions,
    updateSelectedId,
  ]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void loadSuggestions();
        if (selectedId) {
          void loadDetail(selectedId, { silent: true });
        }
      }
    }, LIST_REFRESH_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [loadDetail, loadSuggestions, selectedId]);

  useEffect(() => {
    if (selectedId) {
      void loadDetail(selectedId);
      return;
    }
    setDetail(null);
  }, [loadDetail, selectedId, setDetail]);

  useEffect(() => {
    if (!isMobile || !selectedId || !mobileDetailRef.current) {
      return;
    }
    mobileDetailRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [isMobile, selectedId]);

  const handleCreate = useCallback(
    async (input: Parameters<typeof createSuggestion>[0]) => {
      const id = await createSuggestion(input);
      await loadSuggestions();
      updateSelectedId(id);
    },
    [createSuggestion, loadSuggestions, updateSelectedId]
  );

  const handleAddComment = useCallback(
    async (body: string) => {
      if (!selectedId) {
        return;
      }
      await addComment(selectedId, body);
      await loadSuggestions();
    },
    [addComment, loadSuggestions, selectedId]
  );

  const handlePatchAuthor = useCallback(
    async (patch: Parameters<typeof patchAuthor>[1]) => {
      if (!selectedId) {
        return;
      }
      await patchAuthor(selectedId, patch);
      await loadSuggestions();
    },
    [loadSuggestions, patchAuthor, selectedId]
  );

  const handlePatchMaintainer = useCallback(
    async (patch: Parameters<typeof patchMaintainer>[1]) => {
      if (!selectedId) {
        return;
      }
      await patchMaintainer(selectedId, patch);
      await loadSuggestions();
    },
    [loadSuggestions, patchMaintainer, selectedId]
  );

  const listPanel = (
    <SuggestionsListPanel
      suggestions={suggestions}
      selectedId={selectedId}
      loading={listLoading}
      hasNextPage={pageInfo.hasNextPage}
      onSelect={updateSelectedId}
      onLoadMore={() =>
        void loadSuggestions({ cursor: pageInfo.nextCursor, append: true })
      }
    />
  );

  const filtersBar = (
    <SuggestionsFiltersBar
      statusFilter={statusFilter}
      categoryFilter={categoryFilter}
      kindFilter={kindFilter}
      mineOnly={mineOnly}
      loading={listLoading}
      lastRefreshedAt={lastRefreshedAt}
      onStatusFilterChange={setStatusFilter}
      onCategoryFilterChange={setCategoryFilter}
      onKindFilterChange={setKindFilter}
      onMineOnlyChange={setMineOnly}
      onRefresh={() => void loadSuggestions()}
    />
  );

  const selectedInList =
    selectedId !== null &&
    suggestions.some((suggestion) => suggestion.id === selectedId);

  const detailPanel = (
    <SuggestionDetailPanel
      detail={selectedInList ? detail : null}
      loading={detailLoading && selectedId !== null && selectedInList}
      error={detailError}
      isMaintainer={viewer.isMaintainer || isMaintainer}
      canEditContent={viewer.canEditContent}
      viewerUid={user?.id ?? null}
      onAddComment={handleAddComment}
      onPatchAuthor={handlePatchAuthor}
      onPatchMaintainer={handlePatchMaintainer}
    />
  );

  const listHeader = (
    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
      <Typography variant="subtitle2" fontWeight={700}>
        Retours
      </Typography>
      <Chip
        label={suggestions.length}
        size="small"
        color="primary"
        variant={suggestions.length > 0 ? "filled" : "outlined"}
        sx={{ height: 22, minWidth: 28, fontWeight: 700 }}
      />
    </Stack>
  );

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 3, sm: 4 } }}>
      <Stack spacing={3}>
        <PageHeader
          eyebrow="Club"
          title="Idées & remontées"
          subtitle="Proposez des évolutions ou signalez un problème sur l'application. Tout le staff peut commenter ; les mainteneurs pilotent le triage."
          actions={
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => openCreateDialog("improvement")}
                sx={{ fontWeight: 600, px: 2.5 }}
              >
                Nouvelle idée
              </Button>
              <Button
                variant="outlined"
                startIcon={<ReportProblemIcon />}
                onClick={() => openCreateDialog("problem")}
                sx={{ fontWeight: 600, px: 2.5 }}
              >
                Signaler un problème
              </Button>
            </Stack>
          }
          marginBottom={0}
        />

        {listError ? <Alert severity="error">{listError}</Alert> : null}

        {isMobile ? (
          selectedId ? (
            <Paper ref={mobileDetailRef} elevation={0} sx={suggestionsWorkspaceSx}>
              <Box sx={suggestionsDetailPaneSx}>
                <Stack spacing={2}>
                  <IconButton
                    aria-label="Retour à la liste"
                    onClick={() => updateSelectedId(null)}
                    sx={{ alignSelf: "flex-start", ml: -0.5 }}
                  >
                    <ArrowBackIcon />
                  </IconButton>
                  {detailPanel}
                </Stack>
              </Box>
            </Paper>
          ) : (
            <Paper elevation={0} sx={suggestionsWorkspaceSx}>
              <Box sx={suggestionsToolbarSx}>{filtersBar}</Box>
              <Box sx={suggestionsListPaneSx}>
                {listHeader}
                {listPanel}
              </Box>
            </Paper>
          )
        ) : (
          <Paper elevation={0} sx={suggestionsWorkspaceSx}>
            <Box sx={suggestionsToolbarSx}>{filtersBar}</Box>
            <Grid container alignItems="stretch">
              <Grid size={{ xs: 12, lg: 4 }}>
                <Box sx={suggestionsListPaneSx}>
                  {listHeader}
                  {listPanel}
                </Box>
              </Grid>
              <Grid size={{ xs: 12, lg: 8 }}>
                <Box sx={suggestionsDetailPaneSx}>{detailPanel}</Box>
              </Grid>
            </Grid>
          </Paper>
        )}
      </Stack>

      <SuggestionCreateDialog
        open={createOpen}
        kind={createKind}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
      />
    </Container>
  );
}
