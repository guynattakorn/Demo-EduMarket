require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const rawUrl = (process.env.SUPABASE_URL || '').trim();
// Strip trailing /rest/v1/ or / if accidentally included
const SUPABASE_URL = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
const SUPABASE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '').trim();

const isCloudConfigured = Boolean(SUPABASE_URL && SUPABASE_KEY && SUPABASE_URL.startsWith('https://'));

let supabase = null;
if (isCloudConfigured) {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log('[Database] Connecting to Supabase Cloud at:', SUPABASE_URL);
  } catch (err) {
    console.error('[Database] Supabase initialization failed, falling back to local:', err.message);
  }
} else {
  console.log('[Database] No Supabase credentials detected. Running in Local Storage Mode (data/local-db.json).');
  console.log('[Database] -> Set SUPABASE_URL and SUPABASE_ANON_KEY in .env to connect to Cloud Database.');
}

// Local Fallback Storage
const DATA_DIR = path.join(__dirname, '..', 'data');
const LOCAL_DB_PATH = path.join(DATA_DIR, 'local-db.json');

// Seed data comes from src/data/seed.js (the same Mn() the frontend uses),
// compiled to CommonJS at db/seed-data.js by `npm run build`.
function getSeedData() {
  const { Mn } = require('./seed-data');
  return Mn();
}

function getLocalState() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(LOCAL_DB_PATH)) {
    const seed = getSeedData();
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(seed, null, 2), 'utf8');
    return seed;
  }
  try {
    const raw = fs.readFileSync(LOCAL_DB_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    const seed = getSeedData();
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(seed, null, 2), 'utf8');
    return seed;
  }
}

function saveLocalState(state) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(state, null, 2), 'utf8');
}


// ---------------------------------------------------------------------------
// Table mappings: frontend state (camelCase) <-> Supabase rows (snake_case)
// `legacy` lists the columns that exist before supabase/upgrade-phase1-8.sql,
// so syncing keeps working (with fewer fields) on a database that was not upgraded yet.
// ---------------------------------------------------------------------------
const num = (v, d = 0) => (v === null || v === undefined || v === '' || Number.isNaN(Number(v)) ? d : Number(v));
const iso = (v) => v || new Date().toISOString();

/** preparation days before hand-over (old rows: preorder = 1 day) */
const leadDays = (p) => {
  const n = Number(p.leadDays);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : p.preorder ? 1 : 0;
};

