export type ItineraryItemType = "flight" | "hotel" | "rental_car" | "ground_transfer" | "activity";
export type CheckpointKind = "departure" | "arrival" | "hotel_arrival" | "daily" | "custom";
export type TravelDocumentType = "passport" | "drivers_license" | "visa" | "insurance" | "booking";

export interface TravelEntitlements {
  coreAccess: boolean;
  travelAccess: boolean;
  canCreateTrips: boolean;
  source: string;
  expiresAt: string | null;
  graceUntil: string | null;
}

export interface TravelContact {
  id: string;
  groupId: string;
  name: string;
  phoneE164: string;
  priority: number;
  isPrimary: boolean;
}

export interface TravelContactGroup {
  id: string;
  name: string;
  contacts: TravelContact[];
}

export interface TravelCheckpoint {
  id: string;
  tripId: string;
  itineraryItemId: string | null;
  kind: CheckpointKind;
  title: string;
  originalDueAt: string;
  dueAt: string;
  timezone: string;
  status: "scheduled" | "waiting" | "confirmed" | "cancelled";
  fixed: boolean;
  graceMinutes: number;
  confirmedAt: string | null;
}

export interface ItineraryItem {
  id: string;
  tripId: string;
  type: ItineraryItemType;
  title: string;
  locationName: string | null;
  originName: string | null;
  destinationName: string | null;
  scheduledStartAt: string;
  scheduledEndAt: string | null;
  expectedStartAt: string;
  expectedEndAt: string | null;
  timezone: string;
  sequence: number;
  fixed: boolean;
  status: string;
  provider: string | null;
  providerFreshAt: string | null;
  confirmationReference: string | null;
}

export interface TravelDocument {
  id: string;
  type: TravelDocumentType;
  displayName: string;
  mimeType: string;
  sizeBytes: number;
  emergencyRelease: boolean;
  createdAt: string;
}

export interface TripSummary {
  id: string;
  name: string;
  destination: string;
  homeTimezone: string;
  startAt: string;
  endAt: string;
  status: "upcoming" | "active" | "completed" | "cancelled";
  contactGroupId: string | null;
  providerFreshAt: string | null;
  nextCheckpoint: TravelCheckpoint | null;
}

export interface TripDetail extends Omit<TripSummary, "nextCheckpoint"> {
  items: ItineraryItem[];
  checkpoints: TravelCheckpoint[];
  documents: TravelDocument[];
  contactGroup: TravelContactGroup | null;
  escalations: Array<{ id: string; status: string; stage: string; acknowledgedAt: string | null; resolvedAt: string | null }>;
  deliveries: Array<{ id: string; escalationId: string; contactId: string; stage: string; status: string; sentAt: string | null; deliveredAt: string | null }>;
}

export interface NewTripPayload {
  name: string;
  destination: string;
  homeTimezone: string;
  startAt: string;
  endAt: string;
  contactGroupId?: string | null;
  items: Array<{
    type: ItineraryItemType;
    title: string;
    locationName?: string;
    originName?: string;
    destinationName?: string;
    scheduledStartAt: string;
    scheduledEndAt?: string | null;
    expectedStartAt?: string;
    expectedEndAt?: string | null;
    timezone: string;
    sequence: number;
    fixed?: boolean;
    provider?: string;
    providerReference?: string;
    providerData?: unknown;
    confirmationReference?: string;
  }>;
  checkpoints: Array<{
    itineraryItemClientIndex?: number;
    kind: CheckpointKind;
    title: string;
    dueAt: string;
    timezone: string;
    fixed?: boolean;
    graceMinutes?: number;
  }>;
}
