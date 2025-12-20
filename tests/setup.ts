// tests/setup.ts - Ensure correct DATABASE_URL for tests
import { config } from "dotenv";
import path from "node:path";
import fs from "fs";

// Load environment variables from project root
config({ path: path.resolve(__dirname, "../.env") });

// Clean up old test databases (older than 1 hour)
const dataDir = path.resolve(__dirname, "../prisma/data");
if (fs.existsSync(dataDir)) {
  const files = fs.readdirSync(dataDir);
  const oneHourAgo = Date.now() - 60 * 60 * 1000;

  files.forEach((file) => {
    if (file.startsWith("test-") && file.endsWith(".db")) {
      const filePath = path.join(dataDir, file);
      try {
        const stats = fs.statSync(filePath);
        if (stats.mtime.getTime() < oneHourAgo) {
          fs.unlinkSync(filePath);
          console.log(`🧹 Cleaned up old test database: ${file}`);
        }
      } catch {
        // Ignore errors when cleaning up
      }
    }
  });
}

// Use a unique test database with timestamp + milliseconds for concurrent test runs
const now = new Date();
const timestamp =
  now.toISOString().replace(/[:-]/g, "").replace(/\..+/, "") +
  "-" +
  now.getMilliseconds().toString().padStart(3, "0");
const testDbName = `test-${timestamp}.db`;
const testDbPath = path.resolve(__dirname, `../prisma/data/${testDbName}`);

process.env.DATABASE_URL = `file:${testDbPath}`;
process.env.TEST_DB_PATH = testDbPath;
process.env.TEST_DB_NAME = testDbName;

// Ensure the database directory exists
const dbDir = path.dirname(testDbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Copy the main database as a starting point for the test database
const mainDbPath = path.resolve(__dirname, "../prisma/data/data.db");
if (fs.existsSync(mainDbPath)) {
  try {
    fs.copyFileSync(mainDbPath, testDbPath);
    console.log("✅ Test database initialized from main database");
  } catch {
    console.log(
      "⚠️  Could not copy main database, test will create fresh database"
    );
  }
}

console.log("Test setup: DATABASE_URL =", process.env.DATABASE_URL);
console.log("Test setup: Test DB name =", testDbName);