const TABLES = [
  {
    key: 'classes', table: 'classes', level: 0,
    toRow: (c) => ({ id: String(c.id), name: c.name, code: c.code, teacher_id: c.teacherId || null }),
    fromRow: (c) => ({ id: c.id, name: c.name, code: c.code, teacherId: c.teacher_id }),
    legacy: ['id', 'name', 'code', 'teacher_id'],
  },
  {
    key: 'users', table: 'users', level: 1,
    toRow: (u) => ({ id: String(u.id), name: u.name, role: u.role, avatar: u.avatar || null, class_id: u.classId || null }),
    fromRow: (u) => ({ id: u.id, name: u.name, role: u.role, avatar: u.avatar, classId: u.class_id }),
    legacy: ['id', 'name', 'role', 'avatar', 'class_id'],
  },
  {
    key: 'shops', table: 'shops', level: 2,
    toRow: (s) => ({
      id: String(s.id), name: s.name, tagline: s.tagline || '', emoji: s.emoji || '🏪', color: s.color || 'lime',
      class_id: s.classId || null, members: s.members || [],
      booth_location: s.boothLocation || null, open_hours: s.openHours || null, owner_id: s.ownerId || null,
    }),
    fromRow: (s) => ({
      id: s.id, name: s.name, tagline: s.tagline, emoji: s.emoji, color: s.color, classId: s.class_id, members: s.members || [],
      boothLocation: s.booth_location ?? undefined, openHours: s.open_hours ?? undefined, ownerId: s.owner_id ?? undefined,
    }),
    legacy: ['id', 'name', 'tagline', 'emoji', 'color', 'class_id', 'members'],
  },
  {
    key: 'products', table: 'products', level: 3,
    toRow: (p) => ({
      id: String(p.id), shop_id: p.shopId, name: p.name, description: p.description || '', price: num(p.price),
      cost: p.cost === null || p.cost === undefined || p.cost === '' ? null : num(p.cost), stock: num(p.stock),
      category: p.category || '', emoji: p.emoji || '📦', color: p.color || 'lime', image: p.image || null,
      views: num(p.views), wish_base: num(p.wishBase), wished_by: p.wishedBy || [],
      // preorder is kept for older databases: true when the product needs preparation days
      preorder: leadDays(p) > 0, lead_days: leadDays(p),
      active: p.active !== false, created_at: p.createdAt || undefined,
    }),
    fromRow: (p) => ({
      id: p.id, shopId: p.shop_id, name: p.name, description: p.description, price: Number(p.price),
      cost: p.cost === null ? null : Number(p.cost), stock: p.stock, category: p.category, emoji: p.emoji, color: p.color,
      image: p.image, views: p.views, wishBase: p.wish_base, wishedBy: p.wished_by || [],
      leadDays: p.lead_days === null || p.lead_days === undefined ? (p.preorder ? 1 : 0) : Number(p.lead_days),
      createdAt: p.created_at, active: p.active !== false,
    }),
    legacy: ['id', 'shop_id', 'name', 'description', 'price', 'cost', 'stock', 'category', 'emoji', 'color', 'image', 'views', 'wish_base', 'wished_by', 'preorder', 'created_at'],
  },
  {
    key: 'promotions', table: 'promotions', level: 4,
    toRow: (p) => ({
      id: String(p.id), shop_id: p.shopId, type: p.type, title: p.title || '', product_ids: p.productIds || [],
      discount_type: p.discountType || 'amount', value: num(p.value), min_spend: num(p.minSpend), code: p.code || null,
      max_uses: num(p.maxUses), used_count: num(p.usedCount), expires_at: p.expiresAt || null, active: p.active !== false,
      deleted: Boolean(p.deleted), created_by: p.createdBy || null, created_at: iso(p.createdAt),
    }),
    fromRow: (p) => ({
      id: p.id, shopId: p.shop_id, type: p.type, title: p.title, productIds: p.product_ids || [], discountType: p.discount_type,
      value: Number(p.value), minSpend: Number(p.min_spend || 0), code: p.code, maxUses: p.max_uses || 0, usedCount: p.used_count || 0,
      expiresAt: p.expires_at, active: p.active !== false, deleted: Boolean(p.deleted), createdBy: p.created_by, createdAt: p.created_at,
    }),
  },
  {
    key: 'orders', table: 'orders', level: 4, order: ['created_at', false],
    toRow: (o) => ({
      id: String(o.id), buyer_id: o.buyer || null, shop_id: o.shopId, items: o.items || [], status: o.status || 'awaiting',
      pickup: o.pickup || '', time: o.time || '', is_demo: Boolean(o.demo), created_at: iso(o.date),
      pickup_type: o.pickupType || 'meetup', subtotal: num(o.subtotal), discount_amount: num(o.discountAmount), total: num(o.total),
      promo_code: o.promoCode || null, voucher_id: o.voucherId || null, history: o.history || [], updated_at: o.updatedAt || null,
      lead_days: num(o.leadDays), ready_by: o.readyBy || null,
    }),
    fromRow: (o) => ({
      id: o.id, buyer: o.buyer_id, shopId: o.shop_id, items: o.items || [], status: o.status, pickup: o.pickup, time: o.time,
      date: o.created_at, demo: Boolean(o.is_demo), pickupType: o.pickup_type || 'meetup',
      subtotal: o.subtotal === null || o.subtotal === undefined ? undefined : Number(o.subtotal),
      discountAmount: Number(o.discount_amount || 0),
      leadDays: Number(o.lead_days || 0) || undefined, readyBy: o.ready_by || undefined,
      total: o.total === null || o.total === undefined ? undefined : Number(o.total),
      promoCode: o.promo_code || null, voucherId: o.voucher_id || null, history: o.history || [], updatedAt: o.updated_at || undefined,
    }),
    legacy: ['id', 'buyer_id', 'shop_id', 'items', 'status', 'pickup', 'time', 'is_demo', 'created_at'],
  },
  {
    key: 'chatAppointments', table: 'chat_appointments', level: 4,
    toRow: (a) => ({
      id: String(a.id || a.threadKey), thread_key: a.threadKey, shop_id: a.shopId, buyer_id: a.buyerId, location: a.location,
      time: a.time, proposed_by: a.proposedBy, confirmed: Boolean(a.confirmed), confirmed_by: a.confirmedBy || null, updated_at: iso(a.updatedAt),
    }),
    fromRow: (a) => ({
      id: a.id, threadKey: a.thread_key, shopId: a.shop_id, buyerId: a.buyer_id, location: a.location, time: a.time,
      proposedBy: a.proposed_by, confirmed: Boolean(a.confirmed), confirmedBy: a.confirmed_by, updatedAt: a.updated_at,
    }),
    conflict: 'thread_key',
  },
  {
    key: 'reviews', table: 'reviews', level: 5, order: ['created_at', false],
    toRow: (r) => ({ id: String(r.id), product_id: r.productId, user_id: r.userId || null, rating: num(r.rating, 5), text: r.text || '', created_at: iso(r.date) }),
    fromRow: (r) => ({ id: r.id, productId: r.product_id, userId: r.user_id, rating: r.rating, text: r.text, date: r.created_at }),
    legacy: ['id', 'product_id', 'user_id', 'rating', 'text', 'created_at'],
  },
  {
    key: 'notifications', table: 'notifications', level: 5, order: ['created_at', false],
    toRow: (n) => ({
      id: String(n.id), user_id: n.to, title: n.title, text: n.text || '', type: n.type || 'info', is_read: Boolean(n.read), created_at: iso(n.date),
      target_type: n.targetType || null, target_id: n.targetId || null, shop_id: n.shopId || null, buyer_id: n.buyerId || null,
      thread_key: n.threadKey || null, peer_id: n.peerId || null,
    }),
    fromRow: (n) => {
      const out = { id: n.id, to: n.user_id, title: n.title, text: n.text, type: n.type, read: Boolean(n.is_read), date: n.created_at };
      for (const [k, col] of [['targetType', 'target_type'], ['targetId', 'target_id'], ['shopId', 'shop_id'], ['buyerId', 'buyer_id'], ['threadKey', 'thread_key'], ['peerId', 'peer_id']])
        if (n[col]) out[k] = n[col];
      return out;
    },
    legacy: ['id', 'user_id', 'title', 'text', 'type', 'is_read', 'created_at'],
  },
  {
    key: 'messages', table: 'messages', level: 5, order: ['created_at', true],
    toRow: (m) => ({
      id: String(m.id), from_user_id: m.from, to_user_id: m.to || null, text: m.text || '', created_at: iso(m.date),
      thread_key: m.threadKey || null, shop_id: m.shopId || null, buyer_id: m.buyerId || null, sender_name: m.senderName || null,
      image_url: m.imageUrl || null, context_product_id: m.contextProductId || null, context_order_id: m.contextOrderId || null, kind: m.kind || 'text',
    }),
    fromRow: (m) => {
      const out = { id: m.id, from: m.from_user_id, to: m.to_user_id, text: m.text, date: m.created_at };
      for (const [k, col] of [['threadKey', 'thread_key'], ['shopId', 'shop_id'], ['buyerId', 'buyer_id'], ['senderName', 'sender_name'], ['imageUrl', 'image_url'], ['contextProductId', 'context_product_id'], ['contextOrderId', 'context_order_id'], ['kind', 'kind']])
        if (m[col]) out[k] = m[col];
      return out;
    },
    legacy: ['id', 'from_user_id', 'to_user_id', 'text', 'created_at'],
  },
  {
    key: 'assignments', table: 'assignments', level: 5,
    toRow: (a) => ({ id: String(a.id), class_id: a.classId || null, teacher_id: a.teacherId || null, title: a.title, body: a.body || '', due: a.due || null, attachments: a.attachments || [] }),
    fromRow: (a) => ({ id: a.id, classId: a.class_id, teacherId: a.teacher_id, title: a.title, body: a.body, due: a.due, attachments: a.attachments || [] }),
    legacy: ['id', 'class_id', 'teacher_id', 'title', 'body', 'due'],
  },
  {
    key: 'contents', table: 'contents', level: 5,
    toRow: (c) => ({
      id: String(c.id), class_id: c.classId || null, title: c.title, category: c.category || '', body: c.body || '',
      attachments: c.attachments || [], teacher_id: c.teacherId || null,
      // Large legacy data-URL files are not copied to the cloud (they live in the browser only).
      file: c.file && !String(c.file.data || '').startsWith('data:') ? c.file : null,
    }),
    fromRow: (c) => ({ id: c.id, classId: c.class_id, title: c.title, category: c.category, body: c.body, attachments: c.attachments || [], teacherId: c.teacher_id, file: c.file || undefined }),
    legacy: ['id', 'class_id', 'title', 'category', 'body'],
  },
  {
    key: 'announcements', table: 'announcements', level: 5, order: ['created_at', false],
    toRow: (a) => ({ id: String(a.id), class_id: a.classId || null, teacher_id: a.teacherId || null, title: a.title, text: a.text || '', created_at: iso(a.date) }),
    fromRow: (a) => ({ id: a.id, classId: a.class_id, teacherId: a.teacher_id, title: a.title, text: a.text, date: a.created_at }),
  },
  {
    key: 'submissions', table: 'submissions', level: 6,
    toRow: (x) => ({ id: String(x.id), assignment_id: x.assignmentId, student_id: x.userId, body: x.text || '', grade: x.score === undefined || x.score === null ? null : String(x.score), feedback: x.feedback || null, created_at: iso(x.date) }),
    fromRow: (x) => {
      const out = { id: x.id, assignmentId: x.assignment_id, userId: x.student_id, text: x.body, date: x.created_at };
      if (x.grade !== null && x.grade !== undefined && x.grade !== '') out.score = Number(x.grade);
      if (x.feedback) out.feedback = x.feedback;
      return out;
    },
    legacy: ['id', 'assignment_id', 'student_id', 'body', 'grade', 'feedback', 'created_at'],
  },
  {
    key: 'feedback', table: 'shop_feedback', level: 5, order: ['created_at', false],
    toRow: (f) => ({ id: String(f.id), shop_id: f.shopId, teacher_id: f.teacherId || null, score: num(f.score), text: f.text || '', created_at: iso(f.date) }),
    fromRow: (f) => ({ id: f.id, shopId: f.shop_id, teacherId: f.teacher_id, score: f.score, text: f.text, date: f.created_at }),
  },
  {
    key: 'logs', table: 'logs', level: 5,
    toRow: (l) => ({ id: String(l.id), shop_id: l.shopId, product_id: l.productId || null, type: l.type, before_val: num(l.before), after_val: num(l.after), reason: l.reason || '', actor: l.actor || null, created_at: iso(l.date) }),
    fromRow: (l) => ({ id: l.id, shopId: l.shop_id, productId: l.product_id, type: l.type, before: Number(l.before_val), after: Number(l.after_val), reason: l.reason, actor: l.actor, date: l.created_at }),
    legacy: ['id', 'shop_id', 'product_id', 'type', 'before_val', 'after_val', 'reason', 'actor', 'created_at'],
  },
];

