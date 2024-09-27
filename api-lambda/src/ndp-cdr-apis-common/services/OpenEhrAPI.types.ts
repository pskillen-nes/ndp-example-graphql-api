import {HttpHeaders} from "../types";
import {UnknownError} from "../app-errors";

// APPLICATION TYPES

export type ETag = string;


// OPENEHR TYPES
export type OpenEhrDataType = Object;

// Applies to POST/PUT EHR and Composition
export type OpenEhrPostPutRequestHeaders = {
  'prefer'?: string,
  'if-match'?: string
};

export type AQLRequest = {
  q: string;
  query_parameters?: { [key: string]: string | number | boolean };
  fetch?: number;
  offset?: number;
}

export type OpenEhrJsonFormat = 'CANONICAL' | 'FLAT' | 'STRUCTURED';

// We technically accept any valid field in an EHR, but we _must_ have the following fields
export type OpenEhrEHRBodyCanonical = {
  ehr_id?: {
    value: string;
  };
  subject: {
    external_ref: {
      namespace: string;
      id: {
        value: string;
        scheme: string;
      };
    };
  };
};

export type OpenEhrEHRBodyStructured = {
  ehrId: string;
  ehrStatus: {
    subjectId: string;
    subjectNamespace: string;
  }
};

export type OpenEhrEHRBody = OpenEhrEHRBodyCanonical | OpenEhrEHRBodyStructured;

// This is a subset of data, but the composition must have these fields
export type OpenEhrCompositionBodyCanonical = {
  _type: "COMPOSITION";
  name: {
    value: string;
  } & any;
  archetype_details: {
    archetype_id: {
      value: string;
    } & any;
    template_id: {
      value: string;
    } & any;
  } & any;
  archetype_node_id?: string;
  uid?: {
    value: string;
  } & any;
} & any;

export type OpenEhrCompositionBodyFlat = {};

export type OpenEhrStructuredCompositionWrapper = {
  composition: OpenEhrCompositionBodyStructured,
  format: OpenEhrJsonFormat,
  templateId: string;
  ehrId: string;
  compositionUid: string;
}

export type OpenEhrCompositionBodyStructured = {
  nes_ts_medical_devices_data_hub: {
    category: any;
    context: any;
    composer: any;
    _uid: string | string[];
    _feeder_audit?: any;
  }
};

export type OpenEhrCompositionBody =
  OpenEhrCompositionBodyCanonical
  | OpenEhrCompositionBodyFlat
  | OpenEhrCompositionBodyStructured;

export type OpenEHRPostPutEHRResponse = {
  statusCode: number
  headers: HttpHeaders,
  data: OpenEhrEHRBody | undefined
};

export type OpenEHRPostPutCompositionResponse = {
  statusCode: number,
  headers: HttpHeaders,
  data: OpenEhrCompositionBody | undefined
};

export type OpenEHRGetEHRResponse = {
  statusCode: number,
  headers: HttpHeaders,
  data: OpenEhrEHRBody | undefined
};

export type OpenEHRGetCompositionResponse = {
  statusCode: number,
  headers: HttpHeaders,
  data: OpenEhrCompositionBody
};

export type OpenEHRDeleteCompositionResponse = {
  statusCode: number,
  headers: HttpHeaders,
  data: OpenEhrCompositionBody
};

export type OpenEHROperationResponse = OpenEHRPostPutEHRResponse | OpenEHRPostPutCompositionResponse
  | OpenEHRPostPutCompositionResponse | OpenEHRPostPutCompositionResponse | OpenEHRGetEHRResponse
  | OpenEHRGetCompositionResponse | OpenEHRDeleteCompositionResponse

export type OpenEHRStructuredResponseContent = {
  meta?: {
    href?: {
      url: string;
    };
  };
  action: 'CREATE' | 'RETRIEVE';
  format?: 'STRUCTURED' | 'FLAT';
  templateId?: string;
  ehrId?: string;
  compositionUid?: string;
  composition?: OpenEhrCompositionBodyStructured;
}

export type AQLResponseColumn = {
  path: string;
  name: string;
}

export type AQLResponseRow = (string | boolean | number)[];

export type AQLQueryResult = {
  meta?: {
    _type?: string;
    _schema_version?: string;
    _created?: string;
    _executed_aql?: string;
    fetch?: number;
    offset?: number;
    resultsize?: number;
  };
  q: string;
  columns: AQLResponseColumn[];
  rows: AQLResponseRow[];
}

export type AQLResponse = {
  statusCode: number,
  headers: HttpHeaders,
  result: AQLQueryResult;
}

export type OpenEHRErrorResponse = {
  error: string;
  message: string;
}

export type DeviceSearchResponseType = {
  count: number;
  meta: {
    fetch: number;
    offset: number;
    resultsize?: number;
  };
  deviceRecords: PatientDeviceResponse[];
};

export type PatientDeviceResponse = {
  meta: {
    compositionUid: string;
    compositionId: string;
    compositionVersion: number;
  };
  patient: {
    patientId: string;
    chi: string;
  }
  composition?: OpenEhrCompositionBodyCanonical;
}

export type OpenEHRResponseBody = OpenEhrEHRBody | OpenEhrCompositionBody | OpenEHROperationResponse
  | OpenEHRStructuredResponseContent | AQLResponse | PatientDeviceResponse

export class CompositionUid {
  static readonly UID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}::[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}::[1-9][0-9]*$/;

  static fromString(uidString: string) {
    // this is a convenience, since sometimes devs will pass in the uid part of a composition rather than the uid.value part
    if (typeof uidString !== 'string' && 'value' in uidString) {
      // @ts-ignore
      uidString = uidString.value;
    }

    if (!this.UID_REGEX.test(uidString))
      throw new UnknownError('input string is not a valid composition UID (expect [uuid::server::version])', {
        detail: {
          inputUid: uidString
        }
      });

    const parts = uidString.split('::');
    return new CompositionUid(parts[0], parts[1], parseInt(parts[2]));
  }

  id: string;
  server: string;
  version: number;

  constructor(id: string, server: string, version: number) {
    this.id = id;
    this.server = server;
    this.version = version;
  }

  public getUid(): string {
    return `${this.id}::${this.server}::${this.version}`;
  }

}

export type AQLRequestResponse = {
  q: string;
  query_parameters?: { [key: string]: string | number | boolean };
  columns?: {
    path: string;
    name: string;
  }[];
  rows: any[];
}

export type OpenEhrDataFormat = 'CANONICAL' | 'STRUCTURED' | 'FLAT';
