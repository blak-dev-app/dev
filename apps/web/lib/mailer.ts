/**
 * Transactional email.
 *
 * ---------------------------------------------------------------------------
 * REPLACED 2026-08-18 - this file previously sent nothing at all
 * ---------------------------------------------------------------------------
 * The old implementation wrote a document to a Firestore `mail` collection and
 * returned, on the assumption that the Firebase "Trigger Email" extension was
 * watching that collection and relaying through SMTP.
 *
 * That extension was never installed. Verified in the Firebase console:
 * blak-dev had zero extensions, and all six documents sitting in `mail` had no
 * `delivery` field - the field Trigger Email stamps onto every document it
 * processes. Nothing had ever read them. The `docs/EMAIL_SETUP.md` referenced
 * in the old header comment was never written either.
 *
 * So every invite and every approve/reject decision this platform has ever
 * "sent" went into a queue with no consumer, and both call sites wrap this
 * function in a try/catch, so nothing ever surfaced. See
 * BLAK_IMPLEMENTATION_STATUS.md, task #206.
 *
 * This now calls Resend's HTTP API directly. Chosen over installing Trigger
 * Email because Trigger Email is only a relay - it still requires SMTP
 * credentials from some provider - and Firebase Extensions is scheduled to shut
 * down on 31 March 2027, so building on it meant a forced migration inside a
 * year.
 *
 * Deliberately uses `fetch` rather than the `resend` npm package: no new
 * dependency, no lockfile change, and the request is four lines. The endpoint
 * and payload shape are per Resend's Send Email API reference.
 *
 * ---------------------------------------------------------------------------
 * Required environment variables (Vercel -> Project -> Settings -> Environment
 * Variables, same place FIREBASE_ADMIN_* already live):
 *
 *   RESEND_API_KEY   Required. From resend.com -> API Keys. Starts with `re_`.
 *   MAIL_FROM        Optional. Defaults to "BLAK <noreply@rideblak.com>".
 *                    The domain here must be verified in Resend, otherwise
 *                    Resend rejects the send. Until rideblak.com is verified,
 *                    set this to "BLAK <onboarding@resend.dev>" - Resend's
 *                    shared testing sender, which can only deliver to the
 *                    address that owns the Resend account.
 *
 * If RESEND_API_KEY is absent this logs loudly and reports failure rather than
 * throwing. A missing key must not take down the invite endpoint - but it must
 * also never again look like success.
 */

export type SendEmailResult =
  | { ok: true; id: string }
  | { ok: false; error: string }

const RESEND_ENDPOINT = "https://api.resend.com/emails"
const DEFAULT_FROM = "BLAK <noreply@rideblak.com>"

/**
 * Sends one transactional email. Never throws - always returns a result, so
 * callers can record whether delivery actually happened instead of assuming it.
 */
export async function sendEmail(params: {
  to: string
  subject: string
  html: string
}): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    const error =
      "RESEND_API_KEY is not set - no email was sent. Add it in Vercel project settings."
    console.error(`mailer: ${error}`)
    return { ok: false, error }
  }

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.MAIL_FROM || DEFAULT_FROM,
        to: [params.to],
        subject: params.subject,
        html: params.html,
      }),
    })

    const body = (await res.json().catch(() => null)) as
      | { id?: string; message?: string; name?: string }
      | null

    if (!res.ok) {
      // Resend reports failures as {statusCode, name, message}. Surface the
      // real reason - "domain is not verified" and "invalid API key" are very
      // different problems and the log should say which.
      const error = body?.message || `Resend returned HTTP ${res.status}`
      console.error(`mailer: send to ${params.to} failed - ${error}`)
      return { ok: false, error }
    }

    if (!body?.id) {
      const error = "Resend returned 2xx with no message id"
      console.error(`mailer: ${error}`)
      return { ok: false, error }
    }

    return { ok: true, id: body.id }
  } catch (err) {
    const error = err instanceof Error ? err.message : "Unknown network error"
    console.error(`mailer: send to ${params.to} threw - ${error}`)
    return { ok: false, error }
  }
}

/**
 * Backwards-compatible wrapper.
 *
 * The name is now inaccurate - nothing is queued, the send is synchronous - but
 * it is kept so the two existing call sites (/api/admin/invite and
 * /api/admin/final-decision) keep working without being edited in the same
 * change that swaps the transport. Those routes currently swallow failures in a
 * try/catch; migrating them to `sendEmail` and recording the result on the
 * application document is tracked separately as task #211.
 *
 * Prefer `sendEmail` in new code.
 */
export async function queueEmail(params: {
  to: string
  subject: string
  html: string
}): Promise<void> {
  await sendEmail(params)
}