const isMissingTable = (error) =>
  error && (error.code === '42P01' || error.code === 'PGRST205' || /does not exist|could not find the table/i.test(error.message || ''));
const isMissingColumn = (error) =>
  error && (error.code === '42703' || error.code === 'PGRST204' || /column .* (does not exist|of .* not found)|could not find the .* column/i.test(error.message || ''));
const warned = new Set();
const warnOnce = (key, msg) => {
  if (warned.has(key)) return;
  warned.add(key);
  console.warn(msg);
};

/**
 * Fetch full state from Supabase or Local Storage
 */
async function getState() {
  if (!supabase) {
    return getLocalState();
  }

  try {
    const results = await Promise.all([
      ...TABLES.map((t) => {
        let q = supabase.from(t.table).select('*');
        if (t.order) q = q.order(t.order[0], { ascending: t.order[1] });
        return q;
      }),
      supabase.from('student_progress').select('*'),
    ]);
    const byKey = {};
    TABLES.forEach((t, i) => (byKey[t.key] = results[i]));
    const progressRes = results[TABLES.length];

    const critical = ['users', 'products', 'orders'].map((k) => byKey[k].error).find(Boolean);
    if (critical) {
      console.warn('[Supabase] Warning fetching tables, falling back to local:', critical);
      return getLocalState();
    }

    const state = { schema: 2, progress: {} };
    for (const t of TABLES) {
      const { data, error } = byKey[t.key];
      if (error) {
        if (isMissingTable(error)) warnOnce('read:' + t.table, `[Supabase] Table "${t.table}" not found — run supabase/upgrade-phase1-8.sql`);
        else console.warn(`[Supabase] Could not read ${t.table}:`, error.message);
      }
      state[t.key] = (data || []).map(t.fromRow);
    }
    (progressRes.data || []).forEach((row) => {
      state.progress[row.student_id] = row.modules || [];
    });
    return state;
  } catch (err) {
    console.error('[Supabase] Error loading from cloud:', err.message);
    return getLocalState();
  }
}

