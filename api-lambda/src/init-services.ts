import {GetSecretValueCommand, SecretsManagerClient} from "@aws-sdk/client-secrets-manager";
import {APIConfig, AWSSecretsManagerAPISecret} from "./ndp-cdr-apis-common/types";

import config from "./config";
import {getOAuthToken} from "./ndp-cdr-apis-common/auth/oauthClient";
import MddhAPI from "./ndp-cdr-apis-common/services/MddhAPI";

export async function getSecretsManagerSecret(secretName: string): Promise<AWSSecretsManagerAPISecret | undefined> {
  console.debug(`Reading OpenEHR credentials from secret ${secretName}`);
  const smClient = new SecretsManagerClient({region: config.aws.region});
  const cmd = new GetSecretValueCommand({SecretId: secretName})
  const secretValue = await smClient.send(cmd);

  if (!secretValue || !secretValue.SecretString)
    return undefined;

  const jsonSecrets = JSON.parse(secretValue.SecretString!) as AWSSecretsManagerAPISecret;
  return jsonSecrets;
}

export async function getApiAuthHeader(apiConfig: APIConfig): Promise<string | undefined> {
  let authHeader: string;

  if (apiConfig.auth.type === 'disabled')
    return undefined;

  if (apiConfig.auth.basic) {
    const {username, password} = apiConfig.auth.basic!;
    console.log(`Configuring API with basic auth - username ${username}`);

    const authKey = btoa(`${username ?? ''}:${password ?? ''}`);
    authHeader = `Basic ${authKey}`;

  } else if (apiConfig.auth.clientCredentials) {
    const {clientId, clientSecret, tokenEndpoint, scope} = apiConfig.auth.clientCredentials;
    console.log(`Configuring API with client credentials auth - client ID ${clientId}`);

    const tokenData = await getOAuthToken(clientId, clientSecret, tokenEndpoint, scope);
    authHeader = `${tokenData.token_type} ${tokenData.access_token}`;

  } else {
    throw new Error(`Unsupported auth mechanism`);

  }

  return authHeader;
}
