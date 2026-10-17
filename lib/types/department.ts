/**
 * Types for the "departments" Firestore collection.
 * Each department is an entity with its own display order, logo, and color —
 * team members reference it by `deptId` instead of duplicating these fields.
 */

export interface Department {
  id: string;
  name: string;
  order: number;
  logo: string;
  bgColor: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