async function upsertTable(def, items) {
  if (!Array.isArray(items) || items.length === 0) return;
  const rows = items.map(def.toRow);
  const conflict = def.conflict || 'id';
  let { error } = await supabase.from(def.table).upsert(rows, { onConflict: conflict });
  if (error && isMissingColumn(error) && def.legacy) {
    warnOnce('cols:' + def.table, `[Supabase] "${def.table}" is missing new columns — syncing basic fields only. Run supabase/upgrade-phase1-8.sql`);
    const legacyRows = rows.map((r) => Object.fromEntries(def.legacy.map((c) => [c, r[c]])));
    ({ error } = await supabase.from(def.table).upsert(legacyRows, { onConflict: 'id' }));
  }
  if (error) {
    if (isMissingTable(error)) warnOnce('write:' + def.table, `[Supabase] Table "${def.table}" not found — run supabase/upgrade-phase1-8.sql`);
    else console.error(`[Supabase Sync Error] ${def.table}:`, error.message);
  }
}

/**
 * Handle a single action (POST /api/action). The browser normally uses /api/sync (full state);
 * this path saves the full state locally and mirrors it to the cloud the same way.
 */
async function syncAction(action, currentState) {
  if (!currentState) return { success: false, error: 'currentState is required' };
  const result = await syncFullState(currentState);
  return { success: !result.error, ...result };
}

