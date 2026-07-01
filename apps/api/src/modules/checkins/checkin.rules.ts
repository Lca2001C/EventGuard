import type { CheckinResult, EventStatus, InvitationStatus } from "@prisma/client";

export type CheckinInvitationSnapshot = {
  status: InvitationStatus;
  checkedInAt: Date | null;
  expiresAt: Date | null;
  eventId: string;
  event: {
    status: EventStatus;
    startsAt: Date;
    endsAt: Date;
    checkinStartsAt: Date | null;
    checkinEndsAt: Date | null;
  };
};

export type CheckinDecision = {
  result: CheckinResult;
  reason: string;
};

export function evaluateCheckin(
  invitation: CheckinInvitationSnapshot | null,
  expectedEventId: string | undefined,
  now = new Date()
): CheckinDecision {
  if (!invitation) {
    return { result: "DENIED", reason: "Invitation not found" };
  }

  if (expectedEventId && invitation.eventId !== expectedEventId) {
    return { result: "WRONG_EVENT", reason: "Invitation belongs to another event" };
  }

  if (invitation.status === "CHECKED_IN" || invitation.checkedInAt) {
    return { result: "DUPLICATE", reason: "QR Code already used" };
  }

  if (invitation.status === "CANCELLED" || invitation.status === "DECLINED") {
    return { result: "DENIED", reason: "Invitation is not active" };
  }

  if (invitation.expiresAt && invitation.expiresAt < now) {
    return { result: "DENIED", reason: "Invitation expired" };
  }

  if (invitation.event.status !== "ACTIVE") {
    return { result: "DENIED", reason: "Event is not active" };
  }

  const checkinStartsAt = invitation.event.checkinStartsAt ?? invitation.event.startsAt;
  const checkinEndsAt = invitation.event.checkinEndsAt ?? invitation.event.endsAt;

  if (now < checkinStartsAt || now > checkinEndsAt) {
    return { result: "OUT_OF_WINDOW", reason: "Check-in is outside the configured window" };
  }

  return { result: "APPROVED", reason: "Entry approved" };
}
