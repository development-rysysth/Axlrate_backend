// Re-export User model from auth-service
// This allows other services to import the model if needed
export { default as User } from '../../../services/auth-service/models/User';
export type { IUser } from '../../../shared/types';

