import {AbstractAPIWrapper} from "./AbstractAPIWrapper";
import {APIResponse, QueryParameters} from "./APIWrapper.types";
import {trimLeadingSlash, trimTrailingSlash} from "../helpers";
import {HttpHeaders} from "../types";
import {AQLRequestResponse} from "./OpenEhrAPI.types";

export default class OpenEhrAPI extends AbstractAPIWrapper {
    protected readonly serverNodeName: string;

    constructor(serverRootUrl: string, serverRootPath?: string, authHeader?: string, apiKey?: string, serverNodeName?: string) {
        // Append the root path
        if (serverRootPath)
            serverRootPath = trimLeadingSlash(trimTrailingSlash(serverRootPath));

        const basePath = serverRootPath + '/openehr/v1';

        super(serverRootUrl, basePath, authHeader, apiKey);
        this.serverNodeName = serverNodeName ?? "local.ehrbase.org";
    }

    async postEHR(ehr: any, headers: HttpHeaders = {}): Promise<APIResponse<object>> {
        console.debug('Posting EHR...');
        const url = '/ehr';
        const response = await this.post(url, ehr, OpenEhrAPI.NoQueryParams, headers);
        return response;
    }

    async getEhr(ehrId: string, headers: HttpHeaders = {}): Promise<APIResponse<object>> {
        console.debug(`Querying by EHR ID...`);
        const url = `/ehr/${encodeURIComponent(ehrId)}`;
        const response = await this.get(url, OpenEhrAPI.NoQueryParams, headers);
        return response;
    }

    async getEhrBySubject(subjectId: string, subjectNamespace?: string, headers: HttpHeaders = {}): Promise<APIResponse<object>> {
        const queryParams: QueryParameters = {
            subject_id: subjectId,
            subject_namespace: subjectNamespace,
        }
        console.debug(`Querying by subject ID${subjectNamespace ?? ' and namespace'}...`);
        const url = '/ehr';
        const response = await this.get(url, queryParams, headers);
        return response;
    }

    async postComposition(ehrId: string, composition: object, headers: HttpHeaders = {}): Promise<APIResponse<object>> {
        console.debug('Posting composition...');
        const url = `/ehr/${encodeURIComponent(ehrId)}/composition`;
        const response = await this.post(url, composition, OpenEhrAPI.NoQueryParams, headers);
        return response;
    }

    async getComposition(ehrId: string, compositionId: string, version?: number, headers: HttpHeaders = {}): Promise<APIResponse<object>> {
        console.debug(`Getting composition ${compositionId}::${version ?? 'latest'} for EHR ${ehrId}...`);
        const url = (version !== null && version !== undefined)
            ? `/ehr/${encodeURIComponent(ehrId)}/composition/${encodeURIComponent(compositionId)}::${encodeURIComponent(this.serverNodeName)}::${version}`
            : `/ehr/${encodeURIComponent(ehrId)}/composition/${encodeURIComponent(compositionId)}`;
        const response = await this.get(url, OpenEhrAPI.NoQueryParams, headers);
        return response;
    }

    async putComposition(ehrId: string, compositionId: string, payload: object, headers: HttpHeaders = {}): Promise<APIResponse<object>> {
        console.debug('Updating composition...');
        const url = `/ehr/${encodeURIComponent(ehrId)}/composition/${compositionId}`;
        const response = await this.put(url, payload, OpenEhrAPI.NoQueryParams, headers);
        return response;
    }

    async queryByAQL(query: AQLRequestResponse, headers: HttpHeaders = {}): Promise<APIResponse<AQLRequestResponse>> {
        console.debug(`Querying by AQL...`);
        const url = `/query/aql`;
        const response = await this.post<AQLRequestResponse>(url, query, OpenEhrAPI.NoQueryParams, headers);
        return response;
    }
}
