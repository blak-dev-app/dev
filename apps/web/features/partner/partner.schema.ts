import { z } from "zod"

export const business = z.object({
  businessName: z.string().min(2, "Business or property name is required"),
  businessType: z.string().min(1, "Please select a business type"),
  website: z.string().optional().or(z.literal("")),
  socialMedia: z.string().optional(),
  city: z.string().min(2, "City is required"),
  country: z.string().min(1, "Country is required"),
})
export const contact = z.object({
  fullName: z.string().min(2, "Full name is required"),
  position: z.string().min(2, "Title or position is required"),
  businessEmail: z.email("Please enter a valid business email"),
  countryCode: z.string(),
  phoneNumber: z.string().min(6, "Please enter a valid phone number"),
})
export const operation = z.object({
  propertiesRooms: z.string().min(1, "Please provide an estimate"),
  monthlyBookings: z.string().optional(),
  currentTransportation: z.string().min(1, "Please select an option"),
  transportationDetails: z.string().optional(),
  transportationServices: z
    .array(z.string())
    .min(1, "Please select at least one service"),
})

export const partnership = z.object({
  partnershipUses: z
    .array(z.string())
    .min(1, "Please select at least one option"),
  additionalInformation: z.string().optional(),
  acknowledgment: z
    .boolean()
    .refine(
      (value) => value === true,
      "You must confirm that you are authorized to submit this application"
    ),
})

export const partnerSchema = z.object({
  ...business.shape,
  ...contact.shape,
  ...operation.shape,
  ...partnership.shape,
})

export type PartnerSchema = z.infer<typeof partnerSchema>
