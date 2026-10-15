// Mensagens que a Mensageria sabe montar e entregar.

export type PasswordResetEmailJob = {
  to: string;
  name: string;
  resetUrl: string;
};

export type InvitationEmailJob = {
  to: string;
  guestName: string;
  eventName: string;
  eventDate: string;
  locationName: string;
  publicUrl: string;
  qrCodeDataUrl: string;
};

export type InvitationWhatsappJob = {
  to: string;
  guestName: string;
  eventName: string;
  eventDate: string;
  publicUrl: string;
};
