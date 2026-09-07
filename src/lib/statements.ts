import { createServiceClient } from "./supabase";

// Reward tier table, carried over unchanged from the current gym-system
// (see HANDOVER.md 3 / 5.3 -- pending final confirmation, but this is the
// existing production rule): unit price per point is determined by each
// store's own total points for the month.
const TIERS = [
  { minPoints: 100, unitPrice: 600 },
  { minPoints: 10, unitPrice: 450 },
  { minPoints: 1, unitPrice: 300 },
] as const;

export function unitPriceForPoints(totalPoints: number): number {
  for (const tier of TIERS) {
    if (totalPoints >= tier.minPoints) return tier.unitPrice;
  }
  return 0;
}

interface StoreTotal {
  storeId: string;
  totalPoints: number;
}

export async function closeMonthForCorporation(corporationId: string, targetMonth: string) {
  const supabase = createServiceClient();

  const monthStart = `${targetMonth}-01`;
  const monthEnd = nextMonth(monthStart);

  const { data: stores, error: storesError } = await supabase
    .from("stores")
    .select("id")
    .eq("corporation_id", corporationId);
  if (storesError) throw storesError;

  const storeIds = (stores ?? []).map((s) => s.id);
  if (storeIds.length === 0) {
    throw new Error(`No stores found for corporation ${corporationId}`);
  }

  const { data: lines, error: linesError } = await supabase
    .from("order_lines")
    .select("id, store_id, points")
    .in("store_id", storeIds)
    .eq("shipment_flag", "shipped")
    .is("statement_id", null)
    .gte("order_date", monthStart)
    .lt("order_date", monthEnd);
  if (linesError) throw linesError;

  const totalsByStore = new Map<string, number>();
  for (const line of lines ?? []) {
    totalsByStore.set(line.store_id, (totalsByStore.get(line.store_id) ?? 0) + Number(line.points));
  }

  const storeTotals: StoreTotal[] = Array.from(totalsByStore.entries()).map(([storeId, totalPoints]) => ({
    storeId,
    totalPoints,
  }));

  const { data: statement, error: statementError } = await supabase
    .from("monthly_statements")
    .insert({ corporation_id: corporationId, target_month: monthStart, status: "confirmed", confirmed_at: new Date().toISOString() })
    .select()
    .single();
  if (statementError) throw statementError;

  let totalAmount = 0;
  const statementStoreRows = storeTotals.map(({ storeId, totalPoints }) => {
    const unitPrice = unitPriceForPoints(totalPoints);
    const amount = totalPoints * unitPrice;
    totalAmount += amount;
    return {
      statement_id: statement.id,
      store_id: storeId,
      total_points: totalPoints,
      unit_price: unitPrice,
      amount,
    };
  });

  if (statementStoreRows.length > 0) {
    const { error } = await supabase.from("monthly_statement_stores").insert(statementStoreRows);
    if (error) throw error;
  }

  const lineIds = (lines ?? []).map((l) => l.id);
  if (lineIds.length > 0) {
    const { error } = await supabase
      .from("order_lines")
      .update({ statement_id: statement.id })
      .in("id", lineIds);
    if (error) throw error;
  }

  await supabase
    .from("monthly_statements")
    .update({ total_amount: totalAmount })
    .eq("id", statement.id);

  return { statementId: statement.id, totalAmount, storeTotals: statementStoreRows };
}

function nextMonth(dateString: string): string {
  const [year, month] = dateString.split("-").map(Number);
  const next = new Date(Date.UTC(year!, month!, 1));
  return next.toISOString().slice(0, 10);
}
