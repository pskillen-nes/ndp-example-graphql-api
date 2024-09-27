export type Environment = 'local' | 'dev' | 'qa' | 'staging' | 'prod';

export type KeyValuePairs = { [name: string]: string };


export type APIConfig = {
  baseUrl: string;
  basePath?: string;
  apiKey?: string;
  auth: {
    type: 'disabled' | 'basic' | 'client_credentials';
    basic?: {
      username: string;
      password: string;
    },
    clientCredentials?: {
      tokenEndpoint: string;
      clientId: string;
      clientSecret: string;
      scope?: string;
    },
    secretsManager?: {
      secretName: string;
      secretsManagerTTL: number;
    },
  }
}

export type AWSSecretsManagerAPISecret = {
  baseUrl: string;
  basePath?: string;
  apiKey?: string;
  auth: {
    type: 'disabled' | 'basic' | 'client_credentials';
    basic?: {
      username: string;
      password: string;
    },
    clientCredentials?: {
      tokenEndpoint: string;
      clientId: string;
      clientSecret: string;
      scope?: string;
    }
  }
}

export type HttpHeaders = { [name: string]: string };
export type HttpVerb = 'GET' | 'HEAD' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS';

