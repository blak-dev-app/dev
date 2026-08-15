import {
  businessSchema,
  contactSchema,
  locationSchema,
  operationSchema,
  serviceSchema,
} from "../operator.schema"
import { FormAddress } from "./steps/form-address"
import { FormContact } from "./steps/form-contact"
import { FormBusiness } from "./steps/form-business"
import { FormOperation } from "./steps/form-operation"
import { FormService } from "./steps/form-service"

export const STEPS = [
  {
    key: "business",
    component: FormBusiness,
    schema: businessSchema,
  },
  {
    key: "address",
    component: FormAddress,
    schema: locationSchema,
  },
  {
    key: "contact",
    component: FormContact,
    schema: contactSchema,
  },
  {
    key: "operation",
    component: FormOperation,
    schema: operationSchema,
  },
  {
    key: "service",
    component: FormService,
    schema: serviceSchema,
  },
] as const
