-- Dummy corporation/store data for building & testing the dashboard/statement
-- screens before real partner data is available. Replace/remove before go-live.
insert into corporations (id, name, invoice_registration_number, contact_email)
values
  ('00000000-0000-0000-0000-000000000001', 'ダミー株式会社(サンプル法人)', 'T0000000000000', 'dummy-corp@example.com');

insert into stores (id, corporation_id, name, advertising_group_code)
values
  ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'サンプルジム渋谷店', 'DUMMY-AD-SHIBUYA'),
  ('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001', 'サンプルジム新宿店', 'DUMMY-AD-SHINJUKU');

-- Product master: プロテインモンスター(高タンパク麺)/プロテインモンスターソバ、
-- それぞれ 10食セットの単品・定期の計4品番。すべて「10食セット」単位=1ptとして計算する
-- (現行の「合計購入点数(pt)」の考え方を踏襲)。
--
-- product_code はスマレジ側の実際の品番が未確定のため仮の値。実際の品番が判明次第、
-- このテーブルの product_code を実値に置き換えること(HANDOVER.md 5.3参照)。
insert into products (product_code, name, points_per_unit)
values
  ('PM-MEN-SINGLE-10', 'プロテインモンスター(高タンパク麺) 10食セット・単品', 1),
  ('PM-MEN-TEIKI-10', 'プロテインモンスター(高タンパク麺) 10食セット・定期', 1),
  ('PM-SOBA-SINGLE-10', 'プロテインモンスターソバ 10食セット・単品', 1),
  ('PM-SOBA-TEIKI-10', 'プロテインモンスターソバ 10食セット・定期', 1);
