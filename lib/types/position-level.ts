/**
 * Types for the "position_levels" Firestore collection.
 * Admin-configurable hierarchy used when promoting a member within a
 * department. Lower `level` = higher rank. Lead/Co-Lead/Associate are
 * seeded as defaults; admins can add more via the Positions settings page.
 */

export interface PositionLevel {
  id: string;
  name: string;
  level: number;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}
