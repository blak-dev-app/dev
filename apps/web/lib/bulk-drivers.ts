import { z } from "zod"

/**
 * Shared row model for Fleet Admin bulk driver registration (task #217).
 *
 * ---------------------------------------------------------------------------
 * WHY THIS FILE EXISTS SEPARATELY FROM THE ROUTE
 * ---------------------------------------------------------------------------
 * The bulk importer runs in two passes over the same upload: a dry run that
 * shows the operator exactly what will happen, and a commit that actually
 * writes. Those two passes MUST reach identical verdicts, or the preview is a
 * lie — the operator approves "12 will be created" and gets something else.
 *
 * The only way to guarantee that is for both passes to call the same code, so
 * every validation decision lives here and neither the route nor the UI is
 * allowed to have an opinion of its own. The client parses the spreadsheet
 * into raw strings and does nothing else; the server re-validates from those
 * raw strings on BOTH passes and never trusts a verdict computed anywhere
 * else. A client that lies about its own dry-run result gains nothing.
 *
 * ---------------------------------------------------------------------------
 * WHAT IS DELIBERATELY *NOT* HERE
 * ---------------------------------------------------------------------------
 * Two checks cannot live in this file because they need Firebase, and they are
 * the two that matter most for safety — see api/fleet/drivers/bulk/route.ts:
 *
 *   1. The privileged-email guard. A public form field carrying an admin's
 *      address cost this platform its Super Admin role on 2026-08-18 (#212).
 *      A spreadsheet is that same injection point with N rows behind it, so
 *      the guard runs per row, server-side, against Auth custom claims.
 *   2. Duplicate detection against driverApplications already in Firestore.
 *
 * This file handles only what can be decided from the file's own contents.
 */

/** Exactly the options offered by the public driver form's Vehicle type
 * select. Kept in sync deliberately: a bulk upload must not be able to
 * introduce a vehicle type that a driver applying through the website could
 * never have chosen. */
export const VEHICLE_TYPES = ["Sedan", "SUV", "Luxury Sedan", "Van", "Motorcycle"] as const
export type VehicleTypeOption = (typeof VEHICLE_TYPES)[number]

/** Hard ceiling on rows accepted in one upload. Firestore batched writes cap
 * at 500 operations, and the per-row privileged-email check is a network round
 * trip each, so a larger file would be both untransactional and slow enough to
 * hit the serverless timeout. Bigger rosters are split across uploads — which
 * is safe precisely because re-uploading is idempotent on email. */
export const MAX_BULK_ROWS = 400

/**
 * Canonical field keys, in the column order of the downloadable template.
 * `header` is what the template prints; matching is done on the normalised
 * form so operators can rename, reorder, or re-case columns without breaking.
 */
export const BULK_COLUMNS = [
  { key: "fullName", header: "Full name", required: true },
  { key: "email", header: "Email", required: true },
  { key: "phone", header: "Phone", required: true },
  { key: "city", header: "City", required: true },
  { key: "country", header: "Country", required: true },
  { key: "licenseNumber", header: "Licence number", required: true },
  { key: "yearsExperience", header: "Years of experience", required: true },
  { key: "vehicleType", header: "Vehicle type", required: true },
  { key: "hasOwnVehicle", header: "Owns vehicle", required: false },
] as const

export type BulkFieldKey = (typeof BULK_COLUMNS)[number]["key"]

/**
 * The worked example shown in both the Excel and CSV templates.
 *
 * Its email is an @example.com address ON PURPOSE — see EXAMPLE_DOMAINS below,
 * which rejects it by name. Leaving the sample row in place is the single most
 * likely mistake an operator will make with this feature, and it must fail
 * loudly rather than quietly creating a driver who does not exist.
 */
export const TEMPLATE_EXAMPLE_ROW: Record<BulkFieldKey, string> = {
  fullName: "Jane Okafor",
  email: "jane.okafor@example.com",
  phone: "+1 555 010 4477",
  city: "Chicago",
  country: "United States",
  licenseNumber: "D5521-77841-90",
  yearsExperience: "5",
  vehicleType: "Sedan",
  hasOwnVehicle: "yes",
}

