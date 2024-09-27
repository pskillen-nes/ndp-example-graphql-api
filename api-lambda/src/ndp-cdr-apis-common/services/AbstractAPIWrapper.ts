import axios, {AxiosRequestConfig, AxiosResponse} from "axios";
import {trimLeadingSlash, trimTrailingSlash} from "../helpers";
import {APIError, APIResponse, QueryParameters} from "./APIWrapper.types";
import {HttpHeaders} from "../types";

export abstract class AbstractAPIWrapper {
  protected readonly apiRootUrl: string;
  protected readonly authHeaderValue?: string;
  protected readonly apiKey?: string;

  protected static readonly NoQueryParams: QueryParameters = {};
  protected static readonly NoHeaders: HttpHeaders = {};

  protected constructor(serverRootUrl: string, serverRootPath?: string, authHeader?: string, apiKey?: string) {
    // Sanitise the server URL
    let serverUrl = trimTrailingSlash(serverRootUrl);

    // Append the root path
    if (serverRootPath)
      serverUrl = serverUrl + '/' + trimLeadingSlash(trimTrailingSlash(serverRootPath));

    this.apiRootUrl = trimTrailingSlash(serverUrl);
    this.authHeaderValue = authHeader;
    this.apiKey = apiKey;
  }

  protected getRequestConfig(optionalHeaders?: HttpHeaders): AxiosRequestConfig {
    // static headers
    const headers: any = {
      'Content-Type': 'application/json'
    }

    // Add auth headers
    if (this.authHeaderValue)
      headers['Authorization'] = this.authHeaderValue
    if (this.apiKey)
      headers['X-API-Key'] = this.apiKey;

    // merge optional headers
    if (optionalHeaders) {
      Object.entries(optionalHeaders)
        .forEach(([key, value]) => {
          // filter out null values
          if (value)
            headers[key] = value;
        })
    }

    return {
      headers,
      // validateStatus => true disables validation (because result is always true)
      validateStatus: () => true
    }
  }

  getApiUrl(path: string, queryParams?: QueryParameters): URL {
    // if path starts with a leading slash, new URL(..) will ignore our base path portion
    // and give us a URL relative to the server root
    path = trimLeadingSlash(path);
    const rootUrl = trimTrailingSlash(this.apiRootUrl)

    const url = new URL(rootUrl + '/' + path);

    if (queryParams) {
      Object.keys(queryParams)
        .forEach(key => {
          // 'null' or 0 or other falsy values are legit
          if (queryParams[key] === undefined)
            return;

          url.searchParams.set(key, encodeURIComponent(queryParams[key]!));
        });
    }

    return url;
  }


  async pingApi(url?: string): Promise<boolean> {
    return axios.get(this.getApiUrl(url ?? '/any-old-url').href)
      .then(() => true)
      .catch(e => {
        if (e.response) {
          // all is good, we don't care about the response, just that it exists
          return true;
        }
        console.error(e.message);
        // We're likely seeing a failure to connect
        return false;
      });
  }

  async post<Tresponse = object>(path: string, payload: any, queryParams: QueryParameters = {}, headers: HttpHeaders = {}): Promise<APIResponse<Tresponse>> {
    const url = this.getApiUrl(path, queryParams);
    const config = this.getRequestConfig(headers);

    const response = await axios.post<Tresponse>(url.href, payload, config);

    const resource = {
      statusCode: response.status,
      headers: response.headers as HttpHeaders,
      data: response.data
    };

    return resource;
  }

  async put<Tresponse = object>(path: string, payload: any, queryParams: QueryParameters = {}, headers: HttpHeaders = {}): Promise<APIResponse<Tresponse>> {
    const url = this.getApiUrl(path, queryParams);
    const config = this.getRequestConfig(headers);

    const response = await axios.put<Tresponse>(url.href, payload, config);

    const resource = {
      statusCode: response.status,
      headers: response.headers as HttpHeaders,
      data: response.data
    };

    return resource;
  }

  async get<Tresponse = object>(path: string, queryParams: QueryParameters = {}, headers: HttpHeaders = {}): Promise<APIResponse<Tresponse>> {
    const url = this.getApiUrl(path, queryParams);
    const config = this.getRequestConfig(headers);

    const response = await axios.get<Tresponse>(url.href, config);

    const resource = {
      statusCode: response.status,
      headers: response.headers as HttpHeaders,
      data: response.data
    };

    return resource;
  }

  async delete<Tresponse = object>(path: string, queryParams: QueryParameters = {}, headers: HttpHeaders = {}): Promise<APIResponse<Tresponse>> {
    const url = this.getApiUrl(path, queryParams);
    const config = this.getRequestConfig(headers);

    const response = await axios.delete<Tresponse>(url.href, config);

    const resource = {
      statusCode: response.status,
      headers: response.headers as HttpHeaders,
      data: response.data
    };

    return resource;
  }

  protected handleErrorResponse(response: AxiosResponse) {
    throw APIError.fromResponse(response);
  }
}

