// Domain owns the interface; src/data implements it (SRS 7.3.1).
export interface HealthRepository {
  ping(): Promise<{ status: string; db: string }>;
}
