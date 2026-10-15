// Nomes dos jobs nas filas BullMQ (protocolo entre despacho e processors).

export const EMAIL_JOB = {
  PASSWORD_RESET: "password-reset",
  INVITATION: "invitation"
} as const;

export const WHATSAPP_JOB = {
  INVITATION: "invitation"
} as const;
