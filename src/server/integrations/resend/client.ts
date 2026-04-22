import { Resend } from "resend";
import { env } from "@/lib/env";

let _client: Resend | null = null;

export function getResendClient(): Resend {
  if (!env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is required to send emails");
  }
  if (!_client) {
    _client = new Resend(env.RESEND_API_KEY);
  }
  return _client;
}

/** @deprecated Use getResendClient() for lazy instantiation. */
export const resend: Resend = new Proxy({} as Resend, {
  get(_target, prop) {
    const c = getResendClient();
    // @ts-expect-error — dynamic proxy
    return c[prop];
  },
});
