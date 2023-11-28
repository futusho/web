declare namespace NodeJS {
  export interface ProcessEnv {
    NEXTAUTH_URL: string
    NEXTAUTH_SECRET: string

    EMAIL_SERVER_USER: string
    EMAIL_SERVER_PASSWORD: string
    EMAIL_SERVER_HOST: string
    EMAIL_SERVER_PORT: number
    EMAIL_FROM: string

    GITHUB_CLIENT_ID: string
    GITHUB_CLIENT_SECRET: string

    // GOOGLE_ANALYTICS_ID: string

    BIT_QUERY_API_KEY: string
    INFURA_API_KEY: string
    // ALCHEMY_POLYGON_MUMBAI_API_KEY: string
    // ALCHEMY_ETHEREUM_SEPOLIA_API_KEY: string

    BINANCE_ACCOUNT_PRIVATE_KEY: string
    // ETHEREUM_ACCOUNT_PRIVATE_KEY: string
    // POLYGON_ACCOUNT_PRIVATE_KEY: string

    SENTRY_DSN: string
    SENTRY_ORG: string
    SENTRY_PROJECT: string
  }
}
