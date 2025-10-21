export const jwtConstants = {
  accessSecret:
    process.env.JWT_ACCESS_SECRET || 'your-secret-key-change-me-in-production',
  refreshSecret:
    process.env.JWT_REFRESH_SECRET ||
    'your-refresh-secret-key-change-me-in-production',
  accessExpiresIn: '15m',
  refreshExpiresIn: '7d',
};
