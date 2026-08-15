import { FormOperation } from "./steps/form-operation"
import { FormContact } from "./steps/form-contact"
import { FormBusiness } from "./steps/form-business"
import { FormPartnership } from "./steps/form-partnership"
import { business, contact, operation, partnership } from "../partner.schema"

export const STEPS = [
  {
    key: "business",
    component: FormBusiness,
    schema: business,
  },
  {
    key: "contact",
    component: FormContact,
    schema: contact,
  },
  {
    key: "operations",
    component: FormOperation,
    schema: operation,
  },
  {
    key: "partnership",
    component: FormPartnership,
    schema: partnership,
  },
] as const
