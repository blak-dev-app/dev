"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Button } from "@blak/ui/components/button"
import { Input } from "@blak/ui/components/input"
import { Label } from "@blak/ui/components/label"

const VEHICLE_TYPES = ["Sedan", "SUV", "Luxury Sedan", "Van", "Motorcycle"]

/** Sentinel for "not attached to any fleet" — see the fleet select below. */
const INDEPENDENT = "independent"

type FleetOption = { id: string; fleetName: string }

const INITIAL_VALUES = {
  fullName: "",
  email: "",
  phone: "",
  city: "",
  country: "",
  licenseNumber: "",
  yearsExperience: "",
  vehicleType: "",
  hasOwnVehicle: "yes",
  fleetId: INDEPENDENT,
  acknowledgment: false,
}

export function DriverForm() {
  const router = useRouter()
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState("")
  const [done, setDone] = React.useState(false)
  const [values, setValues] = React.useState(INITIAL_VALUES)
  const [fleets, setFleets] = React.useState<FleetOption[]>([])
  const [fleetsLoading, setFleetsLoading] = React.useState(true)

  // Approved fleets, from a server route rather than a direct Firestore read:
  // this form is unauthenticated and firestore.rules requires auth on
  // fleetApplications. See app/api/public/fleets/route.ts.
  //
  // If the lookup fails or returns nothing, the select still renders with the
  // independent option only — an applicant is never blocked by it.
  React.useEffect(() => {
    let cancelled = false
    fetch("/api/public/fleets")
      .then((res) => (res.ok ? res.json() : { fleets: [] }))
      .then((data) => {
        if (cancelled) return
        setFleets(Array.isArray(data?.fleets) ? data.fleets : [])
      })
      .catch(() => {
        if (!cancelled) setFleets([])
      })
      .finally(() => {
        if (!cancelled) setFleetsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  function set<K extends keyof typeof values>(key: K, value: (typeof values)[K]) {
    setValues((v) => ({ ...v, [key]: value }))
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    const required: (keyof typeof values)[] = [
      "fullName",
      "email",
      "phone",
      "city",
      "country",
      "licenseNumber",
      "yearsExperience",
      "vehicleType",
    ]
    if (required.some((key) => !values[key])) {
      setError("Please fill in all required fields.")
      return
    }
    if (!values.acknowledgment) {
      setError("Please confirm the information provided is accurate.")
      return
    }

    setPending(true)
    try {
      const res = await fetch("/api/driver-applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // fleetId is sent as-is; the server validates it against Firestore and
        // derives the fleet's name itself. "independent" is treated as no fleet.
        body: JSON.stringify(values),
      })
      if (!res.ok) throw new Error("Request failed")
      setDone(true)
    } catch {
      setError("Something went wrong submitting your application. Please try again.")
    } finally {
      setPending(false)
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl bg-muted/80 p-8 text-center lg:p-12">
        <h3 className="text-2xl font-bold">Application received.</h3>
        <p className="mt-3 text-muted-foreground">
          Thank you for applying to drive with BLAK. Our team will review
          your application and email you next steps.
        </p>
        <Button className="mt-6" onClick={() => router.push("/")}>
          Back to home
        </Button>
      </div>
    )
  }

  return (
    <form
      onSubmit={onSubmit}
      className="relative grid gap-5 rounded-2xl bg-muted/80 p-8 shadow-[1px_-1px_0px_0px_#ffffff20] lg:p-12"
    >
      <div className="grid gap-2">
        <Label htmlFor="fullName">Full name</Label>
        <Input id="fullName" value={values.fullName} onChange={(e) => set("fullName", e.target.value)} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" value={values.email} onChange={(e) => set("email", e.target.value)} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="phone">Phone number</Label>
        <Input id="phone" value={values.phone} onChange={(e) => set("phone", e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="city">City</Label>
          <Input id="city" value={values.city} onChange={(e) => set("city", e.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="country">Country</Label>
          <Input id="country" value={values.country} onChange={(e) => set("country", e.target.value)} />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="licenseNumber">Driver&apos;s license number</Label>
        <Input
          id="licenseNumber"
          value={values.licenseNumber}
          onChange={(e) => set("licenseNumber", e.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="yearsExperience">Years driving</Label>
          <Input
            id="yearsExperience"
            value={values.yearsExperience}
            onChange={(e) => set("yearsExperience", e.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="vehicleType">Vehicle type</Label>
          <select
            id="vehicleType"
            value={values.vehicleType}
            onChange={(e) => set("vehicleType", e.target.value)}
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
          >
            <option value="">Select…</option>
            {VEHICLE_TYPES.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="fleetId">Are you joining through a fleet?</Label>
        <select
          id="fleetId"
          value={values.fleetId}
          onChange={(e) => set("fleetId", e.target.value)}
          disabled={fleetsLoading}
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
        >
          <option value={INDEPENDENT}>No — I&apos;m applying as an independent driver</option>
          {fleets.map((f) => (
            <option key={f.id} value={f.id}>
              {f.fleetName}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          {fleetsLoading
            ? "Loading fleets…"
            : fleets.length === 0
              ? "No fleets are currently accepting drivers — apply as an independent driver and BLAK will be in touch."
              : "Pick the fleet that asked you to apply. If you're not sure, choose independent — this can be changed later."}
        </p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="hasOwnVehicle">Do you have your own vehicle?</Label>
        <select
          id="hasOwnVehicle"
          value={values.hasOwnVehicle}
          onChange={(e) => set("hasOwnVehicle", e.target.value)}
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
        >
          <option value="yes">Yes</option>
          <option value="no">No, I need one through BLAK</option>
        </select>
      </div>
      <label className="flex items-start gap-2 text-sm text-muted-foreground">
        <input
          type="checkbox"
          className="mt-1"
          checked={values.acknowledgment}
          onChange={(e) => set("acknowledgment", e.target.checked)}
        />
        I confirm the information provided is accurate.
      </label>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Submitting…" : "Submit application"}
      </Button>
    </form>
  )
}
