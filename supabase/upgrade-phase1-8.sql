-- ==========================================================================
-- EduMarket — schema upgrade for Phase 1–8 (idempotent: safe to run many times)
-- Run in Supabase SQL Editor after schema.sql (it is also appended to schema.sql).
-- ==========================================================================

-- Phase 2/5: shop booth, opening hours and owner
ALTER TABLE shops ADD COLUMN IF NOT EXISTS booth_location TEXT;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS open_hours TEXT;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS owner_id TEXT;

-- Phase 5: open / close a product for sale
ALTER TABLE products ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE;

-- Phase 2/3/6: in-school pickup, 4-step status lifecycle, discounts
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('awaiting', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'));
ALTER TABLE orders ADD COLUMN IF NOT EXISTS pickup_type TEXT DEFAULT 'meetup';
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_pickup_type_check;
ALTER TABLE orders ADD CONSTRAINT orders_pickup_type_check CHECK (pickup_type IN ('booth', 'meetup'));
ALTER TABLE orders ADD COLUMN IF NOT EXISTS subtotal NUMERIC(10,2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS total NUMERIC(10,2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS promo_code TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS voucher_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS history JSONB DEFAULT '[]'::jsonb;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- Phase 3: notification deep links
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS target_type TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS target_id TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS shop_id TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS buyer_id TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS thread_key TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS peer_id TEXT;

-- Phase 4: shop chat rooms (shop_id + buyer_id), images, pinned context
ALTER TABLE messages ALTER COLUMN text DROP NOT NULL;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS thread_key TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS shop_id TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS buyer_id TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS sender_name TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS context_product_id TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS context_order_id TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS kind TEXT DEFAULT 'text';
CREATE INDEX IF NOT EXISTS idx_messages_thread_key ON messages(thread_key);

CREATE TABLE IF NOT EXISTS chat_appointments (
  id TEXT PRIMARY KEY,
  thread_key TEXT NOT NULL UNIQUE,
  shop_id TEXT REFERENCES shops(id) ON DELETE CASCADE,
  buyer_id TEXT,
  location TEXT,
  time TEXT,
  proposed_by TEXT,
  confirmed BOOLEAN DEFAULT FALSE,
  confirmed_by TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Phase 6: shop promotions (product discount / min-spend voucher / promo code)
CREATE TABLE IF NOT EXISTS promotions (
  id TEXT PRIMARY KEY,
  shop_id TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('discount', 'voucher', 'code')),
  title TEXT,
  product_ids JSONB DEFAULT '[]'::jsonb,
  discount_type TEXT NOT NULL DEFAULT 'amount' CHECK (discount_type IN ('percent', 'amount')),
  value NUMERIC(10,2) NOT NULL DEFAULT 0,
  min_spend NUMERIC(10,2) DEFAULT 0,
  code TEXT,
  max_uses INTEGER DEFAULT 0,
  used_count INTEGER DEFAULT 0,
  expires_at TEXT,
  active BOOLEAN DEFAULT TRUE,
  deleted BOOLEAN DEFAULT FALSE,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_promotions_shop_id ON promotions(shop_id);

-- Phase 7: teacher media (PDF / Canva) and class announcements
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;
ALTER TABLE contents ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;
ALTER TABLE contents ADD COLUMN IF NOT EXISTS teacher_id TEXT;
ALTER TABLE contents ADD COLUMN IF NOT EXISTS file JSONB;

CREATE TABLE IF NOT EXISTS announcements (
  id TEXT PRIMARY KEY,
  class_id TEXT REFERENCES classes(id) ON DELETE CASCADE,
  teacher_id TEXT,
  title TEXT NOT NULL,
  text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Teacher feedback to shops (was only kept in the browser before)
CREATE TABLE IF NOT EXISTS shop_feedback (
  id TEXT PRIMARY KEY,
  shop_id TEXT REFERENCES shops(id) ON DELETE CASCADE,
  teacher_id TEXT,
  score INTEGER,
  text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prototype RLS (same open policy pattern as the rest of schema.sql — tighten before real rollout)
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['chat_appointments', 'promotions', 'announcements', 'shop_feedback'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "Public read on %s" ON %I', t, t);
    EXECUTE format('CREATE POLICY "Public read on %s" ON %I FOR SELECT USING (true)', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "Public insert on %s" ON %I', t, t);
    EXECUTE format('CREATE POLICY "Public insert on %s" ON %I FOR INSERT WITH CHECK (true)', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "Public update on %s" ON %I', t, t);
    EXECUTE format('CREATE POLICY "Public update on %s" ON %I FOR UPDATE USING (true)', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "Public delete on %s" ON %I', t, t);
    EXECUTE format('CREATE POLICY "Public delete on %s" ON %I FOR DELETE USING (true)', t, t);
  END LOOP;
END $$;

-- Phase 0/4/5/7: Storage bucket for /api/upload (chat images, product photos, teacher PDFs)
INSERT INTO storage.buckets (id, name, public) VALUES ('uploads', 'uploads', true) ON CONFLICT (id) DO NOTHING;
DROP POLICY IF EXISTS "Public read uploads" ON storage.objects;
CREATE POLICY "Public read uploads" ON storage.objects FOR SELECT USING (bucket_id = 'uploads');
DROP POLICY IF EXISTS "Public insert uploads" ON storage.objects;
CREATE POLICY "Public insert uploads" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'uploads');

-- Seed values for the demo shops
UPDATE shops SET booth_location = COALESCE(booth_location, 'บูธ A1 ลานอเนกประสงค์'), open_hours = COALESCE(open_hours, 'พักเที่ยง 12:00–13:00 น.'), owner_id = COALESCE(owner_id, 'student1') WHERE id = 's1';
UPDATE shops SET booth_location = COALESCE(booth_location, 'บูธ B2 หน้าโรงอาหาร'), open_hours = COALESCE(open_hours, 'พักเช้า 10:30–11:00 น.'), owner_id = COALESCE(owner_id, 'student3') WHERE id = 's2';
UPDATE shops SET booth_location = COALESCE(booth_location, 'บูธ C3 ใต้ตึกเรียน 3'), open_hours = COALESCE(open_hours, 'หลังเลิกเรียน 16:00–16:30 น.'), owner_id = COALESCE(owner_id, 'student4') WHERE id = 's3';
UPDATE products SET active = TRUE WHERE active IS NULL;

-- ------------------------------------------------------------------
-- Delivery lead time (replaces "pre-order"): products.lead_days, orders.ready_by
-- ------------------------------------------------------------------
ALTER TABLE products ADD COLUMN IF NOT EXISTS lead_days INTEGER DEFAULT 0;
UPDATE products SET lead_days = 1 WHERE preorder = TRUE AND COALESCE(lead_days, 0) = 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS lead_days INTEGER DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS ready_by TIMESTAMPTZ;
