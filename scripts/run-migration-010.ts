import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { join, resolve } from 'path';
import { createPostgresPool } from '../db/postgres/connection';

// Load environment variables from .env file
const possibleEnvPaths = [
  resolve(__dirname, '../.env'),
  resolve(process.cwd(), '.env'),
  join(process.cwd(), '.env'),
];

let envResult: dotenv.DotenvConfigOutput | null = null;
let loadedPath: string | null = null;

// Try to load .env from different possible locations
for (const envPath of possibleEnvPaths) {
  envResult = dotenv.config({ path: envPath });
  if (!envResult.error) {
    loadedPath = envPath;
    console.log(`✓ Loaded environment variables from ${envPath}`);
    break;
  }
}

// If all paths failed, try loading without path (default behavior)
if (envResult?.error) {
  envResult = dotenv.config();
  if (!envResult.error) {
    loadedPath = 'default location';
    console.log(`✓ Loaded environment variables from default location`);
  } else {
    console.warn(`⚠ Warning: Could not load .env file from any of these paths:`);
    possibleEnvPaths.forEach(p => console.warn(`  - ${p}`));
    console.warn(`  - default location`);
  }
}

async function runMigration() {
  const pool = createPostgresPool('migration');
  
  try {
    // Read migration SQL file
    const migrationPath = join(__dirname, '../db/postgres/migrations/010_add_state_column.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');
    
    console.log('Running migration: 010_add_state_column.sql');
    console.log('Adding state column to users table...');
    
    // Execute migration
    await pool.query(migrationSQL);
    
    console.log('✓ Migration completed successfully!');
    console.log('✓ State column added to users table');
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('✗ Migration failed:', errorMessage);
    if (error instanceof Error && error.stack) {
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();

