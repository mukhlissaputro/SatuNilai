import { env } from "../../../../server/runtime";
import { apiError, assertSameOrigin, hashToken, randomToken } from "../../_security";

type MailEnv = { DB: LocalDatabase; RESEND_API_KEY?: string; MAIL_FROM?: string };
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const { email: rawEmail } = await request.json() as { email?: string };
    const email = String(rawEmail ?? "").trim().toLowerCase().slice(0, 180);
    const runtime = env as unknown as MailEnv;
    const user = email.includes("@") ? await runtime.DB.prepare("SELECT id,display_name AS name FROM users WHERE email=? AND active=1 LIMIT 1").bind(email).first<{ id: string; name: string }>() : null;
    if (user) {
      const token = randomToken();
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      await runtime.DB.batch([
        runtime.DB.prepare("UPDATE password_reset_tokens SET used_at=CURRENT_TIMESTAMP WHERE user_id=? AND used_at IS NULL").bind(user.id),
        runtime.DB.prepare("INSERT INTO password_reset_tokens(id,user_id,token_hash,expires_at) VALUES(?,?,?,?)").bind(crypto.randomUUID(), user.id, await hashToken(token), expiresAt),
      ]);
      if (runtime.RESEND_API_KEY && runtime.MAIL_FROM) {
        const resetUrl = `${new URL(request.url).origin}/?reset=${encodeURIComponent(token)}`;
        await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${runtime.RESEND_API_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ from: runtime.MAIL_FROM, to: [email], subject: "Reset password SatuNilai", text: `Halo ${user.name},\n\nGunakan tautan berikut untuk membuat password baru. Tautan berlaku 30 menit.\n\n${resetUrl}\n\nAbaikan email ini jika Anda tidak meminta reset.` }) });
      }
    }
    return Response.json({ message: "Jika email terdaftar, tautan reset akan dikirim." });
  } catch (error) { return apiError(error); }
}
