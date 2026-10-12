"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Camp, CampSlot } from "@/lib/camps/types";
import type { CampPaymentMethodId } from "@/lib/camps/constants";
import type { CampMemberSearchHit } from "@/lib/camps/search-club-members";
import {
  allSlotIdsForSelection,
  clubRegistrationOptionLabel,
  formulasForSite,
  identityFromClubRegistration,
  listActiveClubRegistrations,
  listCampSites,
  pickActiveClubRegistration,
  type CampSubjectMode,
  type ClubRegistrationPrefillSource,
} from "@/lib/camps/camp-registration-form-helpers";
import {
  campFormulaSelectionKey,
  parseCampFormulaSelection,
  resolvePricingMode,
} from "@/lib/camps/formulas";
import { computeCampPricingQuote } from "@/lib/camps/pricing";

function emptyIdentity() {
  return {
    firstName: "",
    lastName: "",
    birthDate: "",
    phone: "",
    email: "",
    clubRegistrationId: null as string | null,
  };
}

export function useCampRegistrationForm(
  campId: string,
  mode: "self" | "staff"
) {
  const router = useRouter();
  const [camp, setCamp] = useState<Camp | null>(null);
  const [slots, setSlots] = useState<CampSlot[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [subjectMode, setSubjectModeState] = useState<CampSubjectMode>(
    mode === "staff" ? "search" : "household"
  );
  const [clubRegistrations, setClubRegistrations] = useState<
    ClubRegistrationPrefillSource[]
  >([]);
  const [clubRegistrationId, setClubRegistrationId] = useState<string | null>(
    null
  );
  const [pickedLabel, setPickedLabel] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [isClubMember, setIsClubMember] = useState(true);

  const [siteId, setSiteId] = useState("");
  const [formulaSelection, setFormulaSelection] = useState("");
  const [selectedSlotIds, setSelectedSlotIds] = useState<string[]>([]);
  const [chosenMethod, setChosenMethod] =
    useState<CampPaymentMethodId>("card");
  const [ownerUid, setOwnerUid] = useState("");

  const applyWholeWeekIfMember = useCallback(
    (member: boolean) => {
      const parsed = parseCampFormulaSelection(formulaSelection);
      if (!parsed) return;
      setSelectedSlotIds(
        member
          ? allSlotIdsForSelection(slots, parsed.siteId, parsed.formulaId)
          : []
      );
    },
    [formulaSelection, slots]
  );

  const applyIdentity = useCallback(
    (identity: ReturnType<typeof identityFromClubRegistration>, label: string) => {
      setFirstName(identity.firstName);
      setLastName(identity.lastName);
      setBirthDate(identity.birthDate);
      setPhone(identity.phone);
      setEmail(identity.email);
      setClubRegistrationId(identity.clubRegistrationId);
      setPickedLabel(label);
      setIsClubMember(true);
    },
    []
  );

  const selectSiteAndFormula = useCallback(
    (
      nextCamp: Camp,
      nextSlots: CampSlot[],
      nextSiteId: string,
      selectWholeWeek: boolean
    ) => {
      setSiteId(nextSiteId);
      const siteFormulas = formulasForSite(nextCamp, nextSiteId);
      const first = siteFormulas[0];
      if (!first) {
        setFormulaSelection("");
        setSelectedSlotIds([]);
        return;
      }
      setFormulaSelection(campFormulaSelectionKey(first.siteId, first.id));
      setSelectedSlotIds(
        selectWholeWeek
          ? allSlotIdsForSelection(nextSlots, first.siteId, first.id)
          : []
      );
    },
    []
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const campRes = await fetch(`/api/club/camps/${campId}`, {
        credentials: "include",
      });
      const campJson = (await campRes.json()) as {
        camp?: Camp;
        slots?: CampSlot[];
        error?: string;
      };
      if (!campRes.ok || !campJson.camp) {
        throw new Error(campJson.error ?? "Chargement impossible");
      }

      const nextCamp = campJson.camp;
      const nextSlots = (campJson.slots ?? []).filter((s) => !s.cancelled);
      setCamp(nextCamp);
      setSlots(nextSlots);

      let member = mode === "staff";
      if (mode === "self") {
        const regsRes = await fetch("/api/club/registrations", {
          credentials: "include",
        });
        if (regsRes.ok) {
          const regsJson = (await regsRes.json()) as {
            registrations?: ClubRegistrationPrefillSource[];
          };
          const active = listActiveClubRegistrations(
            regsJson.registrations ?? []
          );
          setClubRegistrations(active);
          const picked = pickActiveClubRegistration(active);
          if (picked) {
            member = true;
            setSubjectModeState("household");
            applyIdentity(
              identityFromClubRegistration(picked),
              clubRegistrationOptionLabel(picked)
            );
          } else {
            setSubjectModeState("guest");
            setIsClubMember(false);
          }
        } else {
          setSubjectModeState("guest");
          setIsClubMember(false);
        }
      }

      const firstSite = listCampSites(nextCamp)[0];
      if (firstSite) {
        selectSiteAndFormula(nextCamp, nextSlots, firstSite.id, member);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, [applyIdentity, campId, mode, selectSiteAndFormula]);

  useEffect(() => {
    void load();
  }, [load]);

  const sites = useMemo(() => (camp ? listCampSites(camp) : []), [camp]);
  const siteFormulas = useMemo(
    () => (camp && siteId ? formulasForSite(camp, siteId) : []),
    [camp, siteId]
  );
  const parsedSelection = useMemo(
    () => parseCampFormulaSelection(formulaSelection),
    [formulaSelection]
  );
  const formulaSlots = useMemo(() => {
    if (!parsedSelection) return [];
    return slots.filter(
      (s) =>
        s.siteId === parsedSelection.siteId &&
        s.formulaId === parsedSelection.formulaId
    );
  }, [slots, parsedSelection]);
  const selectedSlots = useMemo(
    () => formulaSlots.filter((s) => selectedSlotIds.includes(s.id)),
    [formulaSlots, selectedSlotIds]
  );
  const pricingMode = useMemo(() => {
    if (!camp || !parsedSelection) return "day_week" as const;
    return resolvePricingMode(
      camp,
      parsedSelection.formulaId,
      parsedSelection.siteId
    );
  }, [camp, parsedSelection]);
  const quote = useMemo(() => {
    if (!camp || !parsedSelection || selectedSlots.length === 0) return null;
    return computeCampPricingQuote({
      pricing: camp.pricing,
      isClubMember,
      pricingMode,
      slots: selectedSlots,
    });
  }, [camp, parsedSelection, isClubMember, pricingMode, selectedSlots]);

  function clearIdentityFields() {
    const empty = emptyIdentity();
    setFirstName(empty.firstName);
    setLastName(empty.lastName);
    setBirthDate(empty.birthDate);
    setPhone(empty.phone);
    setEmail(empty.email);
    setClubRegistrationId(null);
    setPickedLabel(null);
    setOwnerUid("");
  }

  function setSubjectMode(next: CampSubjectMode) {
    setSubjectModeState(next);
    clearIdentityFields();
    if (next === "guest") {
      setIsClubMember(false);
      applyWholeWeekIfMember(false);
      return;
    }
    setIsClubMember(true);
    if (next === "household") {
      const picked = pickActiveClubRegistration(clubRegistrations);
      if (picked) {
        applyIdentity(
          identityFromClubRegistration(picked),
          clubRegistrationOptionLabel(picked)
        );
        applyWholeWeekIfMember(true);
      }
      return;
    }
    applyWholeWeekIfMember(true);
  }

  function onSiteChange(nextSiteId: string) {
    if (!camp) return;
    selectSiteAndFormula(camp, slots, nextSiteId, isClubMember);
  }

  function onFormulaChange(nextKey: string) {
    setFormulaSelection(nextKey);
    const parsed = parseCampFormulaSelection(nextKey);
    if (!parsed) {
      setSelectedSlotIds([]);
      return;
    }
    setSelectedSlotIds(
      isClubMember
        ? allSlotIdsForSelection(slots, parsed.siteId, parsed.formulaId)
        : []
    );
  }

  function onClubRegistrationChange(nextId: string) {
    const picked = clubRegistrations.find((r) => r.id === nextId);
    if (!picked) return;
    applyIdentity(
      identityFromClubRegistration(picked),
      clubRegistrationOptionLabel(picked)
    );
    applyWholeWeekIfMember(true);
  }

  function onSearchPick(member: CampMemberSearchHit) {
    applyIdentity(
      {
        firstName: member.firstName,
        lastName: member.lastName,
        birthDate: member.birthDate,
        phone: member.phone,
        email: member.email,
        clubRegistrationId: member.registrationId,
      },
      member.displayName
    );
    setOwnerUid(member.submitterUid);
    applyWholeWeekIfMember(true);
  }

  async function handleSubmit() {
    if (!camp || !parsedSelection) return;
    setSubmitting(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        campId,
        firstName,
        lastName,
        birthDate,
        phone,
        email,
        isClubMember,
        formulaId: parsedSelection.formulaId,
        siteId: parsedSelection.siteId,
        siteLabel:
          sites.find((s) => s.id === parsedSelection.siteId)?.label ?? "",
        slotIds: selectedSlotIds,
        chosenMethod,
      };
      if (clubRegistrationId) body.clubRegistrationId = clubRegistrationId;
      if (mode === "staff" && ownerUid.trim()) {
        body.ownerUid = ownerUid.trim();
      }

      const res = await fetch("/api/club/camps/registrations", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as {
        registration?: { id: string };
        error?: string;
      };
      if (!res.ok || !json.registration) {
        throw new Error(json.error ?? "Inscription impossible");
      }
      router.push("/club/mes-stages");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  }

  const identityReady =
    Boolean(firstName.trim()) &&
    Boolean(lastName.trim()) &&
    Boolean(birthDate.trim()) &&
    Boolean(phone.trim()) &&
    Boolean(email.trim()) &&
    (subjectMode === "guest" || Boolean(clubRegistrationId));

  const staffOwnerReady =
    mode !== "staff" ||
    Boolean(clubRegistrationId) ||
    Boolean(ownerUid.trim());

  return {
    camp,
    error,
    loading,
    submitting,
    subjectMode,
    clubRegistrations,
    clubRegistrationId,
    pickedLabel,
    firstName,
    lastName,
    birthDate,
    phone,
    email,
    isClubMember,
    siteId,
    formulaSelection,
    selectedSlotIds,
    chosenMethod,
    ownerUid,
    sites,
    siteFormulas,
    formulaSlots,
    pricingMode,
    parsedSelection,
    quote,
    identityReady,
    staffOwnerReady,
    setFirstName,
    setLastName,
    setBirthDate,
    setPhone,
    setEmail,
    setChosenMethod,
    setOwnerUid,
    setSelectedSlotIds,
    setSubjectMode,
    onSiteChange,
    onFormulaChange,
    onClubRegistrationChange,
    onSearchPick,
    handleSubmit,
  };
}
