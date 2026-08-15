import { prisma } from "@blak/db"
import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import {
  bearer,
  emailOTP,
  admin as adminPlugin,
  organization as organizationPlugin,
  phoneNumber as phoneNumberPlugin,
} from "better-auth/plugins"
import { userAc, userRoles } from "./permissions"

export const auth = betterAuth({
  baseURL: "http://localhost:3001",
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  logger: {
    disabled: false,
    disableColors: false,
    level: "warn",
    log: (level, message, ...args) => {
      console.log(`[${level}] ${message}`, ...args)
    },
  },
  emailAndPassword: {
    enabled: true,
    autoSignIn: false,
  },
  user: {
    changeEmail: {
      enabled: true,
      updateEmailWithoutVerification: true,
    },
  },
  plugins: [
    bearer(),
    adminPlugin({
      ac: userAc,
      roles: userRoles,
    }),
    organizationPlugin({
      allowUserToCreateOrganization: async (user) => {
        return user.isSuperAdmin
      },
      //   ac: orgAc,
      //   roles: orgRoles,
      schema: {
        organization: {
          additionalFields: {
            phoneNumber: {
              type: "string",
              required: true,
              input: true,
            },
            email: {
              type: "string",
              required: true,
              input: true,
            },
          },
        },
      },
    }),
    phoneNumberPlugin(),
    emailOTP({
      async sendVerificationOTP(data, ctx) {},
    }),
  ],
  databaseHooks: {
    session: {
      create: {
        before: async (session) => {
          const access = {}
          return {
            data: {
              ...session,
              activeOrganizationId: access,
            },
          }
        },
      },
    },
  },
  trustedOrigins: [
    "http://localhost:3000", // web
    "http://localhost:3001", // admin
    "http://localhost:3002", // fleet
  ],
})
