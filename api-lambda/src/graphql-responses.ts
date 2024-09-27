import {KeyValuePairs} from "./ndp-cdr-apis-common/types";

export type NotFoundResponse = {
  dataStoreName: string;
  identifiers: KeyValuePairs;
  message?: string;
}
