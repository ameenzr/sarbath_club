-- Owner approved 30-day automatic retention with no customer deletion feature.
-- Live play is independently gated by GAME_ENABLED and launch acceptance.
UPDATE config SET retention_days=30, deletion_contact='', approved=1, version=version+1 WHERE id=1;
