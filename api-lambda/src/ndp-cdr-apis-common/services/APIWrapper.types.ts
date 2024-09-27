import {HttpHeaders} from "../types";
import {AxiosResponse} from "axios";

export type APIResponse<Tdata> = {
  statusCode: number;
  headers: HttpHeaders;
  data: Tdata;
}

export class APIError implements Error {

  static fromResponse(response: AxiosResponse, message?: string): APIError {
    const name = response.statusText;
    const msg = message ?? response.statusText;
    const httpStatusCode = response.status
    const data = response.data;

    return new APIError(name, msg, httpStatusCode, data);
  }

  readonly name: string;
  readonly message: string;
  readonly httpStatusCode?: number;
  readonly data?: any;

  constructor(name: string, message?: string, httpStatusCode?: number, data?: any) {
    this.name = name;
    this.message = message || name;
    this.httpStatusCode = httpStatusCode;
    this.data = data;
  }
}

export type QueryParameters = { [name: string]: string | number | boolean | undefined };
