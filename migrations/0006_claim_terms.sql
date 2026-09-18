-- Only future plays use the corrected issuance wording. Existing snapshots stay unchanged.
UPDATE config SET
 prize_terms='Redeem for one free sarbath within 7 days of coupon issuance. Show your code to staff at the counter.',
 version=version+1
WHERE id=1;
