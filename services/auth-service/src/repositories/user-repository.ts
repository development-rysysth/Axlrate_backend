import User from '../../models/User';
import { RegisterRequestBody, PublicUser } from '../../../../shared';

export class UserRepository {
  async findByEmail(businessEmail: string) {
    return User.findOne({ businessEmail });
  }

  async findById(id: string) {
    return User.findById(id);
  }

  async findByRefreshToken(refreshToken: string) {
    return User.findOne({ refreshTokens: refreshToken });
  }

  async create(userData: RegisterRequestBody) {
    return User.create(userData);
  }

  async updateById(id: string, updateData: Partial<PublicUser>) {
    return User.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );
  }

  async addRefreshToken(userId: string, refreshToken: string) {
    const user = await User.findById(userId);
    if (user) {
      user.refreshTokens.push(refreshToken);
      await user.save();
    }
    return user;
  }

  async removeRefreshToken(refreshToken: string) {
    const user = await User.findOne({ refreshTokens: refreshToken });
    if (user) {
      user.refreshTokens = user.refreshTokens.filter(token => token !== refreshToken);
      await user.save();
    }
    return user;
  }
}

