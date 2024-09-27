import {Bundle, Immunization} from "fhir/r4";
import FhirAPI from "../ndp-cdr-apis-common/services/FhirAPI";
import {getApiAuthHeader, getSecretsManagerSecret} from "../init-services";
import config from "../config";
import {AbstractServiceWrapper} from "./AbstractServiceWrapper";
import {NotFoundError} from "../ndp-cdr-apis-common/app-errors";

class NcdsAPI extends FhirAPI {

}

const ncds = await initNcdsApi();

async function initNcdsApi(): Promise<NcdsAPI> {
  // if the SecretsManager secret name is specified, retrieve the value and override our current config
  const secretName = config.ncdsAPI.auth.secretsManager?.secretName;
  if (secretName) {
    const newConfig = await getSecretsManagerSecret(secretName);

    if (newConfig)
      config.ncdsAPI = {
        ...config.ncdsAPI,
        ...newConfig
      };
  }

  const {baseUrl, basePath, apiKey} = config.ncdsAPI;
  const authHeader = await getApiAuthHeader(config.ncdsAPI);

  const api = new NcdsAPI(baseUrl, basePath, authHeader, apiKey);
  console.log(`Using NCDS API at ${api.getApiUrl('/')}`);
  return api;
}

export class NcdsWrapper extends AbstractServiceWrapper {
  constructor() {
    super('National Clinical Data Store (Vaccinations)');
  }

  getImmunizationsByChi = async (_: any, args: { [k: string]: string }) => {
    const chi = args['chiNumber'];

    // Call the EMPI API to get patient details by CHI number
    let bundleData: Bundle;
    try {
      const response = await ncds.search('Immunization', {identifier: chi});

      if (!response)
        return this.handleNotFoundError('Patient not found', {chiNumber: chi});

      bundleData = response;
    } catch (error) {
      if (error instanceof NotFoundError) {
        return this.handleNotFoundError('Patient not found', {chiNumber: chi});
      }
      return this.handleError(error as Error | string);
    }

    // Extract and map Immunization entries to GraphQL types
    const immunizations = bundleData.entry?.flatMap(entry => {
      const immunizationResource = entry.resource as Immunization;
      if (immunizationResource.resourceType === 'Immunization') {
        return this.mapImmunizationToGraphQL(immunizationResource);
      }
      return [];
    }) || [];

    return immunizations;
  };

  private mapImmunizationToGraphQL(immunization: Immunization) {
    return {
      id: immunization.id,
      identifier: immunization.identifier?.map(id => ({
        system: id.system,
        value: id.value,
      })),
      status: immunization.status,
      statusReason: immunization.statusReason
        ? this.mapCodeableConcept(immunization.statusReason)
        : null,
      vaccineCode: this.mapCodeableConcept(immunization.vaccineCode),
      patient: {
        reference: immunization.patient.reference,
      },
      occurrenceDateTime: immunization.occurrenceDateTime,
      recorded: immunization.recorded,
      primarySource: immunization.primarySource,
      location: immunization.location
        ? {reference: immunization.location.reference}
        : null,
      manufacturer: immunization.manufacturer
        ? {reference: immunization.manufacturer.reference}
        : null,
      lotNumber: immunization.lotNumber,
      site: immunization.site
        ? this.mapCodeableConcept(immunization.site)
        : null,
      route: immunization.route
        ? this.mapCodeableConcept(immunization.route)
        : null,
      performer: immunization.performer?.map(p => ({
        actor: {reference: p.actor.reference}
      })) || [],
      reasonCode: immunization.reasonCode?.map(rc => this.mapCodeableConcept(rc)) || [],
      protocolApplied: immunization.protocolApplied?.map(protocol => ({
        targetDisease: protocol.targetDisease?.map(disease => this.mapCodeableConcept(disease)),
        doseNumberPositiveInt: protocol.doseNumberPositiveInt,
        seriesDosePositiveInt: protocol.seriesDosesPositiveInt,
      })) || [],
    };
  }

  private mapCodeableConcept(codeableConcept: any) {
    return {
      text: codeableConcept.text,
      coding: codeableConcept.coding?.map((coding: any) => ({
        system: coding.system,
        code: coding.code,
        display: coding.display,
      })),
    };
  }

}
