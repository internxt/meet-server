export default () => ({
  environment: process.env.NODE_ENV,
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  port: parseInt(process.env.PORT) || 3000,
  apis: {
    payments: {
      url: process.env.PAYMENTS_URL,
    },
    gatewayApiToken: process.env.GATEWAY_HEADER_TOKEN,
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
  },
  driveDatabase: {
    host: process.env.DRIVE_DB_HOSTNAME,
    port: parseInt(process.env.DRIVE_DB_PORT) || 5432,
    debug: process.env.DRIVE_DB_DEBUG === 'true' || false,
    username: process.env.DRIVE_DB_USERNAME,
    password: process.env.DRIVE_DB_PASSWORD,
    database: process.env.DRIVE_DB_NAME,
  },
  avatar: {
    accessKey: process.env.AVATAR_ACCESS_KEY,
    secretKey: process.env.AVATAR_SECRET_KEY,
    bucket: process.env.AVATAR_BUCKET,
    region: process.env.AVATAR_REGION || 'us-east-1',
    endpoint: process.env.AVATAR_ENDPOINT,
    endpointForSignedUrls: process.env.AVATAR_ENDPOINT_REWRITE_FOR_SIGNED_URLS,
    forcePathStyle: process.env.AVATAR_FORCE_PATH_STYLE || 'true',
  },
});