/**
 * Header aliases. The template ships "Licence number" (en-GB) but the schema
 * field, the public form and every existing document use `licenseNumber`
 * (en-US), and operators will type either. Accepting both spellings is
 * cheaper than a support conversation about why a valid file was rejected.
 */
const HEADER_ALIASES: Record<string, BulkFieldKey> = {
  fullname: "fullName",
  name: "fullName",
  drivername: "fullName",
  email: "email",
  emailaddress: "email",
  phone: "phone",
  phonenumber: "phone",
  mobile: "phone",
  city: "city",
  country: "country",
  licencenumber: "licenseNumber",
  licensenumber: "licenseNumber",
  licence: "licenseNumber",
  license: "licenseNumber",
  yearsofexperience: "yearsExperience",
  yearsexperience: "yearsExperience",
  yearsdriving: "yearsExperience",
  experience: "yearsExperience",
  vehicletype: "vehicleType",
  ownsvehicle: "hasOwnVehicle",
  hasownvehicle: "hasOwnVehicle",
  ownvehicle: "hasOwnVehicle",
}

/** Strip the template's "*" required marker, punctuation, spacing and case. */
export function normaliseHeader(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\*/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim()
}

/** Map a sheet's header row onto field keys. Unrecognised columns map to
 * null and are ignored rather than rejected — an operator's own "Notes" or
 * "Internal ref" column should not block an otherwise valid upload. */
export function mapHeaderRow(headerRow: readonly string[]): (BulkFieldKey | null)[] {
  return headerRow.map((h) => HEADER_ALIASES[normaliseHeader(h ?? "")] ?? null)
}

/** Which required columns are missing entirely from the sheet. Reported once
 * up front, because "Email column not found" is a file-level problem and
 * repeating it on all 200 rows would bury it. */
export function missingRequiredColumns(mapped: readonly (BulkFieldKey | null)[]): string[] {
  const present = new Set(mapped.filter((k): k is BulkFieldKey => k !== null))
  return BULK_COLUMNS.filter((c) => c.required && !present.has(c.key)).map((c) => c.header)
}

const trimmed = (v: unknown) => (typeof v === "string" ? v.trim() : v === null || v === undefined ? "" : String(v).trim())

/**
 * The example row shipped in the template uses an @example.com address on
 * purpose, and this rejects it by name.
 *
 * Without it, the single most likely operator mistake — filling the sheet in
 * and forgetting to delete the sample row — would silently create a driver
 * named Jane Okafor who does not exist. That is fabricated data entering the
 * platform through the front door, which the project forbids outright. It is
 * better for that mistake to fail loudly, on the row, with an instruction.
 *
 * RFC 2606 reserves example.com precisely so it can never be a real mailbox,
 * so nothing legitimate is lost by refusing it.
 */
const EXAMPLE_DOMAINS = ["example.com", "example.org", "example.net"]

