// tests/global-setup.ts - Global test setup for database initialization
// This is a no-op setup since each test file will handle its own database initialization
export default function globalSetup() {
  console.log("🔧 Test global setup: Using unique databases per test file");
}
