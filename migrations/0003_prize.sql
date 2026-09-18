-- Owner decision: one free sarbath. Coupon valid seven days from issuance.
-- Approval remains off until privacy and launch acceptance are resolved.
UPDATE config
SET prize_label = 'One free sarbath',
    prize_terms = 'Redeem for one free sarbath within 7 days of winning. Show your code to staff at the counter.',
    coupon_validity_ms = 604800000,
    version = version + 1
WHERE id = 1;
