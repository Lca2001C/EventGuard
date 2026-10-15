export const EMAIL_QUEUE = "email";
export const WHATSAPP_QUEUE = "whatsapp";
export const QUEUE_ENABLED = "QUEUE_ENABLED";

export const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: "exponential" as const, delay: 2_000 },
  removeOnComplete: 1_000,
  removeOnFail: 5_000
};
