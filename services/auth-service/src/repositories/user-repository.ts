import { getPool } from '../config/database';
import { RegisterRequestBody, PublicUser, User } from '../../../../shared';
import { hashPassword } from '../../../../shared/utils/password';

export class UserRepository {
  private getPool() {
    return getPool();
  }

  async findByEmail(businessEmail: string): Promise<User | null> {
    const query = `
      SELECT id, name, business_email as "businessEmail", country, hotel_name as "hotelName",
             phone_number as "phoneNumber", current_pms as "currentPMS", 
             business_type as "businessType", number_of_rooms as "numberOfRooms",
             password, refresh_tokens as "refreshTokens", created_at as "createdAt", 
             updated_at as "updatedAt"
      FROM users
      WHERE business_email = $1
    `;
    
    const result = await this.getPool().query(query, [businessEmail]);
    return result.rows[0] || null;
  }

  async findById(id: number): Promise<User | null> {
    const query = `
      SELECT id, name, business_email as "businessEmail", country, hotel_name as "hotelName",
             phone_number as "phoneNumber", current_pms as "currentPMS", 
             business_type as "businessType", number_of_rooms as "numberOfRooms",
             password, refresh_tokens as "refreshTokens", created_at as "createdAt", 
             updated_at as "updatedAt"
      FROM users
      WHERE id = $1
    `;
    
    const result = await this.getPool().query(query, [id]);
    return result.rows[0] || null;
  }

  async findByRefreshToken(refreshToken: string): Promise<User | null> {
    const query = `
      SELECT id, name, business_email as "businessEmail", country, hotel_name as "hotelName",
             phone_number as "phoneNumber", current_pms as "currentPMS", 
             business_type as "businessType", number_of_rooms as "numberOfRooms",
             password, refresh_tokens as "refreshTokens", created_at as "createdAt", 
             updated_at as "updatedAt"
      FROM users
      WHERE $1 = ANY(refresh_tokens)
    `;
    
    const result = await this.getPool().query(query, [refreshToken]);
    return result.rows[0] || null;
  }

  async create(userData: RegisterRequestBody): Promise<User> {
    // Hash password before storing
    const hashedPassword = await hashPassword(userData.password);
    
    const query = `
      INSERT INTO users (
        name, business_email, country, hotel_name, phone_number,
        current_pms, business_type, number_of_rooms, password
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, name, business_email as "businessEmail", country, hotel_name as "hotelName",
                phone_number as "phoneNumber", current_pms as "currentPMS", 
                business_type as "businessType", number_of_rooms as "numberOfRooms",
                password, refresh_tokens as "refreshTokens", created_at as "createdAt", 
                updated_at as "updatedAt"
    `;
    
    const values = [
      userData.name,
      userData.businessEmail,
      userData.country,
      userData.hotelName,
      userData.phoneNumber,
      userData.currentPMS,
      userData.businessType,
      userData.numberOfRooms,
      hashedPassword,
    ];
    
    const result = await this.getPool().query(query, values);
    return result.rows[0];
  }

  async updateById(id: number, updateData: Partial<PublicUser>): Promise<User | null> {
    // Build dynamic SET clause
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updateData.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(updateData.name);
    }
    if (updateData.country !== undefined) {
      updates.push(`country = $${paramIndex++}`);
      values.push(updateData.country);
    }
    if (updateData.hotelName !== undefined) {
      updates.push(`hotel_name = $${paramIndex++}`);
      values.push(updateData.hotelName);
    }
    if (updateData.phoneNumber !== undefined) {
      updates.push(`phone_number = $${paramIndex++}`);
      values.push(updateData.phoneNumber);
    }
    if (updateData.currentPMS !== undefined) {
      updates.push(`current_pms = $${paramIndex++}`);
      values.push(updateData.currentPMS);
    }
    if (updateData.businessType !== undefined) {
      updates.push(`business_type = $${paramIndex++}`);
      values.push(updateData.businessType);
    }
    if (updateData.numberOfRooms !== undefined) {
      updates.push(`number_of_rooms = $${paramIndex++}`);
      values.push(updateData.numberOfRooms);
    }

    if (updates.length === 0) {
      // No updates, just return current user
      return this.findById(id);
    }

    values.push(id);

    const query = `
      UPDATE users
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, name, business_email as "businessEmail", country, hotel_name as "hotelName",
                phone_number as "phoneNumber", current_pms as "currentPMS", 
                business_type as "businessType", number_of_rooms as "numberOfRooms",
                password, refresh_tokens as "refreshTokens", created_at as "createdAt", 
                updated_at as "updatedAt"
    `;

    const result = await this.getPool().query(query, values);
    return result.rows[0] || null;
  }

  async addRefreshToken(userId: number, refreshToken: string): Promise<User | null> {
    const query = `
      UPDATE users
      SET refresh_tokens = array_append(refresh_tokens, $1)
      WHERE id = $2
      RETURNING id, name, business_email as "businessEmail", country, hotel_name as "hotelName",
                phone_number as "phoneNumber", current_pms as "currentPMS", 
                business_type as "businessType", number_of_rooms as "numberOfRooms",
                password, refresh_tokens as "refreshTokens", created_at as "createdAt", 
                updated_at as "updatedAt"
    `;
    
    const result = await this.getPool().query(query, [refreshToken, userId]);
    return result.rows[0] || null;
  }

  async removeRefreshToken(refreshToken: string): Promise<User | null> {
    const query = `
      UPDATE users
      SET refresh_tokens = array_remove(refresh_tokens, $1)
      WHERE $1 = ANY(refresh_tokens)
      RETURNING id, name, business_email as "businessEmail", country, hotel_name as "hotelName",
                phone_number as "phoneNumber", current_pms as "currentPMS", 
                business_type as "businessType", number_of_rooms as "numberOfRooms",
                password, refresh_tokens as "refreshTokens", created_at as "createdAt", 
                updated_at as "updatedAt"
    `;
    
    const result = await this.getPool().query(query, [refreshToken]);
    return result.rows[0] || null;
  }
}

