import { createAccessControl } from "better-auth/plugins/access"
import { defaultStatements, adminAc } from "better-auth/plugins/admin/access"

const statement = {
  ...defaultStatements,
  fleet: ["create", "read", "update", "delete"],
  vehicle: ["create", "read", "update", "delete"],
  driver: ["read", "update", "approve"],
  ride: ["create", "read", "update", "cancel"],
} as const

const ac = createAccessControl(statement)

const superAdmin = ac.newRole({
  ...adminAc.statements,
  fleet: ["create", "read", "update", "delete"],
  vehicle: ["create", "read", "update", "delete"],
  driver: ["read", "update", "approve"],
  ride: ["create", "read", "update", "cancel"],
})

const developer = ac.newRole({
  ...adminAc.statements,
  fleet: ["create", "read", "update", "delete"],
  vehicle: ["create", "read", "update", "delete"],
  driver: ["read", "update", "approve"],
  ride: ["create", "read", "update", "cancel"],
})

const admin = ac.newRole({
  ...adminAc.statements,
  user: [
    "create",
    "list",
    "impersonate",
    "set-password",
    "set-email",
    "get",
    "ban",
    "update",
  ],
  session: ["list", "revoke"],
  fleet: ["create", "read", "update", "delete"],
  vehicle: ["create", "read", "update", "delete"],
  driver: ["read", "update", "approve"],
  ride: ["create", "read", "update", "cancel"],
})

const user = ac.newRole({
  ...adminAc.statements,
  user: ["list"],
  fleet: ["create", "read", "update", "delete"],
  vehicle: ["create", "read", "update", "delete"],
  driver: ["read", "update", "approve"],
  ride: ["create", "read", "update", "cancel"],
})

const fleet = ac.newRole({
  fleet: ["create", "read", "update"],
  vehicle: ["create", "read", "update", "delete"],
  driver: ["read", "update"],
  ride: ["read"],
})

const driver = ac.newRole({
  vehicle: ["read", "update"],
  ride: ["read", "update"],
})
const passenger = ac.newRole({
  ride: ["create", "read", "cancel"],
})

const userRoles = {
  superAdmin,
  developer,
  admin,
  user,
  fleet,
  driver,
  passenger,
} as const

export { ac as userAc, userRoles }

export type AccessStatement = typeof statement
