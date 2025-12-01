import { generateAccessToken, generateRefreshToken, verifyRefreshToken, TokenPayload } from '../../../../shared';

export class JwtService {
  static generateTokens(payload: TokenPayload) {
    return {
      accessToken: generateAccessToken(payload),
      refreshToken: generateRefreshToken(payload),
    };
  }

  static generateAccessToken(payload: TokenPayload): string {
    return generateAccessToken(payload);
  }

  static verifyRefreshToken(token: string): TokenPayload {
    return verifyRefreshToken(token);
  }
}

