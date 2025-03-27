export default () => ({
  environment: process.env.NODE_ENV,
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  port: parseInt(process.env.PORT as string) || 3000,
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
});
