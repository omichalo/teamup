import { USER_ROLES } from "@/lib/auth/roles";
import {
  ATTENDANCE_LEAD_MANAGER_ROLES,
  ATTENDANCE_OPERATOR_ROLES,
  ATTENDANCE_CANCELLATION_ROLES,
  isAttendanceLeadManager,
  isAttendanceOperator,
  isAttendanceCancellationManager,
} from "./access";

describe("attendance access", () => {
  it("autorise secrétaire et membre du bureau au pointage", () => {
    expect(isAttendanceOperator(USER_ROLES.SECRETARY)).toBe(true);
    expect(isAttendanceOperator(USER_ROLES.BOARD_MEMBER)).toBe(true);
    expect(isAttendanceOperator(USER_ROLES.COACH)).toBe(true);
    expect(isAttendanceOperator(USER_ROLES.ADMIN)).toBe(true);
    expect(isAttendanceOperator(USER_ROLES.PLAYER)).toBe(false);
    expect(isAttendanceOperator(USER_ROLES.ASSISTANT_SECRETARY)).toBe(false);
  });

  it("autorise secrétaire et membre du bureau à la file des essais", () => {
    expect(isAttendanceLeadManager(USER_ROLES.SECRETARY)).toBe(true);
    expect(isAttendanceLeadManager(USER_ROLES.BOARD_MEMBER)).toBe(true);
    expect(isAttendanceLeadManager(USER_ROLES.COACH)).toBe(false);
    expect(ATTENDANCE_OPERATOR_ROLES).toContain(USER_ROLES.BOARD_MEMBER);
    expect(ATTENDANCE_LEAD_MANAGER_ROLES).toContain(USER_ROLES.SECRETARY);
  });

  it("autorise les annulations aux mêmes rôles que la file des essais", () => {
    expect(isAttendanceCancellationManager(USER_ROLES.ADMIN)).toBe(true);
    expect(isAttendanceCancellationManager(USER_ROLES.SECRETARY)).toBe(true);
    expect(isAttendanceCancellationManager(USER_ROLES.BOARD_MEMBER)).toBe(true);
    expect(isAttendanceCancellationManager(USER_ROLES.COACH)).toBe(false);
    expect(ATTENDANCE_CANCELLATION_ROLES).toEqual(ATTENDANCE_LEAD_MANAGER_ROLES);
  });
});
