-- 1. Modify the existing booking_requests table
ALTER TABLE booking_requests 
ADD COLUMN IF NOT EXISTS formatted_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS financial_year VARCHAR(20);

-- 2. Drop the existing SERIAL auto-increment behavior from booking_seq
-- PostgreSQL links SERIAL to a sequence object. We need to drop the default value
ALTER TABLE booking_requests ALTER COLUMN booking_seq DROP DEFAULT;

-- 3. Create the sequence tracker table
CREATE TABLE IF NOT EXISTS sequence_tracker (
    id SERIAL PRIMARY KEY,
    financial_year VARCHAR(20) UNIQUE NOT NULL,
    last_sequence INTEGER NOT NULL DEFAULT 0
);

-- 4. Backfill existing records (set formatted_id to short UUID for unapproved, and generate for approved)
-- For unapproved bookings, we just take the first 8 chars of the UUID
UPDATE booking_requests 
SET formatted_id = UPPER(SUBSTRING(booking_id::text, 1, 8))
WHERE formatted_id IS NULL AND booking_state NOT IN ('ADMIN_APPROVED', 'READY_FOR_CHECKIN', 'CHECKED_IN', 'CHECKED_OUT', 'COMPLETED');

-- For approved bookings, we will try to approximate a format to avoid breaking existing data.
-- If category_id is missing, we use shortId. If present, we construct NITTGH/25-26/CAT-X/SEQ
DO $$
DECLARE
    r RECORD;
    cat_code VARCHAR;
    seq_str VARCHAR;
    new_id VARCHAR;
BEGIN
    FOR r IN SELECT * FROM booking_requests WHERE formatted_id IS NULL AND booking_state IN ('ADMIN_APPROVED', 'READY_FOR_CHECKIN', 'CHECKED_IN', 'CHECKED_OUT', 'COMPLETED') LOOP
        IF r.category_id IS NULL OR r.booking_seq IS NULL THEN
            UPDATE booking_requests SET formatted_id = UPPER(SUBSTRING(r.booking_id::text, 1, 8)) WHERE booking_id = r.booking_id;
        ELSE
            SELECT category_code INTO cat_code FROM category_rules WHERE category_id = r.category_id;
            -- Extract like CAT-I
            cat_code := split_part(cat_code, ' ', 1);
            
            seq_str := lpad(r.booking_seq::text, 4, '0');
            new_id := 'NITTGH/25-26/' || cat_code || '/' || seq_str;
            
            UPDATE booking_requests SET formatted_id = new_id, financial_year = '25-26' WHERE booking_id = r.booking_id;
        END IF;
    END LOOP;
END $$;

-- 5. Seed the sequence_tracker to prevent collisions
-- We'll set the sequence to the maximum booking_seq currently in the database to be safe
INSERT INTO sequence_tracker (financial_year, last_sequence)
SELECT '25-26', COALESCE(MAX(booking_seq), 0) FROM booking_requests
ON CONFLICT (financial_year) DO UPDATE 
SET last_sequence = GREATEST(sequence_tracker.last_sequence, EXCLUDED.last_sequence);
