import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables from root .env only
const rootEnvPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: rootEnvPath });

const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  ssl: process.env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

async function runMigration006() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Starting migration 006: Remove number_of_rooms from users table...\n');

    // Check if column exists before migration
    const checkResult = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'number_of_rooms'
    `);

    if (checkResult.rows.length > 0) {
      console.log('📋 Found number_of_rooms column in users table');
    } else {
      console.log('⚠️  number_of_rooms column does not exist in users table (may have already been removed)');
    }

    // Read the migration file
    const migrationPath = path.join(__dirname, '../db/postgres/migrations/006_remove_number_of_rooms_from_users.sql');
    const migration = fs.readFileSync(migrationPath, 'utf-8');

    console.log('📝 Executing migration 006...');
    await client.query(migration);
    console.log('✅ Migration 006 completed successfully!\n');

    // Verify the column was removed
    const verifyResult = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'number_of_rooms'
    `);

    if (verifyResult.rows.length === 0) {
      console.log('✅ Verified: number_of_rooms column has been removed from users table');
    } else {
      console.log('⚠️  Warning: number_of_rooms column still exists');
    }

    // Show current users table structure
    const columns = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'users'
      ORDER BY ordinal_position
    `);

    console.log('\n📋 Current users table structure:');
    columns.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : ''}`);
    });

    console.log('\n✅ Migration 006 completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration006()
  .then(() => {
    console.log('\n🎉 Database is ready!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Migration failed:', error.message);
    process.exit(1);
  });
