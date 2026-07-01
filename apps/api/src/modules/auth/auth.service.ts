import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import type { Prisma, User } from "@prisma/client";
import bcrypt from "bcryptjs";
import type { AuthenticatedRequest } from "../../common/types/authenticated-request";
import { addDays, generateSecureToken, hashToken, slugify } from "../../common/utils/security";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

type UserWithAuthRelations = Prisma.UserGetPayload<{
  include: {
    tenant: true;
    roles: {
      include: {
        role: true;
      };
    };
  };
}>;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService
  ) {}

  async register(dto: RegisterDto, request?: AuthenticatedRequest) {
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException("Passwords do not match");
    }

    if (!dto.termsAccepted) {
      throw new BadRequestException("Terms must be accepted");
    }

    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException("Email is already registered");
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const baseSlug = slugify(dto.companyName);
    const starterPlan = await this.prisma.plan.findUnique({ where: { code: "STARTER" } });

    const result = await this.prisma.$transaction(async (tx) => {
      const role = await tx.role.findUniqueOrThrow({ where: { name: "TENANT_ADMIN" } });
      const slug = await this.uniqueTenantSlug(baseSlug, tx);
      const tenant = await tx.tenant.create({
        data: {
          name: dto.companyName,
          slug,
          status: "TRIAL",
          planId: starterPlan?.id
        }
      });
      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          name: dto.name,
          email: dto.email,
          passwordHash,
          termsAcceptedAt: new Date(),
          roles: {
            create: {
              roleId: role.id,
              tenantId: tenant.id
            }
          }
        },
        include: {
          tenant: true,
          roles: {
            include: {
              role: true
            }
          }
        }
      });

      if (starterPlan) {
        await tx.subscription.create({
          data: {
            tenantId: tenant.id,
            planId: starterPlan.id,
            status: "TRIALING",
            trialEndsAt: addDays(new Date(), 14)
          }
        });
      }

      return user;
    });

    await this.auditService.record({
      tenantId: result.tenantId,
      actorId: result.id,
      action: "auth.register",
      entity: "user",
      entityId: result.id,
      ip: request?.ip,
      userAgent: request?.headers["user-agent"],
      metadata: { companyName: dto.companyName }
    });

    return this.issueSession(result);
  }

  async login(dto: LoginDto, request?: AuthenticatedRequest) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        tenant: true,
        roles: {
          include: {
            role: true
          }
        }
      }
    });

    if (!user || user.deletedAt || user.status !== "ACTIVE") {
      throw new UnauthorizedException("Invalid credentials");
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedException("User is temporarily locked");
    }

    const validPassword = await bcrypt.compare(dto.password, user.passwordHash);
    if (!validPassword) {
      await this.registerFailedAttempt(user);
      throw new UnauthorizedException("Invalid credentials");
    }

    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date()
      },
      include: {
        tenant: true,
        roles: {
          include: {
            role: true
          }
        }
      }
    });

    await this.auditService.record({
      tenantId: updated.tenantId,
      actorId: updated.id,
      action: "auth.login",
      entity: "user",
      entityId: updated.id,
      ip: request?.ip,
      userAgent: request?.headers["user-agent"]
    });

    return this.issueSession(updated);
  }

  async refresh(refreshToken: string) {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(refreshToken) },
      include: {
        user: {
          include: {
            tenant: true,
            roles: {
              include: {
                role: true
              }
            }
          }
        }
      }
    });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date() || stored.user.status !== "ACTIVE") {
      throw new UnauthorizedException("Invalid refresh token");
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() }
    });

    return this.issueSession(stored.user, stored.family, stored.id);
  }

  async logout(refreshToken: string) {
    await this.prisma.refreshToken.updateMany({
      where: {
        tokenHash: hashToken(refreshToken),
        revokedAt: null
      },
      data: {
        revokedAt: new Date()
      }
    });

    return { ok: true };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (user) {
      const token = generateSecureToken();
      await this.prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: hashToken(token),
          expiresAt: new Date(Date.now() + 60 * 60 * 1000)
        }
      });
    }

    return {
      ok: true,
      message: "If the email exists, reset instructions will be sent"
    };
  }

  async resetPassword(token: string, password: string) {
    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash: hashToken(token) }
    });

    if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
      throw new BadRequestException("Invalid reset token");
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: resetToken.userId },
        data: {
          passwordHash,
          failedLoginAttempts: 0,
          lockedUntil: null
        }
      }),
      this.prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() }
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: resetToken.userId, revokedAt: null },
        data: { revokedAt: new Date() }
      })
    ]);

    return { ok: true };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        tenantId: true,
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
            primaryColor: true
          }
        },
        roles: {
          select: {
            role: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });

    return {
      ...user,
      roles: user.roles.map((userRole) => userRole.role.name)
    };
  }

  private async issueSession(user: UserWithAuthRelations, family?: string, previousTokenId?: string) {
    const roles = user.roles.map((userRole) => userRole.role.name);
    const payload = {
      sub: user.id,
      tenantId: user.tenantId,
      roles
    };
    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>("JWT_ACCESS_SECRET"),
      expiresIn: this.configService.get<string>("JWT_ACCESS_EXPIRES_IN") ?? "15m"
    });
    const refreshToken = generateSecureToken(48);
    const refreshFamily = family ?? generateSecureToken(16);
    const expiresAt = addDays(new Date(), 7);
    const stored = await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(refreshToken),
        family: refreshFamily,
        expiresAt
      }
    });

    if (previousTokenId) {
      await this.prisma.refreshToken.update({
        where: { id: previousTokenId },
        data: { replacedByTokenId: stored.id }
      });
    }

    return {
      accessToken,
      refreshToken,
      expiresIn: this.configService.get<string>("JWT_ACCESS_EXPIRES_IN") ?? "15m",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        tenantId: user.tenantId,
        tenant: user.tenant
          ? {
              id: user.tenant.id,
              name: user.tenant.name,
              slug: user.tenant.slug,
              status: user.tenant.status,
              primaryColor: user.tenant.primaryColor
            }
          : null,
        roles
      }
    };
  }

  private async registerFailedAttempt(user: User) {
    const attempts = user.failedLoginAttempts + 1;
    const shouldLock = attempts >= MAX_LOGIN_ATTEMPTS;
    const lockedUntil = shouldLock ? new Date(Date.now() + LOCK_MINUTES * 60 * 1000) : null;

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: attempts,
        lockedUntil
      }
    });
  }

  private async uniqueTenantSlug(baseSlug: string, tx: Prisma.TransactionClient): Promise<string> {
    const cleanBase = baseSlug || "tenant";
    let candidate = cleanBase;
    let suffix = 1;

    while (await tx.tenant.findUnique({ where: { slug: candidate } })) {
      suffix += 1;
      candidate = `${cleanBase}-${suffix}`;
    }

    return candidate;
  }
}
