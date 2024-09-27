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

export class NdpDemographicsWrapper extends AbstractServiceWrapper {
  constructor() {
    super('NDP Demographics Service');
  }

  getPatientByCHI = async (_: any, args: { [k: string]: string }) => {
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
    return {
      id: patientData.id,  // This might be nullable, depending on the response
      chiNumber: patientData.identifier?.find((id: Identifier) => id.system?.includes('chinumber'))?.value || null,
      name: {
        family: patientData.name?.[0]?.family || '',
        given: patientData.name?.[0]?.given || []
      },
      birthDate: patientData.birthDate || null,
      gender: patientData.gender || null,
      managingOrganization: {
        identifier: {
          system: patientData.managingOrganization?.identifier?.system || null,
          value: patientData.managingOrganization?.identifier?.value || null
        },
        display: patientData.managingOrganization?.display || ''
      },
      address: patientData.address?.map((addr: Address) => ({
        use: addr.use || '',
        text: addr.text || '',
        postalCode: addr.postalCode || '',
        line: addr.line || []
      })) || [],
      deceased: patientData.deceasedBoolean || false,
      generalPractitioner: {
        identifier: {
          system: patientData.generalPractitioner?.[0]?.identifier?.system || null,
          value: patientData.generalPractitioner?.[0]?.identifier?.value || null
        },
        display: patientData.generalPractitioner?.[0]?.identifier?.value || null
      }
    };
  };

}
