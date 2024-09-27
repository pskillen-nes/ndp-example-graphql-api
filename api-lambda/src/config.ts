import dotenv from 'dotenv';
import {APIConfig} from "./ndp-cdr-apis-common/types";

dotenv.config();

// NB: These values will be overwritten at build time by build_function.sh
const environmentName: string = 'dev';
const version = '';
const serviceName = 'ndp-cdr-public-apis';

const secretsManagerTTL = process.env.SECRETS_MANAGER_TTL ? parseInt(process.env.SECRETS_MANAGER_TTL as string) : 60;


const empiApiConfig: APIConfig = {
  baseUrl: process.env.EMPI_BASE_URL ?? 'https://empi.staging.platform.ndp.scot/',
  basePath: process.env.EMPI_BASE_PATH ?? '/',
  apiKey: process.env.EMPI_API_KEY,
  auth: {
    type: (process.env.EMPI_AUTH_TYPE as 'basic' | 'client_credentials') ?? 'disabled',
    basic: process.env.EMPI_AUTH_TYPE === 'basic' ? {
      username: process.env.EMPI_AUTH_USER!,
      password: process.env.EMPI_AUTH_PASSWORD!,
    } : undefined,
    clientCredentials: process.env.EMPI_AUTH_TYPE === 'client_credentials' ? {
      tokenEndpoint: process.env.EMPI_AUTH_TOKEN_ENDPOINT!,
      clientId: process.env.EMPI_AUTH_CLIENT_ID!,
      clientSecret: process.env.EMPI_AUTH_CLIENT_SECRET!,
      scope: process.env.EMPI_AUTH_TOKEN_SCOPE,
    } : undefined,
    secretsManager: process.env.EMPI_AUTH_SECRETS_MANAGER_SECRET_NAME ? {
      secretName: process.env.EMPI_AUTH_SECRETS_MANAGER_SECRET_NAME!,
      secretsManagerTTL,
    } : undefined,
  }
}

const mddhApiConfig: APIConfig = {
  baseUrl: process.env.MDDH_BASE_URL ?? 'https://staging.api.ndp.scot/medical-device-register',
  basePath: process.env.MDDH_BASE_PATH ?? '/',
  apiKey: process.env.MDDH_API_KEY,
  auth: {
    type: (process.env.MDDH_AUTH_TYPE as 'basic' | 'client_credentials') ?? 'disabled',
    basic: process.env.MDDH_AUTH_TYPE === 'basic' ? {
      username: process.env.MDDH_AUTH_USER!,
      password: process.env.MDDH_AUTH_PASSWORD!,
    } : undefined,
    clientCredentials: process.env.MDDH_AUTH_TYPE === 'client_credentials' ? {
      tokenEndpoint: process.env.MDDH_AUTH_TOKEN_ENDPOINT!,
      clientId: process.env.MDDH_AUTH_CLIENT_ID!,
      clientSecret: process.env.MDDH_AUTH_CLIENT_SECRET!,
      scope: process.env.MDDH_AUTH_TOKEN_SCOPE,
    } : undefined,
    secretsManager: process.env.MDDH_AUTH_SECRETS_MANAGER_SECRET_NAME ? {
      secretName: process.env.MDDH_AUTH_SECRETS_MANAGER_SECRET_NAME!,
      secretsManagerTTL,
    } : undefined,
  }
}

const ncdsApiConfig: APIConfig = {
  baseUrl: process.env.NCDS_BASE_URL ?? 'https://staging.api.ndp.scot/medical-device-register',
  basePath: process.env.NCDS_BASE_PATH ?? '/',
  apiKey: process.env.NCDS_API_KEY,
  auth: {
    type: (process.env.NCDS_AUTH_TYPE as 'basic' | 'client_credentials') ?? 'disabled',
    basic: process.env.NCDS_AUTH_TYPE === 'basic' ? {
      username: process.env.NCDS_AUTH_USER!,
      password: process.env.NCDS_AUTH_PASSWORD!,
    } : undefined,
    clientCredentials: process.env.NCDS_AUTH_TYPE === 'client_credentials' ? {
      tokenEndpoint: process.env.NCDS_AUTH_TOKEN_ENDPOINT!,
      clientId: process.env.NCDS_AUTH_CLIENT_ID!,
      clientSecret: process.env.NCDS_AUTH_CLIENT_SECRET!,
      scope: process.env.NCDS_AUTH_TOKEN_SCOPE,
    } : undefined,
    secretsManager: process.env.NCDS_AUTH_SECRETS_MANAGER_SECRET_NAME ? {
      secretName: process.env.NCDS_AUTH_SECRETS_MANAGER_SECRET_NAME!,
      secretsManagerTTL,
    } : undefined,
  }
}

const ddermApiConfig: APIConfig = {
  baseUrl: process.env.DDERM_BASE_URL ?? 'https://staging.api.ndp.scot/storage/digital-dermatology',
  basePath: process.env.DDERM_BASE_PATH ?? '/',
  apiKey: process.env.DDERM_API_KEY,
  auth: {
    type: (process.env.DDERM_AUTH_TYPE as 'basic' | 'client_credentials') ?? 'disabled',
    basic: process.env.DDERM_AUTH_TYPE === 'basic' ? {
      username: process.env.DDERM_AUTH_USER!,
      password: process.env.DDERM_AUTH_PASSWORD!,
    } : undefined,
    clientCredentials: process.env.DDERM_AUTH_TYPE === 'client_credentials' ? {
      tokenEndpoint: process.env.DDERM_AUTH_TOKEN_ENDPOINT!,
      clientId: process.env.DDERM_AUTH_CLIENT_ID!,
      clientSecret: process.env.DDERM_AUTH_CLIENT_SECRET!,
      scope: process.env.DDERM_AUTH_TOKEN_SCOPE,
    } : undefined,
    secretsManager: process.env.DDERM_AUTH_SECRETS_MANAGER_SECRET_NAME ? {
      secretName: process.env.DDERM_AUTH_SECRETS_MANAGER_SECRET_NAME!,
      secretsManagerTTL,
    } : undefined,
  }
}

const config = {
  environment: environmentName,
  serviceName,
  version,
  aws: {
    region: process.env.AWS_REGION ?? 'eu-west-2',
  },
  empiAPI: empiApiConfig,
  ncdsAPI: ncdsApiConfig,
  ddermAPI: ddermApiConfig,
  mddh: {
    openEhrTemplateId: process.env.OPENEHR_TEMPLATE_ID ?? 'NES_TS Medical Devices Data Hub.v0 (6)',
    serverNodeName: process.env.OPENEHR_SERVER_NODE_NAME ?? 'integration-test.mddh.dss.ndp.scot',
  },
  mddhAPI: mddhApiConfig,
}

export default config;
