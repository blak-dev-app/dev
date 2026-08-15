import { z } from "zod"

export const driverSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  email: z.email("Enter a valid email address"),
  phone: z.string().min(6, "Enter a valid phone number"),
  city: z.string().min(1, "City is required"),
  country: z.string().min(1, "Country is required"),
  licenseNumber: z.string().min(1, "Driver's license number is required"),
  yearsExperience: z.string().min(1, "Years of driving experience is required"),
  vehicleType: z.string().min(1, "Please select a vehicle type"),
  hasOwnVehicle: z.string().min(1, "Please select an option"),
  acknowledgment: z
    .boolean()
    .refine((v) => v === true, "You must confirm the information provided is accurate"),
})

export type DriverSchema = z.infer<typeof driverSchema>
