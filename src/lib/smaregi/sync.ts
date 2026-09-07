import { SmaregiClient } from "./client";
import type { SmaregiOrder } from "./types";
import { createServiceClient } from "../supabase";

// Placeholder mapping from Sumaregi's order_status values to the internal
// shipment_flag used by the reward calculation (not_shipped/shipped/canceled/excluded).
// The real master value list is still pending (HANDOVER.md 5.3) -- update this map
// once it's confirmed. Anything not listed here falls back to "not_shipped" so it
// is excluded from reward totals until triaged, rather than silently counted.
const ORDER_STATUS_TO_SHIPMENT_FLAG: Record<string, string> = {
  出荷済み: "shipped",
  キャンセル: "canceled",
};

function resolveShipmentFlag(order: SmaregiOrder): string {
  if (order.cancel_date) return "canceled";
  return ORDER_STATUS_TO_SHIPMENT_FLAG[order.order_status] ?? "not_shipped";
}

// Which order field identifies the store. Sumaregi returns both a "direct" ad code
// (this order) and a "first" ad code (the customer's original acquisition order) --
// we attribute every order to the store from its own advertising_group_code so a
// repeat purchase is still credited to the gym that drove it, not the customer's
// very first order.
function resolveAdvertisingGroupCode(order: SmaregiOrder): string | undefined {
  return order.advertising_group_code || order.first_advertising_group_code;
}

interface StoreLookup {
  byAdCode: Map<string, string>; // advertising_group_code -> store_id
}

interface ProductLookup {
  byCode: Map<string, number>; // product_code -> points_per_unit
}

export async function syncOrders(options: { accessToken: string; sinceMinutes?: number }) {
  const supabase = createServiceClient();
  const client = new SmaregiClient({ accessToken: options.accessToken });

  const { data: syncState } = await supabase
    .from("order_sync_state")
    .select("last_synced_update_date")
    .single();

  const since = syncState?.last_synced_update_date
    ? new Date(syncState.last_synced_update_date)
    : new Date(Date.now() - (options.sinceMinutes ?? 60) * 60_000);

  const now = new Date();

  const [{ data: stores }, { data: products }] = await Promise.all([
    supabase.from("stores").select("id, advertising_group_code").eq("is_active", true),
    supabase.from("products").select("product_code, points_per_unit").eq("is_active", true),
  ]);

  const storeLookup: StoreLookup = {
    byAdCode: new Map((stores ?? []).map((s) => [s.advertising_group_code, s.id])),
  };
  const productLookup: ProductLookup = {
    byCode: new Map((products ?? []).map((p) => [p.product_code, p.points_per_unit])),
  };

  let offset = 0;
  const limit = 500;
  let totalUpserted = 0;

  for (;;) {
    const orders = await client.searchOrders({
      update_date_from: formatDateTime(since),
      update_date_to: formatDateTime(now),
      limit,
      offset,
    });

    if (orders.length === 0) break;

    const rows = orders.flatMap((order) => mapOrderToLines(order, storeLookup, productLookup));
    if (rows.length > 0) {
      const { error } = await supabase
        .from("order_lines")
        .upsert(rows, { onConflict: "smaregi_order_id,order_detail_no" });
      if (error) throw error;
      totalUpserted += rows.length;
    }

    if (orders.length < limit) break;
    offset += limit;
  }

  await supabase
    .from("order_sync_state")
    .update({ last_synced_update_date: now.toISOString(), last_run_at: now.toISOString(), last_error: null })
    .eq("id", true);

  return { totalUpserted };
}

function mapOrderToLines(order: SmaregiOrder, stores: StoreLookup, products: ProductLookup) {
  const adCode = resolveAdvertisingGroupCode(order);
  const storeId = adCode ? stores.byAdCode.get(adCode) : undefined;
  const shipmentFlag = resolveShipmentFlag(order);

  return order.order_detail.map((detail) => {
    const quantity = Number(detail.product_quantity);
    const pointsPerUnit = products.byCode.get(detail.product_code) ?? 1;

    return {
      smaregi_order_id: order.order_id,
      ec_order_id: order.ec_order_id,
      order_detail_no: detail.product_no,
      store_id: storeId ?? null,
      advertising_group_code: adCode ?? null,
      // Pending decision (HANDOVER.md 5.3): confirm customer_id vs smaregi_customer_id
      // as the canonical opaque member key before relying on this in reporting.
      member_key: order.customer_id,
      product_code: detail.product_code,
      product_name: detail.product_name,
      quantity,
      points: quantity * pointsPerUnit,
      order_date: order.order_date,
      shipment_flag: shipmentFlag,
      raw_order_status: order.order_status,
      raw_order_status2: order.order_status2 ?? null,
    };
  });
}

function formatDateTime(date: Date): string {
  return date.toISOString().slice(0, 19).replace("T", " ");
}
