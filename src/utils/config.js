// keeping config simple — no .env parsing library needed for this scale
// in a real app you'd use dotenv, but this is fine for an assignment

module.exports = {
  PORT: process.env.PORT || 3000,
  JWT_SECRET: process.env.JWT_SECRET || 'finance-dashboard-secret-key-change-in-prod',
  JWT_EXPIRES_IN: '24h',
};
