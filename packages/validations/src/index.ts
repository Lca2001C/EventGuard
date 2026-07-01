import { z } from "zod";

export const passwordSchema = z
  .string()
  .min(10)
  .regex(/[A-Z]/, "Password must include an uppercase letter")
  .regex(/[a-z]/, "Password must include a lowercase letter")
  .regex(/[0-9]/, "Password must include a number");

export const registerSchema = z
  .object({
    name: z.string().min(2).max(120),
    companyName: z.string().min(2).max(160),
    email: z.string().email().toLowerCase(),
    password: passwordSchema,
    confirmPassword: z.string(),
    termsAccepted: z.literal(true)
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"]
  });

export const loginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1)
});

export const eventSchema = z.object({
  name: z.string().min(2).max(160),
  description: z.string().max(1000).optional(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  locationName: z.string().min(2).max(160),
  address: z.string().max(240).optional(),
  capacity: z.number().int().positive().max(100000),
  allowCompanions: z.boolean().default(false),
  maxCompanionsPerGuest: z.number().int().min(0).max(20).default(0),
  checkinStartsAt: z.string().datetime().optional(),
  checkinEndsAt: z.string().datetime().optional()
});

export const guestSchema = z.object({
  name: z.string().min(2).max(160),
  email: z.string().email().toLowerCase().optional(),
  phone: z.string().max(32).optional(),
  category: z.enum(["COMMON", "VIP", "FAMILY", "STAFF", "SUPPLIER"]).default("COMMON"),
  isVip: z.boolean().default(false),
  companionLimit: z.number().int().min(0).max(20).default(0),
  notes: z.string().max(1000).optional(),
  companions: z
    .array(
      z.object({
        name: z.string().min(2).max(160),
        document: z.string().max(64).optional()
      })
    )
    .default([])
});

export const manualCheckinSchema = z.object({
  eventId: z.string().uuid(),
  guestId: z.string().uuid(),
  companionCount: z.number().int().min(0).max(20).default(0),
  reason: z.string().min(3).max(240)
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type EventInput = z.infer<typeof eventSchema>;
export type GuestInput = z.infer<typeof guestSchema>;
export type ManualCheckinInput = z.infer<typeof manualCheckinSchema>;
