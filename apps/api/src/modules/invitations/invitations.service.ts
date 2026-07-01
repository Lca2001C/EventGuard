import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import QRCode from "qrcode";
import { addDays, generateSecureToken, hashToken } from "../../common/utils/security";
import type { AuthenticatedUser } from "../../common/types/authenticated-request";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { EventsService } from "../events/events.service";
import { GenerateInvitationsDto, SendInvitationsDto } from "./dto/invitation.dto";

@Injectable()
export class InvitationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly eventsService: EventsService,
    private readonly auditService: AuditService
  ) {}

  async generate(user: AuthenticatedUser, eventId: string, dto: GenerateInvitationsDto) {
    const event = await this.eventsService.ensureEvent(user, eventId);
    const guests = await this.prisma.guest.findMany({
      where: {
        tenantId: event.tenantId,
        eventId,
        deletedAt: null,
        id: dto.guestIds?.length ? { in: dto.guestIds } : undefined
      }
    });

    if (!guests.length) {
      throw new BadRequestException("No guests found for invitation generation");
    }

    const invitations = [];
    for (const guest of guests) {
      const token = generateSecureToken(32);
      const publicUrl = this.publicUrl(token);
      await this.prisma.invitation.updateMany({
        where: {
          tenantId: event.tenantId,
          eventId,
          guestId: guest.id,
          status: { in: ["PENDING", "SENT", "CONFIRMED"] }
        },
        data: { status: "CANCELLED" }
      });

      const invitation = await this.prisma.invitation.create({
        data: {
          tenantId: event.tenantId,
          eventId,
          guestId: guest.id,
          tokenHash: hashToken(token),
          tokenLast4: token.slice(-4),
          status: "PENDING",
          expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : addDays(event.endsAt, 7)
        }
      });

      await this.prisma.guest.update({
        where: { id: guest.id },
        data: { invitationStatus: "PENDING" }
      });

      invitations.push({
        invitationId: invitation.id,
        guestId: guest.id,
        guestName: guest.name,
        token,
        publicUrl,
        qrCodeDataUrl: await QRCode.toDataURL(publicUrl)
      });
    }

    await this.auditService.record({
      tenantId: event.tenantId,
      actorId: user.id,
      action: "invitation.generate",
      entity: "invitation",
      metadata: { eventId, count: invitations.length }
    });

    return { count: invitations.length, invitations };
  }

  async send(user: AuthenticatedUser, eventId: string, dto: SendInvitationsDto) {
    const event = await this.eventsService.ensureEvent(user, eventId);
    const invitations = await this.prisma.invitation.findMany({
      where: {
        tenantId: event.tenantId,
        eventId,
        guestId: dto.guestIds?.length ? { in: dto.guestIds } : undefined,
        status: "PENDING"
      }
    });

    await this.prisma.invitation.updateMany({
      where: { id: { in: invitations.map((invitation) => invitation.id) } },
      data: {
        status: "SENT",
        sentAt: new Date()
      }
    });
    await this.prisma.guest.updateMany({
      where: { id: { in: invitations.map((invitation) => invitation.guestId) } },
      data: { invitationStatus: "SENT" }
    });

    await this.auditService.record({
      tenantId: event.tenantId,
      actorId: user.id,
      action: "invitation.send",
      entity: "invitation",
      metadata: { eventId, count: invitations.length }
    });

    return { count: invitations.length };
  }

  async publicInvitation(token: string) {
    const invitation = await this.findByToken(token);
    const publicUrl = this.publicUrl(token);

    return {
      id: invitation.id,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      event: {
        id: invitation.event.id,
        name: invitation.event.name,
        startsAt: invitation.event.startsAt,
        endsAt: invitation.event.endsAt,
        locationName: invitation.event.locationName,
        address: invitation.event.address
      },
      guest: {
        name: invitation.guest.name,
        category: invitation.guest.category,
        companionLimit: invitation.guest.companionLimit
      },
      qrCodeDataUrl: await QRCode.toDataURL(publicUrl)
    };
  }

  async confirm(token: string) {
    const invitation = await this.findByToken(token);

    if (invitation.status === "CANCELLED" || invitation.status === "DECLINED") {
      throw new BadRequestException("Invitation cannot be confirmed");
    }

    await this.prisma.$transaction([
      this.prisma.invitation.update({
        where: { id: invitation.id },
        data: {
          status: "CONFIRMED",
          confirmedAt: new Date()
        }
      }),
      this.prisma.guest.update({
        where: { id: invitation.guestId },
        data: { invitationStatus: "CONFIRMED" }
      })
    ]);

    return { ok: true };
  }

  private async findByToken(token: string) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { tokenHash: hashToken(token) },
      include: {
        event: true,
        guest: true
      }
    });

    if (!invitation || invitation.deletedAt || invitation.expiresAt && invitation.expiresAt < new Date()) {
      throw new NotFoundException("Invitation not found");
    }

    return invitation;
  }

  private publicUrl(token: string): string {
    const frontendUrl = this.configService.get<string>("FRONTEND_URL") ?? "http://localhost:3000";
    return `${frontendUrl.replace(/\/$/, "")}/invite/${token}`;
  }
}
