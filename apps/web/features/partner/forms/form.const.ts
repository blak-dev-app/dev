export const BUSINESS_TYPES = [
  {
    value: "hotel-resort",
    label: "Hotel / Resort",
  },
  {
    value: "vacation-rental",
    label: "Vacation Rental / Property Management",
  },
  {
    value: "luxury-residence",
    label: "Luxury Residence / Condominium",
  },
  {
    value: "concierge",
    label: "Concierge",
  },
  {
    value: "travel-agency-dmc",
    label: "Travel Agency / DMC",
  },
  {
    value: "private-aviation-fbo",
    label: "Private Aviation / FBO",
  },
  {
    value: "corporate-business",
    label: "Corporate / Business",
  },
  {
    value: "other",
    label: "Other",
  },
]

export const TRANSPORTATION_SERVICES = [
  {
    value: "airport-transfers",
    label: "Airport Transfers",
  },
  {
    value: "point-to-point",
    label: "Point-to-Point",
  },
  {
    value: "hourly",
    label: "Hourly / As-Directed",
  },
  {
    value: "executive",
    label: "Executive Transportation",
  },
  {
    value: "groups-events",
    label: "Groups / Events",
  },
  {
    value: "vip",
    label: "VIP Transportation",
  },
  {
    value: "other",
    label: "Other",
  },
]

export const PARTNERSHIP_USES = [
  {
    value: "offer-to-guests",
    label: "Offer BLAK as a transportation option to our guests",
  },
  {
    value: "book-for-guests",
    label: "Request/book transportation on behalf of guests",
  },
  {
    value: "vip-executive",
    label: "Use BLAK for VIP or executive guests",
  },
  {
    value: "guest-experience",
    label: "Explore integrating BLAK into our guest experience",
  },
  {
    value: "learn-more",
    label: "I'd like to learn more first",
  },
]

export const TRANSPORTATION_OPTIONS = [
  {
    value: "yes",
    label: "Yes",
  },
  {
    value: "no",
    label: "No",
  },
  {
    value: "occasionally",
    label: "Occasionally",
  },
]

export const INITIAL_VALUES = {
  businessName: "",
  businessType: "",
  website: "",
  socialMedia: "",
  city: "",
  country: "",

  fullName: "",
  position: "",
  businessEmail: "",
  countryCode: "+1",
  phoneNumber: "",

  propertiesRooms: "",
  monthlyBookings: "",
  currentTransportation: "",
  transportationDetails: "",

  transportationServices: [],
  partnershipUses: [],
  additionalInformation: "",
  acknowledgment: false,
}
