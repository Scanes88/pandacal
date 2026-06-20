/** Shared application types for EFPT Portal. */

export type Role = "admin" | "coach" | "client";

export interface CoachProfile {
  id: string;
  user_id: string | null;
  name: string;
  email: string;
  is_admin: boolean;
}

export interface ClientProfile {
  id: string;
  user_id: string | null;
  coach_id: string;
  name: string;
  email: string;
  status: string;
}

/**
 * The resolved identity for the signed-in user: which role they hold and the
 * underlying coach/client record. `role` is null when the authenticated user
 * is not yet linked to any coach or client row (pending access).
 */
export interface CurrentProfile {
  userId: string;
  email: string | null;
  role: Role | null;
  coach: CoachProfile | null;
  client: ClientProfile | null;
}
