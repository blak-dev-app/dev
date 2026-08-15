// Queues transactional email via the Firebase "Trigger Email" extension, which
// watches the `mail` collection and sends through the SMTP relay configured
// when the extension was installed. See docs/EMAIL_SETUP.md for setup steps.
import { adminDb } from "./firebase-admin"

export async function queueEmail(params: { to: string; subject: string; html: string }) {
  await adminDb()
    .collection("mail")
    .add({
      to: [params.to],
      message: { subject: params.subject, html: params.html },
      createdAt: new Date(),
    })
}
