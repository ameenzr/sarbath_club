-- A redeemed coupon no longer blocks that phone number from claiming another win.
DELETE FROM coupon_locks
WHERE coupon_id IN (SELECT id FROM coupons WHERE redeemed=1);
