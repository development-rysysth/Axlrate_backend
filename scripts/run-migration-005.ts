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

async function runMigration005() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Starting migration 005: Change hotel_id to VARCHAR(100)...\n');

    // Read the migration file
    const migrationPath = path.join(__dirname, '../db/postgres/migrations/005_change_hotel_id_to_varchar.sql');
    const migration = fs.readFileSync(migrationPath, 'utf-8');

    console.log('📝 Executing migration 005...');
    await client.query(migration);
    console.log('✅ Migration 005 completed successfully!\n');

    // Verify the changes
    const tables = ['users', 'rates', 'ota_rates'];
    for (const tableName of tables) {
      const result = await client.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = $1
        AND column_name = 'hotel_id'
      `, [tableName]);
      
      if (result.rows.length > 0) {
        const col = result.rows[0];
        console.log(`✅ ${tableName}.hotel_id: ${col.data_type}`);
      } else {
        console.log(`⚠️  ${tableName}.hotel_id: column not found`);
      }
    }

    console.log('\n✅ Migration 005 completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration005()
  .then(() => {
    console.log('\n🎉 Database is ready!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Migration failed:', error.message);
    process.exit(1);
  });
