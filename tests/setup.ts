// tests/setup.ts - Ensure correct DATABASE_URL for tests
import { config } from "dotenv"
import path from "node:path"

// Load environment variables from project root
config({ path: path.resolve(__dirname, "../.env") })

// Override DATABASE_URL to use absolute path for tests
process.env.DATABASE_URL = `file:${path.resolve(__dirname, "../prisma/data/data.db")}`

console.log("Test setup: DATABASE_URL =", process.env.DATABASE_URL)
