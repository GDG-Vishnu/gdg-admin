/**
 * Types for the "team_members" Firestore collection (normalized schema).
 * A member references a department and a position level by id, and carries
 * a full history of every assignment/transfer/promotion.
 */

export type MemberHistoryAction = "assigned" | "promoted" | "transferred";

export interface MemberHistoryEntry {
  deptId: string;
  deptName: string;
  positionId: string;
  positionName: string;
  order: number;
  action: MemberHistoryAction;
  /** ISO date string the admin entered (e.g. the date of promotion). */
  effectiveDate: string;
  /** ISO timestamp of when this entry was recorded. */
  recordedAt: string;
  recordedBy?: string;
}

export interface TeamMember {
  id: string;
  name: string;
  imageUrl: string;
  logo: string;
  linkedinUrl: string;
  mail: string;
  isAlumni: boolean;
  deptId: string;
  positionId: string;
  order: number;
  history: MemberHistoryEntry[];
  createdAt: string;
  updatedAt: string;
}
