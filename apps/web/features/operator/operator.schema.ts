import { z } from "zod"

export const businessSchema = z.object({
  name: z.string().min(2, "Legal company name is required"),
  operatingName: z.string().optional(),
  type: z.string().min(1, "Business type is required"),
  website: z.string(),
  email: z.email("Enter a valid business email"),
  phone: z.string().min(6, "Enter a valid business phone number"),
})
export const locationSchema = z.object({
  address: z.string().min(5, "Business address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  pincode: z.string().min(1, "Pincode is required"),
  country: z.string().min(1, "Country is required"),
})
export const contactSchema = z.object({
  contactName: z.string().min(2, "Contact name is required"),
  contactTitle: z.string().min(1, "Contact title is required"),
  contactEmail: z.email("Enter a valid email address"),
  contactPhone: z.string().min(6, "Enter a valid phone number"),
})

export const operationSchema = z.object({
  commerciallyLicensedInsured: z.string(),
  operatesLuxurySedansSuvs: z.string(),
  operatingMarkets: z
    .array(z.string())
    .min(1, "Select at least one operating market"),
  yearsInOperation: z.string().min(1, "Years in operation is required"),
})

export const serviceSchema = z.object({
  vehicleCount: z.string().min(1, "Vehicle count is required"),
  chauffeurCount: z.string(),
  serviceTypes: z.array(z.string()).min(1, "Select at least one service type"),
})
export const operatorSchema = z.object({
  ...businessSchema.shape,
  ...locationSchema.shape,
  ...contactSchema.shape,
  ...operationSchema.shape,
  ...serviceSchema.shape,
})

export type OperatorFormValues = z.infer<typeof operatorSchema>
