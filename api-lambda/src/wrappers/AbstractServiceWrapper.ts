import {KeyValuePairs} from "../ndp-cdr-apis-common/types";
import {NotFoundResponse} from "../graphql-responses";
import {GraphQLError} from "graphql";

export abstract class AbstractServiceWrapper {
  protected readonly serviceName: string;

  protected constructor(serviceName: string) {
    this.serviceName = serviceName;
  }

  protected handleNotFoundError = (message: string, identifiers: KeyValuePairs): never => {
    // const err: NotFoundResponse = {
    //   dataStoreName: this.serviceName,
    //   identifiers,
    //   message,
    // };
    // return err;
    throw new GraphQLError(message, {
      extensions: {
        code: 'NOT_FOUND',
        api: this.serviceName,
        identifiers
      }
    });
  };

  protected handleError = (error: Error | string | undefined) => {
    console.error(error);
    throw new GraphQLError('Unhandled error', {
      originalError: error as Error,
      extensions: {
        api: this.serviceName
      }
    });
  };

}