/**
 * Sync entire state to Supabase Cloud and the local cache.
 * Tables are written in foreign-key order (classes -> users -> shops -> products -> orders -> …).
 */
async function syncFullState(state) {
  // Always update local cache
  saveLocalState(state);

  if (!supabase) {
    return { mode: 'local' };
  }

  try {
    const levels = [...new Set(TABLES.map((t) => t.level))].sort((a, b) => a - b);
    for (const level of levels) {
      await Promise.all(TABLES.filter((t) => t.level === level).map((t) => upsertTable(t, state[t.key])));
    }

    if (state.progress && typeof state.progress === 'object') {
      const progressRows = Object.entries(state.progress).map(([student_id, modules]) => ({
        student_id,
        modules: modules || [],
        updated_at: new Date().toISOString(),
      }));
      if (progressRows.length > 0) {
        const { error } = await supabase.from('student_progress').upsert(progressRows, { onConflict: 'student_id' });
        if (error) console.error('[Supabase Sync Error] Progress:', error.message);
      }
    }
    return { mode: 'cloud', synced: true };
  } catch (err) {
    console.error('[Supabase Full Sync Exception]:', err.message);
    return { mode: 'cloud', error: err.message };
  }
}

module.exports = {
  supabase,
  sb: supabase,
  isCloudConfigured,
  getState,
  syncAction,
  syncFullState,
  saveLocalState,
  getLocalState,
};

