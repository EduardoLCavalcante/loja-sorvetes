/**
 * Seeds Supabase Storage and images table with files from public/images.
 *
 * Requirements (env):
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 *
 * Steps:
 * 1) Creates public bucket "products" if not exists
 * 2) Uploads public/images/* to storage at "images/<file_name>" (upsert)
 * 3) Upserts rows in public.images with public_url and inferred categories
 *
 * Run order:
 *  - First run scripts/sql/001_init.sql (DB migration)
 *  - Then run this script
 */

import fs from "fs"
import path from "path"
import crypto from "crypto"
import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.")
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

const BUCKET = "products"
const LOCAL_DIR = path.resolve("public", "images")

const MIME_BY_EXT = {
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
}

function inferCategories(file) {
  const f = file.toLowerCase()
  const cats = new Set()

  if (f.includes("combo")) cats.add("Combos")
  if (f.includes("kit")) cats.add("Kits")
  if (f.includes("cone-show") || f.includes("coneshow")) cats.add("ConeShow")
  if (f.includes("copao")) cats.add("Copao")
  if (f.includes("copinho")) cats.add("Copinho")
  if (f.includes("light")) cats.add("Light")
  if (f.includes("sundae")) cats.add("Sundae")
  if (f.includes("premium")) cats.add("Premium")
  if (f.includes("acai") || f.includes("açai")) cats.add("Açai")
  if (f.includes("picole") || f.includes("picolé")) cats.add("Picole")
  if (f.includes("-2l") || f.endsWith("2l.webp") || f.includes("2l")) cats.add("Pote 2L")

  return Array.from(cats)
}

function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex")
}

async function ensureBucket() {
  // Check if bucket exists
  const { data: buckets, error: listErr } = await supabase.storage.listBuckets()
  if (listErr) {
    console.warn("Could not list buckets:", listErr.message)
  }
  const exists = buckets?.some((b) => b.name === BUCKET)
  if (!exists) {
    const { error: createErr } = await supabase.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: "50MB",
    })
    if (createErr) {
      // Might already exist; continue if so
      console.warn("Create bucket warning:", createErr.message)
    } else {
      console.log(`Created bucket: ${BUCKET}`)
    }
  } else {
    console.log(`Bucket '${BUCKET}' ready.`)
  }
}

async function uploadFile(filePath, key) {
  const ext = path.extname(key)
  const mime = MIME_BY_EXT[ext] || "application/octet-stream"
  const buffer = fs.readFileSync(filePath)

  const { error: upErr } = await supabase.storage.from(BUCKET).upload(key, buffer, {
    contentType: mime,
    upsert: true,
  })
  if (upErr && !upErr.message?.toLowerCase().includes("duplicate")) {
    console.warn(`Upload warning for ${key}:`, upErr.message)
  }

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(key)
  const publicUrl = pub?.publicUrl || null
  return { publicUrl, checksum: sha256(buffer) }
}

async function upsertImageRow(row) {
  const { error } = await supabase.from("images").upsert([row], { onConflict: "file_name" })
  if (error) {
    console.error(`Upsert error for ${row.file_name}:`, error.message)
  }
}

async function main() {
  console.log("Starting seed to Supabase Storage and images table...")

  await ensureBucket()

  if (!fs.existsSync(LOCAL_DIR)) {
    console.error(`Directory ${LOCAL_DIR} not found.`)
    process.exit(1)
  }

  const files = fs
    .readdirSync(LOCAL_DIR, { withFileTypes: true })
    .filter((d) => d.isFile())
    .map((d) => d.name)
    .filter((name) => Object.keys(MIME_BY_EXT).includes(path.extname(name).toLowerCase()))

  console.log(`Found ${files.length} image(s). Uploading...`)

  for (const file of files) {
    const localPath = path.join(LOCAL_DIR, file)
    const storageKey = `images/${file}`
    const categories = inferCategories(file)

    try {
      const { publicUrl, checksum } = await uploadFile(localPath, storageKey)
      if (publicUrl) {
        await upsertImageRow({
          file_name: file,
          path: storageKey,
          public_url: publicUrl,
          categories,
          checksum,
        })
        console.log(`Upserted ${file} -> ${publicUrl} [${categories.join(", ") || "sem categoria"}]`)
      } else {
        console.warn(`No public URL returned for ${file}`)
      }
    } catch (e) {
      console.error(`Error processing ${file}:`, e?.message || e)
    }
  }

  console.log("Seed finished.")
}

main().catch((e) => {
  console.error("Unexpected error:", e)
  process.exit(1)
})
