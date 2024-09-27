import axios, {AxiosRequestConfig} from "axios";
import {Bundle, FhirResource, Parameters, Resource} from "fhir/r4";
import {trimLeadingSlash, trimTrailingSlash} from "../helpers";
import {NotFoundError} from "../app-errors";

export default class FhirAPI {
  private readonly serverRootUrl: string;
  private readonly auth?: string;
  private readonly apiKey?: string;
  private readonly tenantId?: string;


  constructor(serverRootUrl: string, serverRootPath?: string, auth?: string, apiKey?: string, tenantId?: string) {
    // Sanitise the server URL
    let serverUrl = trimTrailingSlash(serverRootUrl);

    // Append the root path
    if (serverRootPath && serverRootPath !== '/')
      serverUrl = serverUrl + '/' + trimLeadingSlash(trimTrailingSlash(serverRootPath));

    // Append the tenant ID
    if (tenantId)
      serverUrl = serverUrl + '/tenant/' + tenantId;

    this.serverRootUrl = serverUrl;
    this.auth = auth;
    this.apiKey = apiKey;
    this.tenantId = tenantId;
  }

  getApiUrl(path: string): string {
    const url = `${this.serverRootUrl}/${trimLeadingSlash(path)}`;
    return url;
  }


  protected getRequestConfig(): AxiosRequestConfig {
    const headers: any = {
      'Content-Type': 'application/json'
    }

    if (this.auth)
      headers['Authorization'] = this.auth
    if (this.apiKey)
      headers['X-API-Key'] = this.apiKey;

    return {
      headers,
      // validateStatus => true disables validation (because result is always true)
      validateStatus: () => true
    }
  }

  async pingApi(): Promise<boolean> {
    return axios.get(this.getApiUrl('/any-old-url'))
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

  async listResourceByType(typeName: string, customQueries?: string[]): Promise<Bundle> {
    const urlString = this.getApiUrl(`/${typeName}`);
    const url = new URL(urlString);

    if (customQueries)
      customQueries.forEach(ir => {
        const tokens = ir.split('=')
        // NB: Don't urlencode the key or value
        url.searchParams.append(tokens[0], tokens[1]);
      });

    const config = this.getRequestConfig();

    console.debug(`Listing ${typeName} from API...`);

    const response = await axios.get(url.href, config);
    if (response.status === 404)
      throw new NotFoundError();
    if (response.status !== 200)
      throw new Error(`Response ${response.status}: ${response.statusText}`)

    // parse response to Bundle object
    const bundle = response.data as Bundle;
    return bundle;
  }

  async getResourceById<T extends FhirResource>(typeName: string, id: string): Promise<T | undefined> {
    const url = this.getApiUrl(`/${typeName}/${id}`);
    const config = this.getRequestConfig();

    console.debug(`Getting ${typeName} by ID from API...`);

    const response = await axios.get(url, config);
    if (response.status === 404)
      throw new NotFoundError();
    if (response.status !== 200)
      throw new Error(`Response ${response.status}: ${response.statusText}`);

    const resource = response.data as T;
    return resource;
  }

  async searchByIdentifier<T extends FhirResource>(typeName: string, identifier: string, identifierSystem?: string): Promise<T> {
    const query = identifierSystem
      ? `${identifierSystem}|${identifier}`
      : identifier;
    const url = this.getApiUrl(`/${typeName}?identifier=${encodeURIComponent(query)}`);
    const config = this.getRequestConfig();

    console.debug(`Searching ${typeName} by identifier from API...`);

    const response = await axios.get(url, config);
    if (response.status === 404)
      throw new NotFoundError();
    if (response.status !== 200)
      throw new Error(`Response ${response.status}: ${response.statusText}`)

    // parse response to Bundle object
    const result = response.data as T;
    return result;
  }

  async getFirstByIdentifier<T extends FhirResource>(typeName: string, identifier: string, identifierSystem?: string): Promise<T | undefined> {
    const bundle = await this.searchByIdentifier<Bundle>(typeName, identifier, identifierSystem);

    if (!bundle || bundle.total === 0)
      return undefined;

    const resource = bundle.entry![0].resource as T;

    return resource;
  }

  async post<T extends Resource>(typeName: string, payload: T): Promise<T> {
    const url = this.getApiUrl(`/${typeName}`);
    const config = this.getRequestConfig();

    console.debug(`Posting ${typeName}`);
    const response = await axios.post(url, payload, config);

    if (response.status !== 201)
      throw new Error(`Response ${response.status}: ${response.statusText}`)

    const r = response.data as T;
    return r;
  }

  async match<T>(typeName: string, matchParams: Parameters): Promise<Bundle> {
    const url = this.getApiUrl(`/${typeName}?$match`);
    const config = this.getRequestConfig();

    console.debug(`Posting to ${typeName}/$match`);
    const response = await axios.post(url, matchParams, config);

    if (response.status === 404)
      throw new NotFoundError();
    if (response.status !== 200)
      throw new Error(`Response ${response.status}: ${response.statusText}`);

    const result = response.data as Bundle;
    return result;
  }

  async search(typeName: string, searchParams: { [k: string]: string }): Promise<Bundle> {
    const urlPath = this.getApiUrl(`/${typeName}`);
    const config = this.getRequestConfig();

    // Build a URL object so we can add our search params
    const url = new URL(urlPath);
    Object.entries(searchParams)
      .forEach(([k, v]) => url.searchParams.set(k, v));

    console.debug(`Getting ${typeName} (search)`);
    const urlHref = url.href;
    const response = await axios.get(urlHref, config);

    if (response.status === 404)
      throw new NotFoundError();
    if (response.status !== 200)
      throw new Error(`Response ${response.status}: ${response.statusText}`);

    const result = response.data as Bundle;
    return result;
  }

}
