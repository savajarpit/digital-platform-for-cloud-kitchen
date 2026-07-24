export interface JwtPayload {
  sub: string; // userId
  email: string;
  role: string;
  tenantId?: string; // MULTI_TENANT only
  iat?: number;
  exp?: number;
}
