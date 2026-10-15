import type {
  InvitationEmailJob,
  InvitationWhatsappJob,
  PasswordResetEmailJob
} from "./mensagens";

type EmailContent = {
  subject: string;
  html: string;
  text: string;
};

function layout(title: string, body: string): string {
  return `<!doctype html>
<html lang="pt-BR">
  <body style="font-family: Arial, Helvetica, sans-serif; background:#f4f4f5; margin:0; padding:24px;">
    <div style="max-width:560px; margin:0 auto; background:#ffffff; border-radius:12px; padding:32px;">
      <h1 style="color:#2563eb; font-size:20px; margin:0 0 16px;">EventGuard</h1>
      <h2 style="font-size:18px; margin:0 0 16px;">${title}</h2>
      ${body}
      <p style="color:#71717a; font-size:12px; margin-top:32px;">Este e um e-mail automatico do EventGuard.</p>
    </div>
  </body>
</html>`;
}

export function passwordResetTemplate(job: PasswordResetEmailJob): EmailContent {
  const subject = "Redefinicao de senha - EventGuard";
  const text = `Ola ${job.name},\n\nRecebemos um pedido para redefinir sua senha. Acesse o link abaixo (valido por 1 hora):\n${job.resetUrl}\n\nSe voce nao solicitou, ignore este e-mail.`;
  const html = layout(
    "Redefinicao de senha",
    `<p>Ola ${job.name},</p>
     <p>Recebemos um pedido para redefinir sua senha. O link abaixo e valido por 1 hora.</p>
     <p style="margin:24px 0;">
       <a href="${job.resetUrl}" style="background:#2563eb; color:#fff; padding:12px 20px; border-radius:8px; text-decoration:none;">Redefinir senha</a>
     </p>
     <p style="color:#71717a; font-size:13px;">Se voce nao solicitou, ignore este e-mail.</p>`
  );
  return { subject, html, text };
}

export function invitationEmailTemplate(job: InvitationEmailJob): EmailContent {
  const subject = `Seu convite para ${job.eventName}`;
  const text = `Ola ${job.guestName},\n\nVoce esta convidado para ${job.eventName} em ${job.eventDate} (${job.locationName}).\n\nApresente seu QR Code na entrada. Acesse seu convite:\n${job.publicUrl}`;
  const html = layout(
    `Convite para ${job.eventName}`,
    `<p>Ola ${job.guestName},</p>
     <p>Voce esta convidado para <strong>${job.eventName}</strong>.</p>
     <p><strong>Data:</strong> ${job.eventDate}<br/><strong>Local:</strong> ${job.locationName}</p>
     <p>Apresente o QR Code abaixo na entrada:</p>
     <p style="text-align:center; margin:24px 0;">
       <img src="${job.qrCodeDataUrl}" alt="QR Code do convite" width="200" height="200" style="border:1px solid #e4e4e7; border-radius:8px;" />
     </p>
     <p style="margin:24px 0;">
       <a href="${job.publicUrl}" style="background:#2563eb; color:#fff; padding:12px 20px; border-radius:8px; text-decoration:none;">Ver convite</a>
     </p>`
  );
  return { subject, html, text };
}

export function invitationWhatsappTemplate(job: InvitationWhatsappJob): string {
  return `Ola ${job.guestName}! Voce esta convidado para ${job.eventName} em ${job.eventDate}. Acesse seu convite e QR Code: ${job.publicUrl}`;
}
