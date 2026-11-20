/**
 * File uploads (chat images, product photos, teacher PDFs).
 *
 * Files are always written to data/uploads/ and served by server.js at /uploads/<name>.
 * When Supabase Cloud is configured, a copy is also pushed to the Storage bucket "uploads"
 * (best effort — a missing bucket or network error never fails the upload).
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const UPLOAD_DIR = path.join(__dirname, '..', 'data', 'uploads');
const STORAGE_BUCKET = 'uploads';
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // decoded file size
// JSON body limit for /api/upload: base64 is ~4/3 of the file size, plus field names.
const MAX_UPLOAD_BODY_BYTES = Math.ceil(MAX_UPLOAD_BYTES * 4 / 3) + 64 * 1024;
const CLOUD_TIMEOUT_MS = 8000;

const ALLOWED_TYPES = {
  'image/jpeg': {
    ext: '.jpg',
    exts: ['.jpg', '.jpeg'],
    matches: (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  'image/png': {
    ext: '.png',
    exts: ['.png'],
    matches: (b) => b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
  'image/webp': {
    ext: '.webp',
    exts: ['.webp'],
    matches: (b) => b.length > 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP',
  },
  'application/pdf': {
    ext: '.pdf',
    exts: ['.pdf'],
    matches: (b) => b.length > 5 && b.toString('ascii', 0, 5) === '%PDF-',
  },
};

class UploadError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

function ensureUploadDir() {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

/** Original file name, kept only for display (never used as a path). */
function displayName(filename) {
  if (typeof filename !== 'string') return '';
  return path.basename(filename.replace(/\\/g, '/')).replace(/[\u0000-\u001f<>:"|?*]/g, '').slice(0, 120);
}

/**
 * Accepts { filename, mimeType, dataUrl } or { filename, mimeType, base64 }.
 * Returns { buffer, mimeType, ext, name } or throws UploadError.
 */
function decodeUpload(body) {
  const { filename, mimeType, dataUrl, base64 } = body || {};
  let mime = typeof mimeType === 'string' ? mimeType.trim().toLowerCase() : '';
  let b64 = typeof base64 === 'string' ? base64 : '';

  if (typeof dataUrl === 'string' && dataUrl) {
    const comma = dataUrl.indexOf(',');
    const meta = comma > 0 ? dataUrl.slice(0, comma) : '';
    if (!meta.startsWith('data:') || !meta.endsWith(';base64')) {
      throw new UploadError(400, 'dataUrl ต้องอยู่ในรูปแบบ data:<mimeType>;base64,...');
    }
    const urlMime = meta.slice(5).split(';')[0].trim().toLowerCase();
    if (mime && urlMime && mime !== urlMime) {
      throw new UploadError(400, 'mimeType ไม่ตรงกับชนิดไฟล์ใน dataUrl');
    }
    mime = mime || urlMime;
    b64 = dataUrl.slice(comma + 1);
  }

  if (!b64) throw new UploadError(400, 'กรุณาส่งไฟล์มาใน dataUrl หรือ base64');

  const rule = ALLOWED_TYPES[mime];
  if (!rule) throw new UploadError(415, 'รองรับเฉพาะไฟล์ JPG, PNG, WEBP และ PDF');

  const ext = path.extname(typeof filename === 'string' ? filename : '').toLowerCase();
  if (ext && !rule.exts.includes(ext)) {
    throw new UploadError(415, `นามสกุลไฟล์ ${ext} ไม่ตรงกับชนิดไฟล์ ${mime}`);
  }

  b64 = b64.replace(/\s+/g, '');
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(b64)) throw new UploadError(400, 'ข้อมูล base64 ไม่ถูกต้อง');
  if (Math.floor((b64.length * 3) / 4) > MAX_UPLOAD_BYTES + 2) {
    throw new UploadError(413, 'ไฟล์ต้องมีขนาดไม่เกิน 10 MB');
  }

  const buffer = Buffer.from(b64, 'base64');
  if (!buffer.length) throw new UploadError(400, 'ไฟล์ว่างเปล่า');
  if (buffer.length > MAX_UPLOAD_BYTES) throw new UploadError(413, 'ไฟล์ต้องมีขนาดไม่เกิน 10 MB');
  if (!rule.matches(buffer)) throw new UploadError(415, 'เนื้อหาไฟล์ไม่ตรงกับชนิดไฟล์ที่ระบุ');

  return { buffer, mimeType: mime, ext: rule.ext, name: displayName(filename) };
}

function withTimeout(promise, ms) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`timeout after ${ms} ms`)), ms);
    }),
  ]).finally(() => clearTimeout(timer));
}

async function copyToCloud(supabase, fileName, file) {
  if (!supabase || !supabase.storage) return null;
  try {
    const bucket = supabase.storage.from(STORAGE_BUCKET);
    const { error } = await withTimeout(
      bucket.upload(fileName, file.buffer, { contentType: file.mimeType, upsert: false }),
      CLOUD_TIMEOUT_MS
    );
    if (error) throw error;
    return bucket.getPublicUrl(fileName).data?.publicUrl || null;
  } catch (err) {
    console.warn(`[Upload] Supabase Storage bucket "${STORAGE_BUCKET}" unavailable, kept local copy only:`, err.message);
    return null;
  }
}

/** Validate, store under data/uploads/, optionally copy to Supabase Storage. */
async function saveUpload(body, supabase) {
  const file = decodeUpload(body);
  ensureUploadDir();
  const fileName = `${Date.now().toString(36)}-${crypto.randomBytes(8).toString('hex')}${file.ext}`;
  await fs.promises.writeFile(path.join(UPLOAD_DIR, fileName), file.buffer, { flag: 'wx' });
  const cloudUrl = await copyToCloud(supabase, fileName, file);
  return {
    ok: true,
    url: `/uploads/${fileName}`,
    name: file.name || fileName,
    mimeType: file.mimeType,
    size: file.buffer.length,
    storage: cloudUrl ? 'local+supabase' : 'local',
    ...(cloudUrl ? { cloudUrl } : {}),
  };
}

/** Map "/uploads/<name>" to a file inside data/uploads/, or null if the name is not acceptable. */
function resolveUploadPath(urlPath) {
  let name;
  try {
    name = decodeURIComponent(urlPath.slice('/uploads/'.length));
  } catch (e) {
    return null;
  }
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(name)) return null;
  return { name, filePath: path.join(UPLOAD_DIR, name) };
}

/** Public Supabase URL for a stored upload (used when the local copy is gone, e.g. after a redeploy). */
function cloudUrlFor(supabase, name) {
  if (!supabase || !supabase.storage) return null;
  try {
    return supabase.storage.from(STORAGE_BUCKET).getPublicUrl(name).data?.publicUrl || null;
  } catch (e) {
    return null;
  }
}

module.exports = {
  UPLOAD_DIR,
  MAX_UPLOAD_BYTES,
  MAX_UPLOAD_BODY_BYTES,
  UploadError,
  ensureUploadDir,
  decodeUpload,
  saveUpload,
  resolveUploadPath,
  cloudUrlFor,
};
