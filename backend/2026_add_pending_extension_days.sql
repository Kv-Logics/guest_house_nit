-- Pending stay extension: dates apply only after full approval (or instant admin apply).
ALTER TABLE booking_requests
    ADD COLUMN IF NOT EXISTS pending_extension_days INTEGER NULL
        CHECK (pending_extension_days IS NULL OR pending_extension_days > 0);
