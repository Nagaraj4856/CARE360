const placeholderSecret = /replace|placeholder|example|change.me/i;
const placeholderDatabase = /postgres:password@localhost/i;
export const databaseConfigured = () => Boolean(process.env.DATABASE_URL) && !placeholderDatabase.test(process.env.DATABASE_URL);
export const jwtConfigured = () => Boolean(process.env.JWT_SECRET) && process.env.JWT_SECRET.length >= 32 && !placeholderSecret.test(process.env.JWT_SECRET);
export const authConfigured = () => databaseConfigured() && jwtConfigured();
