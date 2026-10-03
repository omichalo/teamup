import { buildMemberProfile } from "./build-member-profile";
import { getDefaultRegistrationConfig } from "@/lib/club-registration-config/default-config";
import type { AttendanceMark } from "@/lib/attendance/types";

describe("buildMemberProfile", () => {
  const config = getDefaultRegistrationConfig();
  const slotId = config.sites[0]?.slots[0]?.id ?? "slot-test";

  it("agrège identité, créneaux, présences et finances", () => {
    const marks: AttendanceMark[] = [
      {
        id: "m1",
        date: "2026-09-10",
        slotId,
        siteId: "site",
        seasonLabel: "2026-2027",
        sessionId: "s1",
        kind: "enrolled",
        registrationId: "reg-1",
        displayName: "Ada Lovelace",
        markedAt: "2026-09-10T18:00:00.000Z",
        markedByUid: "coach-1",
      },
    ];

    const profile = buildMemberProfile({
      registrationId: "reg-1",
      data: {
        firstName: "Ada",
        lastName: "Lovelace",
        seasonLabel: "2026-2027",
        status: "paid",
        submitterUid: "user-1",
        ffttLicense: "123456",
        slotIds: [slotId],
        paymentStatus: "paid",
        pricingQuote: {
          catalogVersion: "v1",
          totalCents: 20000,
          lines: [{ kind: "membership", label: "Cotisation", amountCents: 20000 }],
        },
        payment: {
          totalAmountCents: 20000,
          assistanceTotalAmountCents: 0,
          amountToPayCents: 20000,
          aids: [],
          paymentMethod: "card",
          paymentInstallments: 1,
          expectedPayments: [],
          receivedPayments: [
            {
              id: "r1",
              method: "card",
              label: "CB",
              amountCents: 20000,
              receivedAt: "2026-09-01T10:00:00.000Z",
            },
          ],
          paidAmountCents: 20000,
          remainingAmountCents: 0,
          paymentStatus: "paid",
        },
      },
      config,
      marks,
      viewerUid: "user-1",
      canManage: false,
    });

    expect(profile.identity.displayName).toContain("Ada");
    expect(profile.identity.ffttLicense).toBe("123456");
    expect(profile.slots).toHaveLength(1);
    expect(profile.attendance).toHaveLength(1);
    expect(profile.attendance[0]?.slotLabel).not.toBe("Créneau inconnu");
    expect(profile.finance.totals.invoicedCents).toBe(20000);
    expect(profile.documents.receiptAvailable).toBe(true);
    expect(profile.documents.situationAvailable).toBe(true);
    expect(profile.viewer.isOwner).toBe(true);
    expect(profile.viewer.canManage).toBe(false);
  });

  it("marque le viewer staff comme non propriétaire", () => {
    const profile = buildMemberProfile({
      registrationId: "reg-2",
      data: {
        firstName: "Alan",
        lastName: "Turing",
        seasonLabel: "2026-2027",
        submitterUid: "owner",
        slotIds: [],
      },
      config,
      marks: [],
      viewerUid: "admin",
      canManage: true,
    });
    expect(profile.viewer.isOwner).toBe(false);
    expect(profile.viewer.canManage).toBe(true);
  });
});
