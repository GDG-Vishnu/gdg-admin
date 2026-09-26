/**
 * Types for the "managed_events" Firestore collection.
 * This is intentionally separate from the legacy "events" collection.
 */

export type EventMode = "ONLINE" | "OFFLINE" | "HYBRID";
export type EventStatus = "UPCOMING" | "ONGOING" | "COMPLETED";
export type EventType = "WORKSHOP" | "HACKATHON";
export type RegistrationType = "Individual" | "Team";

export interface EligibilityCriteria {
  yearOfGrad: boolean[];
  Dept: string[];
}

export interface ExecutiveBoard {
  organiser: string;
  coOrganiser: string;
  facilitator: string;
}

export type OfficialRole = "GUEST" | "SPEAKER" | "JURY";

export interface EventOfficial {
  role: OfficialRole;
  name: string;
  email: string;
  bio?: string;
  expertise?: string;
  profileUrl?: string;
  linkedinUrl?: string;
}

export interface FAQ {
  question: string;
  answer: string;
}

export interface Rule {
  rule: string;
}

export interface ManagedEvent {
  eventId: string;
  title: string;
  description: string;
  bannerImage: string;
  posterImage: string;
  startDate: string | null;
  endDate: string | null;
  venue: string;
  mode: EventMode;
  status: EventStatus;
  eventType: EventType;
  maxParticipants: number;
  registrationStart: string | null;
  registrationEnd: string | null;
  isRegistrationOpen: boolean;
  createdBy: string;
  createdAt: string | null;
  updatedAt: string | null;
  tags: string[];
  keyHighlights: string[];
  Theme: string[];
  eligibilityCriteria: EligibilityCriteria;
  executiveBoard: ExecutiveBoard;
  eventOfficials: EventOfficial[];
  faqs: FAQ[];
  rules: Rule[];
}

export interface RegisteredMember {
  userId: string;
  name: string;
  email: string;
  phone: string;
  branch?: string;
  registrationType: RegistrationType;
  registeredAt: string | null;
  isCheckedIn: boolean;
  checkedInAt: string | null;
}

/** Shape sent from the create/edit form (without eventId, createdAt, updatedAt) */
export type ManagedEventInput = Omit<ManagedEvent, "eventId" | "createdAt" | "updatedAt">;
