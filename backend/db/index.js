import pg from "pg";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import { fileURLToPath } from "url";
import { seedSampleDocuments } from "./seedSampleDocs.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pg;

const poolConfig = {
  connectionString: process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/pharma_bmr_bpr",
  connectionTimeoutMillis: 3000,
};

export const pool = new Pool(poolConfig);

export async function query(text, params) {
  return pool.query(text, params);
}

let useFallbackStore = false;

const fallbackDbFile = path.join(__dirname, "fallback_store.json");
let fallbackStore = {
  users: [],
  documents: [],
  document_assignments: [],
  print_logs: [],
  reprint_requests: [],
  notifications: [],
  audit_logs: [],
  requisitions: [],
};

function saveFallbackStore() {
  try {
    fs.writeFileSync(fallbackDbFile, JSON.stringify(fallbackStore, null, 2));
  } catch (err) {
    console.error("Failed to save fallback store:", err.message);
  }
}

function loadFallbackStore() {
  try {
    if (fs.existsSync(fallbackDbFile)) {
      const data = fs.readFileSync(fallbackDbFile, "utf-8");
      fallbackStore = JSON.parse(data);
    }
  } catch (err) {
    console.error("Failed to load fallback store:", err.message);
  }
}

async function seedDefaultUsers() {
  const hashedPassword = await bcrypt.hash("admin123", 10);
  const prodPassword = await bcrypt.hash("prod123", 10);

  const defaultUsers = [
    {
      id: 1,
      username: "qa_admin",
      email: "qa@pharmaco.com",
      password_hash: hashedPassword,
      role: "QA_ADMIN",
      full_name: "Dr. Rajesh Sharma (QA Lead)",
      department: "Quality Assurance",
      created_at: new Date().toISOString()
    },
    {
      id: 2,
      username: "production_op",
      email: "prod@pharmaco.com",
      password_hash: prodPassword,
      role: "PRODUCTION",
      full_name: "Amit Verma (Plant Officer)",
      department: "Production Division 1",
      created_at: new Date().toISOString()
    }
  ];

  if (!useFallbackStore) {
    for (const u of defaultUsers) {
      await pool.query(
        `INSERT INTO users (id, username, email, password_hash, role, full_name, department)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name`,
        [u.id, u.username, u.email, u.password_hash, u.role, u.full_name, u.department]
      );
    }
  } else {
    for (const u of defaultUsers) {
      const existingIdx = fallbackStore.users.findIndex(x => x.username === u.username);
      if (existingIdx === -1) {
        fallbackStore.users.push(u);
      }
    }
    saveFallbackStore();
  }
}

export async function initDB() {
  loadFallbackStore();
  try {
    const client = await pool.connect();
    console.log("🐘 Connected to PostgreSQL database successfully.");
    const schemaSqlPath = path.join(__dirname, "schema.sql");
    if (fs.existsSync(schemaSqlPath)) {
      const schemaSql = fs.readFileSync(schemaSqlPath, "utf-8");
      await client.query(schemaSql);
      console.log("✅ PostgreSQL schema initialized.");
    }
    client.release();
    useFallbackStore = false;
  } catch (err) {
    console.warn("⚠️ PostgreSQL connection unavailable:", err.message);
    console.warn("🔄 Switching to high-performance local store fallback mode.");
    useFallbackStore = true;
  }

  await seedDefaultUsers();
  await seedSampleDocuments();
}

export function isFallback() {
  return useFallbackStore;
}

export function getFallbackStore() {
  return fallbackStore;
}

export { saveFallbackStore };
