import type { SmaregiOrder, SmaregiSearchOptions, SmaregiSearchResponse } from "./types";

const SEARCH_ENDPOINT = "https://www.primedirect.jp/api/v2/orders/search";

// Fields we never want to pull, because they carry customer PII (name, contact info,
// address, birth date, free-text notes/messages, IP address...). Passed as except_fields
// so the API never returns them, rather than filtering client-side after the fact.
// This list must be reviewed against the real API before go-live (HANDOVER.md 5.3).
export const PII_EXCEPT_FIELDS = [
  "order.order_name01",
  "order.order_name02",
  "order.order_kana01",
  "order.order_kana02",
  "order.order_company_name",
  "order.order_company_department",
  "order.order_email",
  "order.order_tel",
  "order.order_fax",
  "order.order_zip",
  "order.order_addr01",
  "order.order_addr02",
  "order.order_birth",
  "order.order_sex",
  "order.order_sex_name",
  "order.remote_addr",
  "order.note",
  "order.note_attention",
  "order.note_history",
  "order.message",
  "order.customer_note",
  "order.print_type3_name",
  "order.print_type3_biko",
  "order.print_type4_biko",
  "order.letter_message",
  "order.print_message",
  "order.mail_message1",
  "order.mail_message2",
  "order.mail_message3",
  "order.mail_message4",
  "order.mail_message7",
  "order.mail_message8",
  "shipping.shipping_name01",
  "shipping.shipping_name02",
  "shipping.shipping_kana01",
  "shipping.shipping_kana02",
  "shipping.shipping_company_name",
  "shipping.shipping_company_department",
  "shipping.shipping_tel",
  "shipping.shipping_fax",
  "shipping.shipping_zip",
  "shipping.shipping_addr01",
  "shipping.shipping_addr02",
  "shipping.shipping_email",
] as const;

export interface SmaregiClientOptions {
  accessToken: string;
}

export class SmaregiClient {
  constructor(private readonly options: SmaregiClientOptions) {}

  async searchOrders(searchOptions: SmaregiSearchOptions): Promise<SmaregiOrder[]> {
    const body = new URLSearchParams();
    body.set("search_options", JSON.stringify(searchOptions));
    body.set("except_fields", JSON.stringify(PII_EXCEPT_FIELDS));
    body.set("response_options", JSON.stringify({ response_type: "json", charset: "UTF-8" }));

    const res = await fetch(SEARCH_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.options.accessToken}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });

    if (!res.ok) {
      throw new Error(`Sumaregi orders/search failed: HTTP ${res.status}`);
    }

    const json = (await res.json()) as SmaregiSearchResponse;
    if (json.success !== "ok") {
      throw new Error(`Sumaregi orders/search failed: ${json.error_cd} ${json.error_message}`);
    }

    const { orders } = json.response;
    return Array.isArray(orders) ? orders : Object.values(orders);
  }
}
