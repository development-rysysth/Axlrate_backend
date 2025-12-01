import amqp from 'amqplib';

let connection: amqp.Connection | null = null;
let channel: amqp.Channel | null = null;

export const connectRabbitMQ = async (): Promise<void> => {
  try {
    const url = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
    connection = await amqp.connect(url);
    channel = await connection.createChannel();
    console.log('[scraper-orchestrator] RabbitMQ connected');
  } catch (error) {
    console.error('[scraper-orchestrator] RabbitMQ connection error:', error);
    throw error;
  }
};

export const getChannel = () => {
  if (!channel) {
    throw new Error('RabbitMQ channel not initialized. Call connectRabbitMQ() first.');
  }
  return channel;
};

export const closeConnection = async (): Promise<void> => {
  if (channel) {
    await channel.close();
  }
  if (connection) {
    await connection.close();
  }
};

