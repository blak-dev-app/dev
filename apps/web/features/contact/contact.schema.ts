import { z } from "zod"

export const partnershipFormSchema = z.object({
  contactName: z.string().min(2, "Contact name is required"),
  phone: z.string().optional(),
  email: z.email("Enter a valid email"),
  companyName: z.string(),
  website: z.string().optional(),
  message: z.string().min(10, "Please tell us a little more"),
})

export type PartnershipFormValues = z.infer<typeof partnershipFormSchema>
