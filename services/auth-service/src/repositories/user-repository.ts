import { getPool } from '../config/database';
import { RegisterRequestBody, PublicUser, User } from '../../../../shared';
import { hashPassword } from '../../../../shared/utils/password';
import { v4 as uuidv4 } from 'uuid';

export class UserRepository {
  private getPool() {
    return getPool();
  }

  private async hasStateColumn(): Promise<boolean> {
    try {
      const checkQuery = `
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'state'
      `;
      const result = await this.getPool().query(checkQuery);
      return result.rows.length > 0;
    } catch {
      return false;
    }
  }

  async findByEmail(businessEmail: string): Promise<User | null> {
    // Trim and lowercase email for case-insensitive matching
    const normalizedEmail = businessEmail.trim().toLowerCase();
    const hasState = await this.hasStateColumn();
    const stateField = hasState ? 'state,' : '';
    const query = `
      SELECT id, name, business_email as "businessEmail", country, ${stateField} hotel_name as "hotelName",
             hotel_id as "hotelId", phone_number as "phoneNumber", current_pms as "currentPMS", 
             business_type as "businessType",
             password, refresh_tokens as "refreshTokens", created_at as "createdAt", 
             updated_at as "updatedAt"
      FROM users
      WHERE LOWER(TRIM(business_email)) = $1
    `;
    
    try {
      const result = await this.getPool().query(query, [normalizedEmail]);
      return result.rows[0] || null;
    } catch (error: unknown) {
      // If query fails due to state column, retry without it
      if (error && typeof error === 'object' && 'code' in error && error.code === '42703') {
        const fallbackQuery = `
          SELECT id, name, business_email as "businessEmail", country, hotel_name as "hotelName",
                 hotel_id as "hotelId", phone_number as "phoneNumber", current_pms as "currentPMS", 
                 business_type as "businessType",
                 password, refresh_tokens as "refreshTokens", created_at as "createdAt", 
                 updated_at as "updatedAt"
          FROM users
          WHERE LOWER(TRIM(business_email)) = $1
        `;
        const result = await this.getPool().query(fallbackQuery, [normalizedEmail]);
        return result.rows[0] || null;
      }
      throw error;
    }
  }

  async findById(id: string): Promise<User | null> {
    const hasState = await this.hasStateColumn();
    const stateField = hasState ? 'state,' : '';
    const query = `
      SELECT id, name, business_email as "businessEmail", country, ${stateField} hotel_name as "hotelName",
             hotel_id as "hotelId", phone_number as "phoneNumber", current_pms as "currentPMS", 
             business_type as "businessType",
             password, refresh_tokens as "refreshTokens", created_at as "createdAt", 
             updated_at as "updatedAt"
      FROM users
      WHERE id = $1
    `;
    
    try {
      const result = await this.getPool().query(query, [id]);
      return result.rows[0] || null;
    } catch (error: unknown) {
      // If query fails due to state column, retry without it
      if (error && typeof error === 'object' && 'code' in error && error.code === '42703') {
        const fallbackQuery = `
          SELECT id, name, business_email as "businessEmail", country, hotel_name as "hotelName",
                 hotel_id as "hotelId", phone_number as "phoneNumber", current_pms as "currentPMS", 
                 business_type as "businessType",
                 password, refresh_tokens as "refreshTokens", created_at as "createdAt", 
                 updated_at as "updatedAt"
          FROM users
          WHERE id = $1
        `;
        const result = await this.getPool().query(fallbackQuery, [id]);
        return result.rows[0] || null;
      }
      throw error;
    }
  }

  async findByRefreshToken(refreshToken: string): Promise<User | null> {
    const hasState = await this.hasStateColumn();
    const stateField = hasState ? 'state,' : '';
    const query = `
      SELECT id, name, business_email as "businessEmail", country, ${stateField} hotel_name as "hotelName",
             hotel_id as "hotelId", phone_number as "phoneNumber", current_pms as "currentPMS", 
             business_type as "businessType",
             password, refresh_tokens as "refreshTokens", created_at as "createdAt", 
             updated_at as "updatedAt"
      FROM users
      WHERE $1 = ANY(refresh_tokens)
    `;
    
    try {
      const result = await this.getPool().query(query, [refreshToken]);
      return result.rows[0] || null;
    } catch (error: unknown) {
      // If query fails due to state column, retry without it
      if (error && typeof error === 'object' && 'code' in error && error.code === '42703') {
        const fallbackQuery = `
          SELECT id, name, business_email as "businessEmail", country, hotel_name as "hotelName",
                 hotel_id as "hotelId", phone_number as "phoneNumber", current_pms as "currentPMS", 
                 business_type as "businessType",
                 password, refresh_tokens as "refreshTokens", created_at as "createdAt", 
                 updated_at as "updatedAt"
          FROM users
          WHERE $1 = ANY(refresh_tokens)
        `;
        const result = await this.getPool().query(fallbackQuery, [refreshToken]);
        return result.rows[0] || null;
      }
      throw error;
    }
  }

