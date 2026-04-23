export const APP_NAME = "Ulilearn";

export const CONTENT_TYPE_LABELS = {
  lecture: "Lecture",
  corso: "Corso",
  documentario: "Documentario",
  masterclass: "Masterclass",
  workshop: "Workshop",
} as const;

export const CONTENT_TYPE_PLURAL_LABELS = {
  lecture: "Lecture",
  corso: "Corsi",
  documentario: "Documentari",
  masterclass: "Masterclass",
  workshop: "Workshop",
} as const;

export const CONTENT_FORMAT_LABELS = {
  on_demand: "On-demand",
  live_online: "Live online",
  live_hybrid: "Live ibrido",
  live_in_person: "Live in presenza",
} as const;

export const CONTENT_STATUS_LABELS = {
  draft: "Bozza",
  scheduled: "Schedulato",
  published: "Pubblicato",
  archived: "Archiviato",
} as const;

export const PURCHASE_STATUS_LABELS = {
  pending: "In sospeso",
  paid: "Pagato",
  refunded: "Rimborsato",
  canceled: "Annullato",
} as const;

export const PURCHASABLE_TYPES = ["masterclass", "workshop"] as const;

export const CONTENT_TYPES = [
  "lecture",
  "corso",
  "documentario",
  "masterclass",
  "workshop",
] as const;

export const CONTENT_FORMATS = [
  "on_demand",
  "live_online",
  "live_hybrid",
  "live_in_person",
] as const;

export const SESSION_REFRESH_WINDOW_DAYS = 30;
export const PROGRESS_SAVE_THROTTLE_MS = 10_000;
export const PROGRESS_COMPLETION_THRESHOLD = 0.9;

export const ROUTES = {
  home: "/",
  catalog: "/catalogo",
  lecture: "/lecture",
  corsi: "/corsi",
  documentari: "/documentari",
  masterclass: "/masterclass",
  workshop: "/workshop",
  authors: "/autori",
  search: "/ricerca",
  login: "/login",
  signup: "/signup",
  resetPassword: "/reset-password",
  verify: "/verify",
  subscribe: "/abbonati",
  checkout: "/checkout",
  watch: (id: string) => `/watch/${id}`,
  contentItem: (type: string, slug: string) => `/${type}/${slug}`,
  author: (slug: string) => `/autori/${slug}`,
  account: {
    home: "/io",
    analisi: "/io/analisi",
    subscription: "/io/abbonamento",
    profile: "/io/profilo",
    saved: "/io/salvati",
    history: "/io/cronologia",
  },
  admin: {
    home: "/admin",
    content: "/admin/contenuti",
    contentNew: "/admin/contenuti/nuovo",
    contentEdit: (id: string) => `/admin/contenuti/${id}`,
    contentModules: (id: string) => `/admin/contenuti/${id}/moduli`,
    authors: "/admin/autori",
    authorNew: "/admin/autori/nuovo",
    authorEdit: (id: string) => `/admin/autori/${id}`,
    users: "/admin/utenti",
    coupons: "/admin/coupon",
    plans: "/admin/piani",
    email: "/admin/email",
    leadMagnet: "/admin/lead-magnet",
    audit: "/admin/audit",
  },
  scopriAutori: "/scopri-autori",
  analizzaProgetto: "/analizza-progetto",
} as const;
