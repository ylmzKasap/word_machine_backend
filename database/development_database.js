const development_db = `postgresql://${process.env.DEVELOPMENT_USER}` 
  + `:${process.env.DEVELOPMENT_PASSWORD}`
  + `@${process.env.DEVELOPMENT_HOST}`
  + `:${process.env.DEVELOPMENT_PORT}`
  + `/${process.env.DEVELOPMENT_DATABASE}`;

module.exports = development_db;