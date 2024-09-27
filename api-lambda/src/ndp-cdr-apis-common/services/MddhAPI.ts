import {HttpHeaders} from "../types";
import {AbstractAPIWrapper} from "./AbstractAPIWrapper";
import {OpenEhrDataFormat} from "./OpenEhrAPI.types";
import {APIResponse, QueryParameters} from "./APIWrapper.types";

export default class MddhAPI extends AbstractAPIWrapper {
  protected readonly serverNodeName: string;

  constructor(serverRootUrl: string, serverRootPath?: string, authHeader?: string, apiKey?: string, serverNodeName?: string) {
    super(serverRootUrl, serverRootPath, authHeader, apiKey);
    this.serverNodeName = serverNodeName ?? "local.ehrbase.org";
  }


  async createPatient(ehr: any, format?: OpenEhrDataFormat, headers: HttpHeaders = {}): Promise<object> {

    const queryParams: QueryParameters = {
      format: format,
    };

    console.debug('Posting EHR...');
    const url = '/patient';
    const response = await this.post(url, ehr, queryParams, headers);
    return response;
  }

  async getEhr(ehrId: string, format?: OpenEhrDataFormat, headers: HttpHeaders = {}): Promise<APIResponse<object>> {
    const queryParams: QueryParameters = {
      format: format,
    };

    console.debug(`Querying by EHR ID...`);
    const url = `/patient/${encodeURIComponent(ehrId)}`;
    const response = await this.get(url, queryParams, headers);
    return response;
  }

  async getEhrBySubject(subjectId: string, subjectNamespace?: string, format?: OpenEhrDataFormat, headers: HttpHeaders = {}): Promise<APIResponse<object>> {
    const queryParams: QueryParameters = {
      subject_id: subjectId,
      subject_namespace: subjectNamespace,
      format: format,
    };

    const url = '/patient';
    console.debug(`Querying by subject ID${subjectNamespace ?? ' and namespace'}...`);
    const response = await this.get(url, queryParams, headers);
    return response;
  }

  async listCompositionsForEhr(ehrId: string, format?: OpenEhrDataFormat, headers: HttpHeaders = {}): Promise<APIResponse<object>> {
    const queryParams: QueryParameters = {
      format: format,
    };

    console.debug(`Querying by EHR ID for compositions...`);
    const url = `/patient/${encodeURIComponent(ehrId)}/composition`;
    const response = await this.get(url, queryParams, headers);
    return response;
  }

  async postComposition(ehrId: string, composition: object, format?: OpenEhrDataFormat, headers: HttpHeaders = {}): Promise<APIResponse<object>> {

    const queryParams: QueryParameters = {
      format: format,
    };

    console.debug('Posting composition...');
    const url = `/patient/${ehrId}/composition`;
    const response = await this.post(url, composition, queryParams, headers);
    return response;
  }

  async getComposition(ehrId: string, compositionId: string, version?: number, format?: OpenEhrDataFormat, headers: HttpHeaders = {}): Promise<APIResponse<object>> {
    const queryParams: QueryParameters = {
      format: format,
    };

    console.debug(`Getting composition ${compositionId}::${version ?? 'latest'} for EHR ${ehrId}...`);
    const url = (version !== null && version !== undefined)
      ? `/patient/${encodeURIComponent(ehrId)}/composition/${encodeURIComponent(compositionId)}::${encodeURIComponent(this.serverNodeName)}::${version}`
      : `/patient/${encodeURIComponent(ehrId)}/composition/${encodeURIComponent(compositionId)}`;
    const response = await this.get(url, queryParams, headers);
    return response;
  }

  async putComposition(ehrId: string, compositionId: string, payload: object, format?: OpenEhrDataFormat, headers: HttpHeaders = {}): Promise<APIResponse<object>> {
    const queryParams: QueryParameters = {
      format: format,
    };

    console.debug('Updating composition...');
    const url = `/patient/${ehrId}/composition/${compositionId}`;
    const response = await this.put(url, payload, queryParams, headers);
    return response;
  }

  async searchByGet(searchParams: {
    [k: string]: string
  }, headers: HttpHeaders = {}): Promise<APIResponse<object>> {

    const queryParams = {
      ...searchParams
    };

    console.debug(`Querying by GET API...`);
    const url = `/devices/search`;
    const response = await this.get(url, queryParams, headers);
    return response;
  }
}
