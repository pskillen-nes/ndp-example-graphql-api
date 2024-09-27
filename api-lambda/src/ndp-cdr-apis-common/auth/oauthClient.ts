import axios, {AxiosRequestConfig, AxiosResponse} from 'axios';

interface OAuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

export async function getOAuthToken(clientId: string, clientSecret: string, tokenEndpoint: string, scope?: string): Promise<OAuthTokenResponse> {
  const params = new URLSearchParams();
  params.append('grant_type', 'client_credentials');
  params.append('client_id', clientId);
  params.append('client_secret', clientSecret);
  if (scope)
    params.append('scope', scope);

  const config: AxiosRequestConfig = {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  };

  try {
    const response: AxiosResponse<OAuthTokenResponse> = await axios.post<OAuthTokenResponse>(tokenEndpoint, params, config);
    return response.data;
  } catch (error: any) {
    console.error('Error getting OAuth token by client credentials', error);
    throw new Error(`Failed to get OAuth token: ${error.message}`);
  }
}