  async create(userData: RegisterRequestBody & { hotelId?: string }): Promise<User> {
    // Hash password before storing
    const hashedPassword = await hashPassword(userData.password);
    
    // Normalize email to lowercase and trim
    const normalizedEmail = userData.businessEmail.trim().toLowerCase();
    
    // Generate UUID for new user
    const userId = uuidv4();
    
    const hasState = await this.hasStateColumn();
    const stateFields = hasState ? 'state,' : '';
    const stateValues = hasState ? '$5,' : '';
    const stateReturn = hasState ? 'state,' : '';
    
    const query = `
      INSERT INTO users (
        id, name, business_email, country, ${stateFields} hotel_name, hotel_id, phone_number,
        current_pms, business_type, password
      )
      VALUES ($1, $2, $3, $4, ${stateValues} $${hasState ? 6 : 5}, $${hasState ? 7 : 6}, $${hasState ? 8 : 7}, $${hasState ? 9 : 8}, $${hasState ? 10 : 9}, $${hasState ? 11 : 10})
      RETURNING id, name, business_email as "businessEmail", country, ${stateReturn} hotel_name as "hotelName",
                hotel_id as "hotelId", phone_number as "phoneNumber", current_pms as "currentPMS", 
                business_type as "businessType",
                password, refresh_tokens as "refreshTokens", created_at as "createdAt", 
                updated_at as "updatedAt"
    `;
    
    const values = hasState
      ? [
          userId,
          userData.name,
          normalizedEmail,
          userData.country,
          userData.state ?? null,
          userData.hotelName,
          userData.hotelId ?? null,
          userData.phoneNumber,
          userData.currentPMS,
          userData.businessType,
          hashedPassword,
        ]
      : [
          userId,
          userData.name,
          normalizedEmail,
          userData.country,
          userData.hotelName,
          userData.hotelId ?? null,
          userData.phoneNumber,
          userData.currentPMS,
          userData.businessType,
          hashedPassword,
        ];
    
    try {
      const result = await this.getPool().query(query, values);
      return result.rows[0];
    } catch (error: unknown) {
      // If insert fails due to state column, retry without it
      if (error && typeof error === 'object' && 'code' in error && (error.code === '42703' || error.code === '42P01')) {
        const fallbackQuery = `
          INSERT INTO users (
            id, name, business_email, country, hotel_name, hotel_id, phone_number,
            current_pms, business_type, password
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING id, name, business_email as "businessEmail", country, hotel_name as "hotelName",
                    hotel_id as "hotelId", phone_number as "phoneNumber", current_pms as "currentPMS", 
                    business_type as "businessType",
                    password, refresh_tokens as "refreshTokens", created_at as "createdAt", 
                    updated_at as "updatedAt"
        `;
        const fallbackValues = [
          userId,
          userData.name,
          normalizedEmail,
          userData.country,
          userData.hotelName,
          userData.hotelId ?? null,
          userData.phoneNumber,
          userData.currentPMS,
          userData.businessType,
          hashedPassword,
        ];
        const result = await this.getPool().query(fallbackQuery, fallbackValues);
        return result.rows[0];
      }
      throw error;
    }
  }

