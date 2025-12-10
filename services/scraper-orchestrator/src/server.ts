import dotenv from 'dotenv';
import path from 'path';

// Load .env from root directory only
const rootEnvPath = path.resolve(__dirname, '../../../.env');
dotenv.config({ path: rootEnvPath });

import { connectRabbitMQ } from './config/rabbitmq';

const PORT = process.env.SCRAPER_ORCHESTRATOR_PORT || 3007;

// Connect to RabbitMQ and start orchestrator
const startOrchestrator = async () => {
  try {
    await connectRabbitMQ();
    
    console.log(`Scraper orchestrator running on port ${PORT}`);
    console.log('Waiting for scraper tasks...');
  } catch (error) {
    console.error('Failed to start orchestrator:', error);
    process.exit(1);
  }
};

startOrchestrator();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing orchestrator');
  const { closeConnection } = await import('./config/rabbitmq');
  await closeConnection();
  process.exit(0);
});

