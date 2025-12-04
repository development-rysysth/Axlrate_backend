import { Pool } from 'pg';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  ssl: process.env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

async function checkDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking database connection...\n');

    // Test connection
    const versionResult = await client.query('SELECT version()');
    console.log('✅ Connected to PostgreSQL');
    console.log(`📊 Version: ${versionResult.rows[0].version.split(',')[0]}\n`);

    // Check if users table exists
    const tableCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'users'
    `);

    if (tableCheck.rows.length > 0) {
      console.log('✅ users table exists');
      
      // Count users
      const countResult = await client.query('SELECT COUNT(*) FROM users');
      console.log(`👥 Total users: ${countResult.rows[0].count}\n`);
      
      // Show table structure
      const columns = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'users'
        ORDER BY ordinal_position
      `);
      
      console.log('📋 Table structure:');
      columns.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : ''}`);
      });
    } else {
      console.log('❌ users table does NOT exist');
      console.log('💡 Run: pnpm migration:run');
    }

    console.log('\n✅ Database check completed!');
  } catch (error) {
    console.error('❌ Database check failed:', error);
    if (error && typeof error === 'object' && 'code' in error) {
      if (error.code === 'ECONNREFUSED') {
        console.error('💡 Database connection refused. Check your connection settings.');
      } else if (error.code === '42P01') {
        console.error('💡 Table does not exist. Run: pnpm migration:run');
      }
    }
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

checkDatabase()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Check failed:', error.message);
    process.exit(1);
  });

