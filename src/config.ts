import 'dotenv/config';

export const config = {
  port: parseInt(process.env.PORT || '3000'),
  coingeckoApiKey: process.env.COINGECKO_API_KEY || '',
  persistDataPath: process.env.PERSIST_DATA_PATH || '.',
  infuraProjectId: process.env.INFURA_PROJECT_ID || '.',
  priceStalenessThreshold: 60 * 1000,
};