export const bulkDriverRowSchema = z.object({
  fullName: z.preprocess(trimmed, z.string().min(2, "Full name is too short").max(120, "Full name is too long")),
  email: z.preprocess(
    (v) => (typeof v === "string" ? v.trim().toLowerCase() : trimmed(v)),
    z
      .string()
      .min(1, "Email is required")
      .email("Not a valid email address")
      .refine(
        (e) => !EXAMPLE_DOMAINS.some((d) => e.endsWith("@" + d)),
        "This is the sample row from the template — delete it before uploading"
      )
  ),
  // Kept as a string throughout. A phone number is an identifier, not a
  // quantity: coercing it to a number drops leading zeros and turns long
  // international numbers into scientific notation. The template also forces
  // this column to Text format for the same reason.
  phone: z.preprocess(
    trimmed,
    z
      .string()
      .min(6, "Phone number is too short")
      .max(32, "Phone number is too long")
      .regex(/^[+()\-.\s\d]+$/, "Phone number contains characters that aren't digits or + ( ) - .")
  ),
  city: z.preprocess(trimmed, z.string().min(1, "City is required").max(80, "City is too long")),
  country: z.preprocess(trimmed, z.string().min(1, "Country is required").max(80, "Country is too long")),
  licenseNumber: z.preprocess(
    trimmed,
    z.string().min(3, "Licence number is too short").max(40, "Licence number is too long")
  ),
  // Validated as a string and transformed to a number at the end, rather than
  // via z.number() with a custom type error. Two reasons: the cell arrives
  // from a spreadsheet as text anyway, and the string form of the error
  // parameters is stable across Zod major versions, whereas the object form
  // was reworked in Zod 4. This file cannot be type-checked locally, so
  // version-sensitive API shapes are avoided on purpose.
  yearsExperience: z.preprocess(
    trimmed,
    z
      .string()
      .min(1, "Years of experience is required")
      .regex(/^\d{1,2}$/, "Years of experience must be a whole number, e.g. 5")
      .refine((s) => Number(s) <= 70, "Years of experience looks wrong")
      .transform((s) => Number(s))
  ),
  vehicleType: z.preprocess(
    (v) => {
      const s = trimmed(v)
      // Case-insensitive match back onto the canonical casing, so "suv" and
      // "SUV" both land on the value the rest of the platform stores.
      return VEHICLE_TYPES.find((t) => t.toLowerCase() === String(s).toLowerCase()) ?? s
    },
    z
      .string()
      .refine(
        (v): v is VehicleTypeOption => (VEHICLE_TYPES as readonly string[]).includes(v),
        `Vehicle type must be one of: ${VEHICLE_TYPES.join(", ")}`
      )
  ),
  hasOwnVehicle: z.preprocess(
    (v) => {
      const s = String(trimmed(v)).toLowerCase()
      if (s === "") return "yes"
      if (["yes", "y", "true", "1"].includes(s)) return "yes"
      if (["no", "n", "false", "0"].includes(s)) return "no"
      return s
    },
    z.string().refine((v): v is "yes" | "no" => v === "yes" || v === "no", "Owns vehicle must be yes or no")
  ),
})

export type BulkDriverRow = z.infer<typeof bulkDriverRowSchema>

/** Outcome for a single spreadsheet row. `rowNumber` is the 1-based row as it
 * appears in the operator's own file including the header, so an error can be
 * pointed at without them having to count. */
export type RowVerdict =
  | { outcome: "create"; rowNumber: number; email: string; fullName: string; data: BulkDriverRow }
  | { outcome: "skip"; rowNumber: number; email: string; fullName: string; reason: string }
  | { outcome: "reject"; rowNumber: number; email: string; fullName: string; reason: string }

export interface BulkParseResult {
  verdicts: RowVerdict[]
  /** File-level failure — nothing was even attempted per row. */
  fatal?: string
}

/** True if the row is entirely empty. Trailing blank rows are extremely common
 * in spreadsheets (Excel keeps formatting long past the last value) and must
 * be ignored silently rather than reported as 400 validation errors. */
function isBlankRow(cells: readonly string[]): boolean {
  return cells.every((c) => trimmed(c) === "")
}

/**
 * Validate a parsed sheet. Pure and synchronous: everything decidable from the
 * file itself, and nothing that needs the database.
 *
 * @param rows Raw cell strings INCLUDING the header row at index 0.
 */
