import type { FastifyBaseLogger } from 'fastify';

/**
 * Where one-time codes are sent. Only a development sender exists today: a real
 * SMS/WhatsApp provider (e.g. Unifonic, Taqnyat, Twilio) plugs in here once chosen.
 */
export interface SmsSender {
  send(phoneE164: string, text: string): Promise<void>;
}

export function devSmsSender(log: FastifyBaseLogger): SmsSender {
  return {
    async send(phone, text) {
      // Development only: the code is printed to the server log (last 4 digits of the phone only).
      log.warn({ to: `***${phone.slice(-4)}` }, `[dev SMS] ${text}`);
    },
  };
}
