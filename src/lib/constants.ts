export const APP_NAME = "Ulilearn";

export const CONTENT_TYPE_LABELS = {
  lecture: "Lecture",
  corso: "Corso",
  documentario: "Documentario",
} as const;

export const CONTENT_TYPE_PLURAL_LABELS = {
  lecture: "Lecture",
  corso: "Corsi",
  documentario: "Documentari",
} as const;

export const SESSION_REFRESH_WINDOW_DAYS = 30;
export const PROGRESS_SAVE_THROTTLE_MS = 10_000;
export const PROGRESS_COMPLETION_THRESHOLD = 0.9;

export const ROUTES = {
  home: "/",
  catalog: "/catalogo",
  lecture: "/lecture",
  corsi: "/corsi",
  documentari: "/documentari",
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
    subscription: "/io/abbonamento",
    profile: "/io/profilo",
    saved: "/io/salvati",
    history: "/io/cronologia",
  },
  admin: {
    home: "/admin",
    content: "/admin/contenuti",
    authors: "/admin/autori",
    users: "/admin/utenti",
    coupons: "/admin/coupon",
    plans: "/admin/piani",
    email: "/admin/email",
    leadMagnet: "/admin/lead-magnet",
    audit: "/admin/audit",
  },
  scopriAutori: "/scopri-autori",
} as const;
