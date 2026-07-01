import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { parse } from "csv-parse/sync";
import type { AuthenticatedUser } from "../../common/types/authenticated-request";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { EventsService } from "../events/events.service";
import { CreateGuestDto, ImportGuestsDto, UpdateGuestDto } from "./dto/guest.dto";

type GuestFilters = {
  search?: string;
  category?: string;
};

@Injectable()
export class GuestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsService: EventsService,
    private readonly auditService: AuditService
  ) {}

  async list(user: AuthenticatedUser, eventId: string, filters: GuestFilters) {
    const event = await this.eventsService.ensureEvent(user, eventId);
    return this.prisma.guest.findMany({
      where: {
        tenantId: event.tenantId,
        eventId,
        deletedAt: null,
        category: filters.category ? (filters.category as never) : undefined,
        name: filters.search
          ? {
              contains: filters.search,
              mode: "insensitive"
            }
          : undefined
      },
      include: {
        companions: true,
        invitations: {
          orderBy: { createdAt: "desc" },
          take: 1
        }
      },
      orderBy: { createdAt: "desc" }
    });
  }

  async create(user: AuthenticatedUser, eventId: string, dto: CreateGuestDto) {
    const event = await this.eventsService.ensureEvent(user, eventId);
    await this.ensureCapacity(event.id, event.capacity);

    const guest = await this.prisma.guest.create({
      data: {
        tenantId: event.tenantId,
        eventId,
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        document: dto.document,
        category: dto.category ?? "COMMON",
        isVip: dto.isVip ?? dto.category === "VIP",
        companionLimit: event.allowCompanions ? dto.companionLimit ?? 0 : 0,
        notes: dto.notes,
        companions:
          dto.companions && event.allowCompanions
            ? {
                create: dto.companions.map((companion) => ({
                  name: companion.name,
                  document: companion.document
                }))
              }
            : undefined
      },
      include: {
        companions: true
      }
    });

    await this.auditService.record({
      tenantId: event.tenantId,
      actorId: user.id,
      action: "guest.create",
      entity: "guest",
      entityId: guest.id,
      metadata: { eventId }
    });

    return guest;
  }

  async importGuests(user: AuthenticatedUser, eventId: string, dto: ImportGuestsDto) {
    const rows = dto.rows?.length ? dto.rows : this.parseCsv(dto.csv);
    if (!rows.length) {
      throw new BadRequestException("No guests to import");
    }

    const created = [];
    for (const row of rows) {
      created.push(await this.create(user, eventId, row));
    }

    await this.auditService.record({
      tenantId: created[0]?.tenantId,
      actorId: user.id,
      action: "guest.import",
      entity: "guest",
      metadata: { eventId, count: created.length }
    });

    return { count: created.length, guests: created };
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateGuestDto) {
    const guest = await this.ensureGuest(user, id);
    const event = await this.prisma.event.findUniqueOrThrow({ where: { id: guest.eventId } });

    const updated = await this.prisma.guest.update({
      where: { id },
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        document: dto.document,
        category: dto.category,
        isVip: dto.isVip,
        companionLimit: event.allowCompanions ? dto.companionLimit : 0,
        notes: dto.notes
      }
    });

    await this.auditService.record({
      tenantId: guest.tenantId,
      actorId: user.id,
      action: "guest.update",
      entity: "guest",
      entityId: guest.id,
      metadata: dto
    });

    return updated;
  }

  async remove(user: AuthenticatedUser, id: string) {
    const guest = await this.ensureGuest(user, id);
    const removed = await this.prisma.guest.update({
      where: { id },
      data: { deletedAt: new Date() }
    });

    await this.auditService.record({
      tenantId: guest.tenantId,
      actorId: user.id,
      action: "guest.delete",
      entity: "guest",
      entityId: guest.id
    });

    return removed;
  }

  async ensureGuest(user: AuthenticatedUser, id: string) {
    const where: Prisma.GuestWhereInput = user.roles.includes("SUPER_ADMIN")
      ? { id, deletedAt: null }
      : { id, tenantId: user.tenantId ?? undefined, deletedAt: null };
    const guest = await this.prisma.guest.findFirst({ where });

    if (!guest) {
      throw new NotFoundException("Guest not found");
    }

    return guest;
  }

  private async ensureCapacity(eventId: string, capacity: number) {
    const count = await this.prisma.guest.count({ where: { eventId, deletedAt: null } });
    if (count >= capacity) {
      throw new BadRequestException("Event capacity reached");
    }
  }

  private parseCsv(csv?: string): CreateGuestDto[] {
    if (!csv) {
      return [];
    }

    const records = parse(csv, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    }) as Array<Record<string, string>>;

    return records.map((record) => ({
      name: record.name ?? record.nome,
      email: record.email,
      phone: record.phone ?? record.telefone,
      category: (record.category ?? record.categoria ?? "COMMON") as never,
      companionLimit: Number(record.companionLimit ?? record.acompanhantes ?? 0),
      notes: record.notes ?? record.observacoes
    }));
  }
}
