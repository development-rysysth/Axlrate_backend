import dotenv from 'dotenv';
dotenv.config({ path: '../../../.env' });

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

