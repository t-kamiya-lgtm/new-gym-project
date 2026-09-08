-- Replaces the placeholder product codes from 0002 with the real Sumaregi
-- product codes (from the client's product code list). All four are still
-- 10-meal sets, so points_per_unit stays 1 (matches the current "1 set = 1pt"
-- reward model).
update products set product_code = 'PM100', name = 'プロテインモンスター 単品(10食セット)' where product_code = 'PM-MEN-SINGLE-10';
update products set product_code = 'PM110', name = 'プロテインモンスター 定期(10食セット)' where product_code = 'PM-MEN-TEIKI-10';
update products set product_code = 'PM403', name = 'プロテインモンスターソバ 単品(10食セット)' where product_code = 'PM-SOBA-SINGLE-10';
update products set product_code = 'PM413', name = 'プロテインモンスターソバ 定期(10食セット)' where product_code = 'PM-SOBA-TEIKI-10';
