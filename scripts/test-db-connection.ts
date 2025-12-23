import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from root .env only
const rootEnvPath = path.resolve(__dirname, '..', '.env');
dotenv.config({ path: rootEnvPath });

import { createPostgresPool } from '../db/postgres/connection';

async function testConnection() {
  console.log('Testing PostgreSQL connection...');
  console.log('Connection details:');
  console.log(`  Host: ${process.env.POSTGRES_HOST || 'localhost'}`);
  console.log(`  Port: ${process.env.POSTGRES_PORT || '5432'}`);
  console.log(`  Database: ${process.env.POSTGRES_DB || 'axlrate'}`);
  console.log(`  User: ${process.env.POSTGRES_USER || 'axlrate_user'}`);
  console.log(`  Password: ${process.env.POSTGRES_PASSWORD ? '***' : '(empty)'}`);
  console.log('');

  try {
    const pool = createPostgresPool('test-connection');
    
    // Wait a bit for the async connection test
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Run a simple query
    const result = await pool.query('SELECT version(), current_database(), current_user, NOW()');
    
    console.log('✅ Connection successful!');
    console.log('Database info:');
    console.log(`  PostgreSQL Version: ${result.rows[0].version}`);
    console.log(`  Current Database: ${result.rows[0].current_database}`);
    console.log(`  Current User: ${result.rows[0].current_user}`);
    console.log(`  Server Time: ${result.rows[0].now}`);
    
    // Test a simple query
    const tableResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      LIMIT 5
    `);
    
    if (tableResult.rows.length > 0) {
      console.log('\n📊 Available tables (first 5):');
      tableResult.rows.forEach((row, index) => {
        console.log(`  ${index + 1}. ${row.table_name}`);
      });
    } else {
      console.log('\n📊 No tables found in public schema');
    }
    
    await pool.end();
    console.log('\n✅ PostgreSQL connection test completed successfully!');
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Connection failed!');
    console.error('Error:', error.message);
    console.error('\nTroubleshooting tips:');
    console.error('1. Check if PostgreSQL is running');
    console.error('2. Verify host, port, database, and user are correct');
    console.error('3. Check if password is required (pg_hba.conf settings)');
    console.error('4. Verify network connectivity to the database server');
    process.exit(1);
  }
}

testConnection();
