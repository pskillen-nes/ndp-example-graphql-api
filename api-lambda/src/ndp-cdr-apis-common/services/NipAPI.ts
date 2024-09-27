import {AbstractAPIWrapper} from "./AbstractAPIWrapper";
import {APIResponse, HttpHeaders, OpenEhrDataFormat, QueryParameters} from "../types";

export default class NipAPI extends AbstractAPIWrapper {

  constructor(serverRootUrl: string, serverRootPath?: string, authHeader?: string, apiKey?: string) {
    super(serverRootUrl, serverRootPath, authHeader, apiKey);
  }

  async postGenesisMessage(ehrId: string, composition: object, format?: OpenEhrDataFormat, headers: HttpHeaders = {}): Promise<APIResponse<object>> {

    const queryParams: QueryParameters = {
      format: format,
    };

    console.debug('Posting composition...');
    const url = `/patient/${ehrId}/composition`;
    const response = await this.post(url, composition, queryParams, headers);
    return response;
  }

}
