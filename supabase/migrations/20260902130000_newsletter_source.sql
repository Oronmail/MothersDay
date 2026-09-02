-- Newsletter signup attribution: which door the subscriber came through
-- (newsletter_footer, hero_popup, auth_card). The forms and the
-- /api/newsletter-signup endpoint already send this value; until this
-- migration is applied the inserts drop it.
ALTER TABLE newsletter_subscribers ADD COLUMN IF NOT EXISTS source TEXT;
