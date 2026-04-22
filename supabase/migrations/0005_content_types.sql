-- ============================================================================
-- Ulilearn — Block 1 step 1/2: Extend content_type enum
--
-- Must be committed in a separate transaction from any query that references
-- the new enum values. Run this file first, then 0006_content_cms.sql.
-- ============================================================================

alter type "content_type" add value if not exists 'masterclass';
alter type "content_type" add value if not exists 'workshop';
