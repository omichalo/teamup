import {
  encodeSearchCursorOffset,
  isMissingFirestoreIndexError,
  matchesManagedStatusFilter,
  parseSearchCursorOffset,
  registrationMatchesSearch,
} from "@/lib/club-registration/list-registrations";
import {
  matchesMedicalCertificateFilter,
  resolveManagedListMedicalCertificateFilter,
} from "@/lib/club-registration/medical-certificate";

import {
  ACTIONABLE_REGISTRATION_STATUSES,
  isRegistrationStatus,
  REGISTRATION_STATUS_VALUES,
  resolveManagedListStatusFilter,
} from "@/lib/club-registration/registration-status";

describe("medical certificate list filter", () => {
  it("resolveManagedListMedicalCertificateFilter defaults to all", () => {
    expect(resolveManagedListMedicalCertificateFilter(null)).toBe("all");
    expect(resolveManagedListMedicalCertificateFilter("invalid")).toBe("all");
  });

  it("matchesMedicalCertificateFilter uses normalized certificate status", () => {
    const awaiting = {
      id: "1",
      medicalCertificateDeclaration: "questionnaire_yes_certificate_required",
      medicalCertificateStatus: "required_not_received",
    };
    const notRequired = {
      id: "2",
      medicalCertificateDeclaration: "under_40_all_no",
      medicalCertificateStatus: "validated",
    };

    expect(matchesMedicalCertificateFilter(awaiting, "required_not_received")).toBe(true);
    expect(matchesMedicalCertificateFilter(awaiting, "received")).toBe(false);
    expect(matchesMedicalCertificateFilter(notRequired, "required_not_received")).toBe(false);
    expect(matchesMedicalCertificateFilter(awaiting, "all")).toBe(true);
  });
});

describe("registration-status", () => {
  it("resolveManagedListStatusFilter defaults to actionable", () => {
    expect(resolveManagedListStatusFilter(null)).toBe("actionable");
    expect(resolveManagedListStatusFilter(undefined)).toBe("actionable");
    expect(resolveManagedListStatusFilter("")).toBe("actionable");
    expect(resolveManagedListStatusFilter("unknown")).toBe("actionable");
  });

  it("resolveManagedListStatusFilter accepts known values", () => {
    expect(resolveManagedListStatusFilter("all")).toBe("all");
    expect(resolveManagedListStatusFilter("paid")).toBe("paid");
  });

  it("isRegistrationStatus validates known statuses", () => {
    expect(isRegistrationStatus("submitted")).toBe(true);
    expect(isRegistrationStatus("draft")).toBe(false);
    expect(REGISTRATION_STATUS_VALUES).toContain("approved");
    expect(ACTIONABLE_REGISTRATION_STATUSES).toEqual([
      "submitted",
      "in_review",
      "payment_requested",
    ]);
  });
});

describe("list-registrations helpers", () => {
  it("registrationMatchesSearch matches name and email tokens", () => {
    const summary = {
      id: "r1",
      firstName: "Jean",
      lastName: "Dupont",
      adherentEmail: "jean.dupont@example.com",
      submitterAccountEmail: "parent@example.com",
    };

    expect(registrationMatchesSearch(summary, "dupont")).toBe(true);
    expect(registrationMatchesSearch(summary, "jean dupont")).toBe(true);
    expect(registrationMatchesSearch(summary, "parent@example")).toBe(true);
    expect(registrationMatchesSearch(summary, "martin")).toBe(false);
    expect(registrationMatchesSearch(summary, "j")).toBe(true);
  });

  it("search cursor encodes and decodes offset", () => {
    expect(encodeSearchCursorOffset(25)).toBe("search:25");
    expect(parseSearchCursorOffset("search:25")).toBe(25);
    expect(parseSearchCursorOffset("doc-id")).toBe(0);
    expect(parseSearchCursorOffset(null)).toBe(0);
  });

  it("matchesManagedStatusFilter handles actionable and specific statuses", () => {
    const submitted = { id: "1", status: "submitted" };
    const approved = { id: "2", status: "approved" };

    expect(matchesManagedStatusFilter(submitted, "actionable")).toBe(true);
    expect(matchesManagedStatusFilter(approved, "actionable")).toBe(false);
    expect(matchesManagedStatusFilter(approved, "approved")).toBe(true);
    expect(matchesManagedStatusFilter(submitted, "all")).toBe(true);
  });

  it("isMissingFirestoreIndexError detects Firestore code 9", () => {
    expect(isMissingFirestoreIndexError({ code: 9 })).toBe(true);
    expect(isMissingFirestoreIndexError({ code: 5 })).toBe(false);
    expect(isMissingFirestoreIndexError(new Error("fail"))).toBe(false);
  });
});
