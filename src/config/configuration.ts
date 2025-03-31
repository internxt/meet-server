export default () => ({
  environment: process.env.NODE_ENV,
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  port: parseInt(process.env.PORT) || 3000,
  apis: {
    payments: {
      url: process.env.PAYMENTS_URL,
    },
  },
  secrets: {
    jwt: process.env.JWT_SECRET,
    jitsiSecret: process.env.JITSI_SECRET,
  },
  jitsi: {
    appId: process.env.JITSI_APP_ID,
    apiKey: process.env.JITSI_API_KEY,
  },
  database: {
    host: process.env.DB_HOSTNAME,
    host2: process.env.DB_HOSTNAME2,
    host3: process.env.DB_HOSTNAME3,
    port: parseInt(process.env.DB_PORT) || 3306,
    debug: process.env.DB_DEBUG === 'true' || false,
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    replication: {
      read: [
        {
          host: process.env.DB_HOSTNAME2,
          username: process.env.DB_USERNAME,
          password: process.env.DB_PASSWORD,
        },
        {
          host: process.env.DB_HOSTNAME3,
          username: process.env.DB_USERNAME,
          password: process.env.DB_PASSWORD,
        },
      ],
      write: {
        host: process.env.DB_HOSTNAME,
        username: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
      },
    },
  },
});
