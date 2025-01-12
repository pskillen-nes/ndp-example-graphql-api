import {ApolloServer} from '@apollo/server';
import {startStandaloneServer} from "@apollo/server/standalone";
import {GraphQLError, GraphQLFormattedError} from "graphql";
import {loadFilesSync} from '@graphql-tools/load-files';
import {dirname, join} from 'path';
import {fileURLToPath} from 'url';
import {NdpDemographicsWrapper} from "./wrappers/NdpDemographics";
import {MddhWrapper} from "./wrappers/MDDH";
import {NcdsWrapper} from "./wrappers/NCDS";
import {DDermWrapper} from "./wrappers/DigiDerm";
import config from "./config";
import {initNgrok} from "./init-services";

// Load the .graphql files from your `graphql/specs` folder
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const typeDefs = loadFilesSync(join(__dirname, '../../graphql/specs/**/*.graphql'));


const empi = new NdpDemographicsWrapper();
const mddh = new MddhWrapper();
const ncds = new NcdsWrapper();
const dderm = new DDermWrapper();

const formatError = (_: GraphQLFormattedError, err: unknown): GraphQLFormattedError => {
  if (err instanceof GraphQLError) {
    const isNotFound = err.extensions?.code === 'NOT_FOUND';

    return {
      message: err.message,
      extensions: {
        code: err.extensions?.code,
        api: err.extensions?.api,
        identifiers: err.extensions?.identifiers,
        dataStoreName: err.extensions?.dataStoreName,
        originalError: (!isNotFound && err.originalError) ? {
          name: err.originalError.name,
          message: err.originalError.message,
        } : undefined,
      },
    };
  }

  // Return a generic error message if it's not a GraphQLError
  return {
    message: 'An unexpected error occurred',
    extensions: {
      code: 'INTERNAL_SERVER_ERROR',
    },
  };
};

// Define resolvers that query the respective APIs
const resolvers = {
  Query: {
    // EMPI
    getPatientByCHI: empi.getPatientByCHI,

    // MDDH
    getMedicalDevicesByChi: mddh.getMedicalDevicesByChi,

    // NCDS
    getImmunizationsByChi: ncds.getImmunizationsByChi,

    // DDerm
    getDermatologyDocumentReferencesByChi: dderm.getDocumentReferencesByChi,
    getDermatologyEncountersByChi: dderm.getEncountersByChi,
  }
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
  formatError,
});

const {url} = await startStandaloneServer(server, {
  listen: {port: config.server.port},
});

if (config.ngrok.enabled)
  await initNgrok();

console.log(`🚀  Server ready at: ${url}`);
