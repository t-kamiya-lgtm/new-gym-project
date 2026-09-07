// Shape of the fields we actually consume from the Sumaregi EC orders/search API.
// This is intentionally a subset of the ~450 documented order.* / order_detail.* /
// shipping.* fields -- see HANDOVER.md 4.1 for the full field reference.

export interface SmaregiOrderDetail {
  product_no: number;
  product_code: string;
  product_name: string;
  product_quantity: string;
}

export interface SmaregiOrder {
  order_id: string;
  ec_order_id: string;
  customer_id: string;
  smaregi_customer_id?: string;
  order_date: string;
  order_status: string;
  order_status2?: string;
  cancel_date?: string;
  advertising_group_code?: string;
  first_advertising_group_code?: string;
  order_detail: SmaregiOrderDetail[];
}

export interface SmaregiSearchOptions {
  order_id_from?: number;
  order_id_to?: number;
  order_date_from?: string;
  order_date_to?: string;
  update_date_from?: string;
  update_date_to?: string;
  order_statuses?: string;
  limit?: number;
  offset?: number;
}

export interface SmaregiSearchResponse {
  success: string;
  error_cd: string;
  error_message: string;
  response: {
    orders: Record<string, SmaregiOrder> | SmaregiOrder[];
  };
}
