import { BadRequestException, Injectable } from "@nestjs/common";
import type { CheckinResult } from "@prisma/client";
import { hashToken } from "../../common/utils/security";
import type { AuthenticatedUser } from "../../common/types/authenticated-request";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { EventsService } from "../events/events.service";
import { DashboardGateway } from "../realtime/dashboard.gateway";
import { evaluateCheckin } from "./checkin.rules";
import { ManualCheckinDto, ValidateCheckinDto } from "./dto/checkin.dto";

@Injectable()
export class CheckinsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsService: EventsService,
    private readonly auditService: AuditService,
    private readonly dashboardGateway: DashboardGateway
  ) {}

  async validate(user: AuthenticatedUser, dto: ValidateCheckinDto) {
    const hashed = hashToken(dto.token);
    const invitation = await this.prisma.invitation.findUnique({
      where: { tokenHash: hashed },
      include: {
        event: true,
        guest: true
      }
    });
    const decision = evaluateCheckin(invitation, dto.eventId);

    if (!invitation) {
      return this.deniedWithoutInvitation(user, dto, hashed, decision.result, decision.reason);
    }

    if (decision.result !== "APPROVED") {
      return this.recordAttempt({
        tenantId: invitation.tenantId,
        eventId: invitation.eventId,
        guestId: invitation.guestId,
        invitationId: invitation.id,
        operatorId: user.id,
        tokenHash: hashed,
        result: decision.result,
        reason: decision.reason,
        companionCount: dto.companionCount ?? 0,
        deviceFingerprint: dto.deviceFingerprint,
        deviceName: dto.deviceName
      });
    }

    const device = await this.device(invitation.tenantId, dto);
    const checkin = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.invitation.updateMany({
        where: {
          id: invitation.id,
          checkedInAt: null,
          status: { not: "CHECKED_IN" }
        },
        data: {
          status: "CHECKED_IN",
          checkedInAt: new Date()
        }
      });

      if (updated.count === 0) {
        return tx.checkin.create({
          data: {
            tenantId: invitation.tenantId,
            eventId: invitation.eventId,
            guestId: invitation.guestId,
            invitationId: invitation.id,
            operatorId: user.id,
            deviceId: device?.id,
            tokenHash: hashed,
            result: "DUPLICATE",
            reason: "QR Code already used",
            companionCount: dto.companionCount ?? 0
          }
        });
      }

      await tx.guest.update({
        where: { id: invitation.guestId },
        data: { invitationStatus: "CHECKED_IN" }
      });

      return tx.checkin.create({
        data: {
          tenantId: invitation.tenantId,
          eventId: invitation.eventId,
          guestId: invitation.guestId,
          invitationId: invitation.id,
          operatorId: user.id,
          deviceId: device?.id,
          tokenHash: hashed,
          result: "APPROVED",
          reason: "Entry approved",
          companionCount: dto.companionCount ?? 0
        },
        include: {
          guest: true,
          event: true
        }
      });
    });

    await this.auditService.record({
      tenantId: invitation.tenantId,
      actorId: user.id,
      action: "checkin.validate",
      entity: "checkin",
      entityId: checkin.id,
      metadata: { result: checkin.result, eventId: invitation.eventId }
    });

    this.dashboardGateway.emitCheckin(invitation.eventId, checkin);

    return {
      result: checkin.result,
      reason: checkin.reason,
      checkin
    };
  }

  async manual(user: AuthenticatedUser, dto: ManualCheckinDto) {
    const event = await this.eventsService.ensureEvent(user, dto.eventId);
    const guest = await this.prisma.guest.findFirst({
      where: {
        id: dto.guestId,
        tenantId: event.tenantId,
        eventId: event.id,
        deletedAt: null
      }
    });

    if (!guest) {
      throw new BadRequestException("Guest does not belong to this event");
    }

    const checkin = await this.prisma.checkin.create({
      data: {
        tenantId: event.tenantId,
        eventId: event.id,
        guestId: guest.id,
        operatorId: user.id,
        result: "MANUAL",
        reason: dto.reason,
        companionCount: dto.companionCount
      },
      include: {
        guest: true,
        event: true
      }
    });

    await this.prisma.guest.update({
      where: { id: guest.id },
      data: { invitationStatus: "CHECKED_IN" }
    });

    await this.auditService.record({
      tenantId: event.tenantId,
      actorId: user.id,
      action: "checkin.manual",
      entity: "checkin",
      entityId: checkin.id,
      metadata: { reason: dto.reason }
    });

    this.dashboardGateway.emitCheckin(event.id, checkin);

    return { result: "MANUAL", reason: dto.reason, checkin };
  }

  async list(user: AuthenticatedUser, eventId: string) {
    const event = await this.eventsService.ensureEvent(user, eventId);
    return this.prisma.checkin.findMany({
      where: { tenantId: event.tenantId, eventId },
      include: {
        guest: true,
        operator: {
          select: {
            id: true,
            name: true
          }
        },
        device: true
      },
      orderBy: { checkedInAt: "desc" },
      take: 200
    });
  }

  async live(user: AuthenticatedUser, eventId: string) {
    const recent = await this.list(user, eventId);
    return {
      websocketEvent: "checkin.created",
      room: `event:${eventId}`,
      recent
    };
  }

  private async deniedWithoutInvitation(
    user: AuthenticatedUser,
    dto: ValidateCheckinDto,
    tokenHash: string,
    result: CheckinResult,
    reason: string
  ) {
    if (!dto.eventId) {
      await this.auditService.record({
        actorId: user.id,
        tenantId: user.tenantId,
        action: "checkin.invalid",
        entity: "checkin",
        metadata: { result, reason }
      });

      return { result, reason };
    }

    const event = await this.eventsService.ensureEvent(user, dto.eventId);
    return this.recordAttempt({
      tenantId: event.tenantId,
      eventId: event.id,
      operatorId: user.id,
      tokenHash,
      result,
      reason,
      companionCount: dto.companionCount ?? 0,
      deviceFingerprint: dto.deviceFingerprint,
      deviceName: dto.deviceName
    });
  }

  private async recordAttempt(input: {
    tenantId: string;
    eventId: string;
    guestId?: string;
    invitationId?: string;
    operatorId: string;
    tokenHash?: string;
    result: CheckinResult;
    reason: string;
    companionCount: number;
    deviceFingerprint?: string;
    deviceName?: string;
  }) {
    const device = await this.device(input.tenantId, {
      deviceFingerprint: input.deviceFingerprint,
      deviceName: input.deviceName
    });
    const checkin = await this.prisma.checkin.create({
      data: {
        tenantId: input.tenantId,
        eventId: input.eventId,
        guestId: input.guestId,
        invitationId: input.invitationId,
        operatorId: input.operatorId,
        tokenHash: input.tokenHash,
        result: input.result,
        reason: input.reason,
        companionCount: input.companionCount,
        deviceId: device?.id
      }
    });

    await this.auditService.record({
      tenantId: input.tenantId,
      actorId: input.operatorId,
      action: "checkin.attempt",
      entity: "checkin",
      entityId: checkin.id,
      metadata: { result: input.result, reason: input.reason }
    });

    this.dashboardGateway.emitCheckin(input.eventId, checkin);

    return {
      result: input.result,
      reason: input.reason,
      checkin
    };
  }

  private async device(
    tenantId: string,
    dto: { deviceFingerprint?: string; deviceName?: string }
  ) {
    if (!dto.deviceFingerprint) {
      return null;
    }

    return this.prisma.checkinDevice.upsert({
      where: {
        tenantId_fingerprint: {
          tenantId,
          fingerprint: dto.deviceFingerprint
        }
      },
      update: {
        name: dto.deviceName ?? "Reception device",
        lastSeenAt: new Date()
      },
      create: {
        tenantId,
        fingerprint: dto.deviceFingerprint,
        name: dto.deviceName ?? "Reception device"
      }
    });
  }
}
