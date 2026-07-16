type MailMessage = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

/**
 * Mail abstraction: console (local) or SMTP (production).
 * Never log passwords or secrets.
 */
export async function sendMail(message: MailMessage): Promise<void> {
  const driver = process.env.MAIL_DRIVER || "console";
  const fromName = process.env.MAIL_FROM_NAME || process.env.APP_NAME || "SecurityDesk";
  const fromAddress = process.env.MAIL_FROM_ADDRESS || "noreply@example.com";

  if (driver === "console" || !process.env.SMTP_HOST) {
    console.info("[mail:console]", {
      from: `${fromName} <${fromAddress}>`,
      to: message.to,
      subject: message.subject,
      text: message.text,
    });
    return;
  }

  // SMTP transport lands with nodemailer dependency in a later hardening pass.
  // Until then, fall back to console so deployments without SMTP still work.
  console.info("[mail:smtp-pending]", {
    from: `${fromName} <${fromAddress}>`,
    to: message.to,
    subject: message.subject,
    note: "SMTP_HOST je nastavljen, vendar SMTP transporter še ni vklopljen – sporočilo je v konzoli.",
  });
}
