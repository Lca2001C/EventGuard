import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import type { AuthenticatedUser } from "../../common/types/authenticated-request";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { CreateEventDto, UpdateEventDto } from "./dto/event.dto";

type EventFilters = {
  search?: string;
  status?: string;
};

@Injectable()
export class EventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService
  ) {}

  list(user: AuthenticatedUser, filters: EventFilters) {
    const where: Prisma.EventWhereInput = {
      ...this.tenantWhere(user),
      deletedAt: null,
      status: filters.status ? (filters.status as never) : undefined,
      name: filters.search
        ? {
            contains: filters.search,
            mode: "insensitive"
          }
        : undefined
    };

    return this.prisma.event.findMany({
      where,
      include: {
        _count: {
          select: {
            guests: true,
            checkins: true
          }
        }
      },
      orderBy: { startsAt: "asc" }
    });
  }

  async create(user: AuthenticatedUser, dto: CreateEventDto) {
    const tenantId = this.requireTenant(user);
    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);

    if (startsAt >= endsAt) {
      throw new BadRequestException("Event start must be before end");
    }

    const event = await this.prisma.event.create({
      data: {
        tenantId,
        createdById: user.id,
        name: dto.name,
        description: dto.description,
        startsAt,
        endsAt,
        locationName: dto.locationName,
        address: dto.address,
        capacity: dto.capacity,
        allowCompanions: dto.allowCompanions,
        maxCompanionsPerGuest: dto.allowCompanions ? dto.maxCompanionsPerGuest : 0,
        checkinStartsAt: dto.checkinStartsAt ? new Date(dto.checkinStartsAt) : startsAt,
        checkinEndsAt: dto.checkinEndsAt ? new Date(dto.checkinEndsAt) : endsAt,
        status: "ACTIVE"
      }
    });

    await this.auditService.record({
      tenantId,
      actorId: user.id,
      action: "event.create",
      entity: "event",
      entityId: event.id
    });

    return event;
  }

  async get(user: AuthenticatedUser, id: string) {
    const event = await this.prisma.event.findFirst({
      where: {
        id,
        ...this.tenantWhere(user),
        deletedAt: null
      },
      include: {
        guests: {
          where: { deletedAt: null },
          take: 20,
          orderBy: { createdAt: "desc" }
        },
        _count: {
          select: {
            guests: true,
            checkins: true,
            invitations: true
          }
        }
      }
    });

    if (!event) {
      throw new NotFoundException("Event not found");
    }

    return event;
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateEventDto) {
    await this.ensureEvent(user, id);
    const startsAt = dto.startsAt ? new Date(dto.startsAt) : undefined;
    const endsAt = dto.endsAt ? new Date(dto.endsAt) : undefined;

    if (startsAt && endsAt && startsAt >= endsAt) {
      throw new BadRequestException("Event start must be before end");
    }

    const event = await this.prisma.event.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        startsAt,
        endsAt,
        locationName: dto.locationName,
        address: dto.address,
        capacity: dto.capacity,
        allowCompanions: dto.allowCompanions,
        maxCompanionsPerGuest:
          dto.allowCompanions === false ? 0 : dto.maxCompanionsPerGuest,
        checkinStartsAt: dto.checkinStartsAt ? new Date(dto.checkinStartsAt) : undefined,
        checkinEndsAt: dto.checkinEndsAt ? new Date(dto.checkinEndsAt) : undefined,
        status: dto.status
      }
    });

    await this.auditService.record({
      tenantId: event.tenantId,
      actorId: user.id,
      action: "event.update",
      entity: "event",
      entityId: event.id,
      metadata: dto
    });

    return event;
  }

  async remove(user: AuthenticatedUser, id: string) {
    const event = await this.ensureEvent(user, id);
    const removed = await this.prisma.event.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: "CANCELLED"
      }
    });

    await this.auditService.record({
      tenantId: event.tenantId,
      actorId: user.id,
      action: "event.delete",
      entity: "event",
      entityId: event.id
    });

    return removed;
  }

  async dashboard(user: AuthenticatedUser, id: string) {
    const event = await this.ensureEvent(user, id);
    const [totalGuests, checkedIn, duplicateAttempts, invitationsByStatus, checkinsByHour] =
      await Promise.all([
        this.prisma.guest.count({ where: { tenantId: event.tenantId, eventId: id, deletedAt: null } }),
        this.prisma.checkin.count({
          where: { tenantId: event.tenantId, eventId: id, result: { in: ["APPROVED", "MANUAL"] } }
        }),
        this.prisma.checkin.count({
          where: { tenantId: event.tenantId, eventId: id, result: "DUPLICATE" }
        }),
        this.prisma.invitation.groupBy({
          by: ["status"],
          where: { tenantId: event.tenantId, eventId: id },
          _count: { status: true }
        }),
        this.prisma.checkin.findMany({
          where: { tenantId: event.tenantId, eventId: id },
          select: { checkedInAt: true, result: true },
          orderBy: { checkedInAt: "asc" }
        })
      ]);

    const byHour = new Map<string, number>();
    for (const checkin of checkinsByHour) {
      const hour = checkin.checkedInAt.toISOString().slice(0, 13) + ":00:00.000Z";
      byHour.set(hour, (byHour.get(hour) ?? 0) + 1);
    }

    return {
      event,
      totalGuests,
      checkedIn,
      absent: Math.max(totalGuests - checkedIn, 0),
      attendanceRate: totalGuests > 0 ? Math.round((checkedIn / totalGuests) * 100) : 0,
      duplicateAttempts,
      invitationsByStatus,
      checkinsByHour: Array.from(byHour.entries()).map(([hour, count]) => ({ hour, count }))
    };
  }

  async ensureEvent(user: AuthenticatedUser, id: string) {
    const event = await this.prisma.event.findFirst({
      where: {
        id,
        ...this.tenantWhere(user),
        deletedAt: null
      }
    });

    if (!event) {
      throw new NotFoundException("Event not found");
    }

    return event;
  }

  private tenantWhere(user: AuthenticatedUser): Prisma.EventWhereInput {
    if (user.roles.includes("SUPER_ADMIN")) {
      return {};
    }

    return { tenantId: this.requireTenant(user) };
  }

  private requireTenant(user: AuthenticatedUser): string {
    if (!user.tenantId) {
      throw new ForbiddenException("Tenant scope is required");
    }

    return user.tenantId;
  }
}
