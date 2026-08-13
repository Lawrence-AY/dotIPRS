require('dotenv').config();

const common = {
  dialect: 'postgres',
  logging: false
};

module.exports = {
  development: {
    ...common,
    url: process.env.DATABASE_URL
  },
  test: {
    dialect: 'sqlite',
    storage: ':memory:',
    logging: false
  },
  uat: {
    ...common,
    url: process.env.DATABASE_URL,
    dialectOptions: { ssl: process.env.DB_SSL === 'true' }
  },
  production: {
    ...common,
    url: process.env.DATABASE_URL,
    dialectOptions: {
      ssl: process.env.DB_SSL === 'true' ? { require: true, rejectUnauthorized: true } : false
    }
  }
};