  async updateById(id: string, updateData: Partial<PublicUser>): Promise<User | null> {
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
    if (updateData.state !== undefined) {
      updates.push(`state = $${paramIndex++}`);
      values.push(updateData.state);
    }
    if (updateData.hotelName !== undefined) {
      updates.push(`hotel_name = $${paramIndex++}`);
      values.push(updateData.hotelName);
    }
    if (updateData.hotelId !== undefined) {
      updates.push(`hotel_id = $${paramIndex++}`);
      values.push(updateData.hotelId);
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

    if (updates.length === 0) {
      // No updates, just return current user
      return this.findById(id);
    }

    values.push(id);

    const hasState = await this.hasStateColumn();
    const stateReturn = hasState ? 'state,' : '';
    const query = `
      UPDATE users
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, name, business_email as "businessEmail", country, ${stateReturn} hotel_name as "hotelName",
                hotel_id as "hotelId", phone_number as "phoneNumber", current_pms as "currentPMS", 
                business_type as "businessType",
                password, refresh_tokens as "refreshTokens", created_at as "createdAt", 
                updated_at as "updatedAt"
    `;

    try {
      const result = await this.getPool().query(query, values);
      return result.rows[0] || null;
    } catch (error: unknown) {
      // If query fails due to state column, retry without it
      if (error && typeof error === 'object' && 'code' in error && error.code === '42703') {
        const fallbackQuery = `
          UPDATE users
          SET ${updates.filter(u => !u.includes('state')).join(', ')}
          WHERE id = $${paramIndex}
          RETURNING id, name, business_email as "businessEmail", country, hotel_name as "hotelName",
                    hotel_id as "hotelId", phone_number as "phoneNumber", current_pms as "currentPMS", 
                    business_type as "businessType",
                    password, refresh_tokens as "refreshTokens", created_at as "createdAt", 
                    updated_at as "updatedAt"
        `;
        const result = await this.getPool().query(fallbackQuery, values);
        return result.rows[0] || null;
      }
      throw error;
    }
  }

  async addRefreshToken(userId: string, refreshToken: string): Promise<User | null> {
    const hasState = await this.hasStateColumn();
    const stateReturn = hasState ? 'state,' : '';
    const query = `
      UPDATE users
      SET refresh_tokens = array_append(refresh_tokens, $1)
      WHERE id = $2
      RETURNING id, name, business_email as "businessEmail", country, ${stateReturn} hotel_name as "hotelName",
                hotel_id as "hotelId", phone_number as "phoneNumber", current_pms as "currentPMS", 
                business_type as "businessType",
                password, refresh_tokens as "refreshTokens", created_at as "createdAt", 
                updated_at as "updatedAt"
    `;
    
    try {
      const result = await this.getPool().query(query, [refreshToken, userId]);
      return result.rows[0] || null;
    } catch (error: unknown) {
      // If query fails due to state column, retry without it
      if (error && typeof error === 'object' && 'code' in error && error.code === '42703') {
        const fallbackQuery = `
          UPDATE users
          SET refresh_tokens = array_append(refresh_tokens, $1)
          WHERE id = $2
          RETURNING id, name, business_email as "businessEmail", country, hotel_name as "hotelName",
                    hotel_id as "hotelId", phone_number as "phoneNumber", current_pms as "currentPMS", 
                    business_type as "businessType",
                    password, refresh_tokens as "refreshTokens", created_at as "createdAt", 
                    updated_at as "updatedAt"
        `;
        const result = await this.getPool().query(fallbackQuery, [refreshToken, userId]);
        return result.rows[0] || null;
      }
      throw error;
    }
  }

  async removeRefreshToken(refreshToken: string): Promise<User | null> {
    const hasState = await this.hasStateColumn();
    const stateReturn = hasState ? 'state,' : '';
    const query = `
      UPDATE users
      SET refresh_tokens = array_remove(refresh_tokens, $1)
      WHERE $1 = ANY(refresh_tokens)
      RETURNING id, name, business_email as "businessEmail", country, ${stateReturn} hotel_name as "hotelName",
                hotel_id as "hotelId", phone_number as "phoneNumber", current_pms as "currentPMS", 
                business_type as "businessType",
                password, refresh_tokens as "refreshTokens", created_at as "createdAt", 
                updated_at as "updatedAt"
    `;
    
    try {
      const result = await this.getPool().query(query, [refreshToken]);
      return result.rows[0] || null;
    } catch (error: unknown) {
      // If query fails due to state column, retry without it
      if (error && typeof error === 'object' && 'code' in error && error.code === '42703') {
        const fallbackQuery = `
          UPDATE users
          SET refresh_tokens = array_remove(refresh_tokens, $1)
          WHERE $1 = ANY(refresh_tokens)
          RETURNING id, name, business_email as "businessEmail", country, hotel_name as "hotelName",
                    hotel_id as "hotelId", phone_number as "phoneNumber", current_pms as "currentPMS", 
                    business_type as "businessType",
                    password, refresh_tokens as "refreshTokens", created_at as "createdAt", 
                    updated_at as "updatedAt"
        `;
        const result = await this.getPool().query(fallbackQuery, [refreshToken]);
        return result.rows[0] || null;
      }
      throw error;
    }
  }
}

