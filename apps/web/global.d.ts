import en from "./messages/en/home.json"
import common from "./messages/en/common.json"
import partner from "./messages/en/partner.json"
import operator from "./messages/en/operator.json"

type Messages = {
  common: typeof common
  home: typeof en
  partner: typeof partner
  operator: typeof operator
}

declare module "next-intl" {
  interface AppConfig {
    Locale: "en" | "es"
    Messages: Messages
  }
}