export function validateSheet(rows: readonly (readonly string[])[]): BulkParseResult {
  const headerRow = rows[0]
  if (!headerRow || headerRow.length === 0) {
    return { verdicts: [], fatal: "The file appears to be empty — no header row found." }
  }

  const mapped = mapHeaderRow(headerRow)
  const missing = missingRequiredColumns(mapped)
  if (missing.length > 0) {
    return {
      verdicts: [],
      fatal: `These required columns are missing from your file: ${missing.join(", ")}. Download the template to see the expected format.`,
    }
  }

  const bodyRows = rows.slice(1)
  if (bodyRows.length > MAX_BULK_ROWS) {
    return {
      verdicts: [],
      fatal: `This file has ${bodyRows.length} rows. The limit is ${MAX_BULK_ROWS} per upload — split it into smaller files. Re-uploading is safe: drivers already registered are skipped, not duplicated.`,
    }
  }

  const verdicts: RowVerdict[] = []
  // Tracks emails seen earlier IN THIS FILE. The first occurrence is created;
  // later ones are skipped rather than rejected, because a repeated address is
  // usually a copy-paste artefact, not a reason to fail the upload.
  const seenEmails = new Map<string, number>()

  bodyRows.forEach((cells, i) => {
    const rowNumber = i + 2 // +1 for zero-index, +1 for the header row
    if (isBlankRow(cells)) return

    const record: Record<string, string> = {}
    mapped.forEach((key, colIdx) => {
      if (key) record[key] = cells[colIdx] ?? ""
    })

    // Best-effort labels for the preview table, so even a rejected row is
    // identifiable by the operator rather than being just "row 47".
    const rawEmail = String(record.email ?? "").trim().toLowerCase()
    const rawName = String(record.fullName ?? "").trim()

    const parsed = bulkDriverRowSchema.safeParse(record)
    if (!parsed.success) {
      const first = parsed.error.issues[0]
      const field = first?.path?.[0]
      const column = BULK_COLUMNS.find((c) => c.key === field)
      const label = column ? `${column.header}: ` : ""
      verdicts.push({
        outcome: "reject",
        rowNumber,
        email: rawEmail,
        fullName: rawName,
        reason: `${label}${first?.message ?? "Invalid row"}`,
      })
      return
    }

    const email = parsed.data.email
    const firstSeenAt = seenEmails.get(email)
    if (firstSeenAt !== undefined) {
      verdicts.push({
        outcome: "skip",
        rowNumber,
        email,
        fullName: parsed.data.fullName,
        reason: `Duplicate of row ${firstSeenAt} in this file`,
      })
      return
    }
    seenEmails.set(email, rowNumber)

    verdicts.push({
      outcome: "create",
      rowNumber,
      email,
      fullName: parsed.data.fullName,
      data: parsed.data,
    })
  })

  return { verdicts }
}

export interface BulkSummary {
  create: number
  skip: number
  reject: number
  total: number
}

export function summarise(verdicts: readonly RowVerdict[]): BulkSummary {
  return {
    create: verdicts.filter((v) => v.outcome === "create").length,
    skip: verdicts.filter((v) => v.outcome === "skip").length,
    reject: verdicts.filter((v) => v.outcome === "reject").length,
    total: verdicts.length,
  }
}

/**
 * Split pasted spreadsheet content into a grid.
 *
 * Copying a selection out of Excel, Google Sheets or Numbers puts
 * tab-separated text on the clipboard, so paste is supported natively with no
 * file handling and no parsing dependency at all. Comma-separated text is
 * accepted too, detected by which delimiter appears more often in the header.
 *
 * Handles RFC 4180 quoting because exported CSVs quote any field containing a
 * comma — an address like "Chicago, IL" would otherwise split into two columns
 * and silently shift every value after it.
 */
export function parseDelimitedText(text: string): string[][] {
  const normalised = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n")
  const firstLine = normalised.split("\n")[0] ?? ""
  const tabs = (firstLine.match(/\t/g) ?? []).length
  const commas = (firstLine.match(/,/g) ?? []).length
  const delimiter = tabs >= commas ? "\t" : ","

  const rows: string[][] = []
  let row: string[] = []
  let field = ""
  let inQuotes = false

  for (let i = 0; i < normalised.length; i += 1) {
    const char = normalised[i]
    if (inQuotes) {
      if (char === '"') {
        if (normalised[i + 1] === '"') {
          field += '"'
          i += 1
        } else {
          inQuotes = false
        }
      } else {
        field += char
      }
      continue
    }
    if (char === '"') {
      inQuotes = true
    } else if (char === delimiter) {
      row.push(field)
      field = ""
    } else if (char === "\n") {
      row.push(field)
      rows.push(row)
      row = []
      field = ""
    } else {
      field += char ?? ""
    }
  }
  row.push(field)
  rows.push(row)

  // Drop trailing blank rows produced by a final newline.
  while (rows.length > 0 && isBlankRow(rows[rows.length - 1] ?? [])) rows.pop()
  return rows
}
