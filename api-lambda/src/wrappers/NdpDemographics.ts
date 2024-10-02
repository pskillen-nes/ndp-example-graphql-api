import {Address, Identifier, Patient} from "fhir/r4";
import FhirAPI from "../ndp-cdr-apis-common/services/FhirAPI";
import {getApiAuthHeader, getSecretsManagerSecret} from "../init-services";
import config from "../config";
import {AbstractServiceWrapper} from "./AbstractServiceWrapper";
import {NotFoundError} from "../ndp-cdr-apis-common/app-errors";

class NdpDemographicsAPI extends FhirAPI {

}

const empi = await initNdpDemographicsApi();

async function initNdpDemographicsApi(): Promise<NdpDemographicsAPI> {
  // if the SecretsManager secret name is specified, retrieve the value and override our current config
  const secretName = config.empiAPI.auth.secretsManager?.secretName;
  if (secretName) {
    const newConfig = await getSecretsManagerSecret(secretName);

    if (newConfig)
      config.empiAPI = {
        ...config.empiAPI,
        ...newConfig
      };
  }

  const {baseUrl, basePath, apiKey} = config.empiAPI;
  const authHeader = await getApiAuthHeader(config.empiAPI);

  const api = new NdpDemographicsAPI(baseUrl, basePath, authHeader, apiKey);
  console.log(`Using EMPI API at ${api.getApiUrl('/')}`);
  return api;
}

export type EmpiPatient = {
  deceased: boolean,
} & Patient;

export class NdpDemographicsWrapper extends AbstractServiceWrapper {
  constructor() {
    super('NDP Demographics Service');
  }

  getPatientByCHI = async (_: any, args: { [k: string]: string }): Promise<EmpiPatient> => {
    const chi = args['chiNumber'];

    let patientData: Patient;
    try {
      const response = await empi.getResourceById<Patient>('Patient', chi);

      if (!response)
        return this.handleNotFoundError('Patient not found', {chiNumber: chi});

      patientData = response;
    } catch (error) {
      if (error instanceof NotFoundError) {
        return this.handleNotFoundError('Patient not found', {chiNumber: chi});
      }
      return this.handleError(error as Error | string);
    }

    // Map the OpenAPI response fields to GraphQL Patient type
    const response: EmpiPatient = {
      resourceType: "Patient",
      id: patientData.id,
      name: patientData.name?.map(name => ({
        given: name.given,
        family: name.family,
        use: name.use,
        text: name.text,
      })) || [],
      birthDate: patientData.birthDate,
      gender: patientData.gender,
      managingOrganization: patientData.managingOrganization ? {
        identifier: {
          system: patientData.managingOrganization.identifier?.system,
          value: patientData.managingOrganization.identifier?.value
        },
        display: patientData.managingOrganization.display || ''
      } : undefined,
      address: patientData.address?.map((addr: Address) => ({
        use: addr.use,
        text: addr.text,
        postalCode: addr.postalCode,
        line: addr.line || []
      })) || [],
      deceased: patientData.deceasedBoolean || false,
      generalPractitioner: patientData.generalPractitioner?.map(gp => ({
        identifier: gp.identifier ? {
          system: gp.identifier.system,
          value: gp.identifier.value
        } : undefined,
        type: gp.type,
      })) || [],
    };
    return response;
  };

}
