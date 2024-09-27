import {Bundle, DocumentReference, Encounter, Organization, Practitioner} from "fhir/r5";
import FhirAPI from "../ndp-cdr-apis-common/services/FhirAPI";
import {getApiAuthHeader, getSecretsManagerSecret} from "../init-services";
import config from "../config";
import {AbstractServiceWrapper} from "./AbstractServiceWrapper";
import {NotFoundError} from "../ndp-cdr-apis-common/app-errors";

class DDermPAPI extends FhirAPI {

}

const dderm = await initDDermAPI();

async function initDDermAPI(): Promise<DDermPAPI> {
  // if the SecretsManager secret name is specified, retrieve the value and override our current config
  const secretName = config.ddermAPI.auth.secretsManager?.secretName;
  if (secretName) {
    const newConfig = await getSecretsManagerSecret(secretName);

    if (newConfig)
      config.ddermAPI = {
        ...config.ddermAPI,
        ...newConfig
      };
  }

  const {baseUrl, basePath, apiKey} = config.ddermAPI;
  const authHeader = await getApiAuthHeader(config.ddermAPI);

  const api = new DDermPAPI(baseUrl, basePath, authHeader, apiKey);
  console.log(`Using DDerm API at ${api.getApiUrl('/')}`);
  return api;
}

export class DDermWrapper extends AbstractServiceWrapper {
  constructor() {
    super('Digital Dermatology Store');
  }

  getEncountersByChi = async (_: any, args: { [k: string]: string }) => {
    const chi = args['chiNumber'];

    let bundleData: Bundle;
    try {
      // Fetch Encounter and included resources (Practitioner, Organization)
      const response = await dderm.search('Encounter', {
        'patient.identifier': chi,
        '_include': 'Encounter:participant:Practitioner,Encounter:service-provider:Organization',
      });

      if (!response) {
        return this.handleNotFoundError('Patient not found', {chiNumber: chi});
      }

      bundleData = response as Bundle;
    } catch (error) {
      if (error instanceof NotFoundError) {
        return this.handleNotFoundError('Patient not found', {chiNumber: chi});
      }
      return this.handleError(error as Error | string);
    }

    // Extract all Encounter entries from the Bundle
    const encounterEntries = bundleData.entry?.filter(
      entry => (entry.resource as Encounter).resourceType === 'Encounter'
    ) || [];

    if (encounterEntries.length === 0) {
      return null; // No encounters found
    }

    // Map included Practitioner and Organization resources
    const practitioner = this.mapPractitionerFromBundle(bundleData);
    const organization = this.mapOrganizationFromBundle(bundleData);

    // Map each Encounter to GraphQL type and return the array of mapped Encounters
    const encounters = encounterEntries.map(encounterEntry => {
      const encounterResource = encounterEntry.resource as Encounter;
      return this.mapEncounterToGraphQL(encounterResource, practitioner, organization);
    });

    return encounters; // Return the array of mapped Encounters
  };

  getDocumentReferencesByChi = async (_: any, args: { [k: string]: string }) => {
    const chi = args['chiNumber'];

    let bundleData: Bundle;
    try {
      // Fetch DocumentReference and included resources (Practitioner)
      const response = await dderm.search('DocumentReference', {
        'patient.identifier': chi,
        '_include': 'DocumentReference:author:Practitioner',
      });

      if (!response) {
        return this.handleNotFoundError('No DocumentReferences found for this patient.', { chiNumber: chi });
      }

      bundleData = response as Bundle;
    } catch (error) {
      if (error instanceof NotFoundError) {
        return this.handleNotFoundError('Patient not found', {chiNumber: chi});
      }
      return this.handleError(error as Error | string);
    }

    // Extract all DocumentReference entries from the Bundle
    const documentReferenceEntries = bundleData.entry?.filter(
      entry => (entry.resource as DocumentReference).resourceType === 'DocumentReference'
    ) || [];

    if (documentReferenceEntries.length === 0) {
      return null; // No DocumentReferences found
    }

    // Map included Practitioner resources
    const practitioners = this.mapPractitionersFromBundle(bundleData);

    // Map each DocumentReference to GraphQL type
    const documentReferences = documentReferenceEntries.map(documentEntry => {
      const documentResource = documentEntry.resource as DocumentReference;
      const author = documentResource.author?.[0]?.reference ? practitioners[documentResource.author[0].reference] : null;
      return this.mapDocumentReferenceToGraphQL(documentResource, author);
    });

    return documentReferences; // Return the array of mapped DocumentReferences
  };

  private mapEncounterToGraphQL(encounter: Encounter, practitioner: Practitioner | null, organization: Organization | null) {
    return {
      id: encounter.id,
      identifier: encounter.identifier?.map(id => ({
        system: id.system,
        value: id.value,
      })),
      status: encounter.status,
      type: encounter.type?.map(t => this.mapCodeableConcept(t)),
      subject: {reference: encounter.subject?.reference},
      serviceProvider: organization || null,
      participant: encounter.participant?.map(p => ({
        actor: {reference: p.actor?.reference}
      })) || [],
      actualPeriod: encounter.actualPeriod
        ? {
          start: encounter.actualPeriod.start,
          end: encounter.actualPeriod.end,
        }
        : null,
      reason: encounter.reason?.flatMap(r => r.value?.map(reason => ({
        concept: this.mapCodeableConcept(reason.concept),
      }))) || [],
    };
  }

  private mapPractitionerFromBundle(bundle: Bundle): Practitioner | null {
    const practitionerEntry = bundle.entry?.find(
      entry => (entry.resource as Practitioner).resourceType === 'Practitioner'
    );

    const practitioner = practitionerEntry?.resource as Practitioner;
    if (!practitioner) {
      return null;
    }

    return {
      resourceType: 'Practitioner',
      id: practitioner.id,
      identifier: practitioner.identifier?.map(id => ({
        system: id.system,
        value: id.value,
      })),
      name: practitioner.name?.map(name => ({
        text: name.text,
      })),
      telecom: practitioner.telecom?.map(telecom => ({
        system: telecom.system,
        value: telecom.value,
      })),
    };
  }

  private mapOrganizationFromBundle(bundle: Bundle): Organization | null {
    const organizationEntry = bundle.entry?.find(
      entry => (entry.resource as Organization).resourceType === 'Organization'
    );

    const organization = organizationEntry?.resource as Organization;
    if (!organization) {
      return null;
    }

    return {
      resourceType: 'Organization',
      id: organization.id,
      identifier: organization.identifier?.map(id => ({
        system: id.system,
        value: id.value,
      })),
      name: organization.name,
      // partOf: organization.partOf ? {reference: organization.partOf.reference} : null,
    };
  }

  private mapDocumentReferenceToGraphQL(document: DocumentReference, author: Practitioner | null) {
    return {
      id: document.id,
      identifier: document.identifier?.map(id => ({
        system: id.system,
        value: id.value,
      })),
      status: document.status,
      docStatus: document.docStatus,
      type: this.mapCodeableConcept(document.type),
      category: document.category?.map(cat => this.mapCodeableConcept(cat)) || [],
      subject: { reference: document.subject?.reference },
      context: document.context?.map(ctx => ({ reference: ctx.reference })) || [],
      date: document.date,
      author: author ? this.mapPractitionerToGraphQL(author) : null,
      content: document.content?.map(content => ({
        attachment: {
          id: content.attachment.id,
          contentType: content.attachment.contentType,
          url: content.attachment.url,
        },
        profile: content.profile?.map(p => ({
          valueCoding: {
            system: p.valueCoding?.system,
            code: p.valueCoding?.code,
          },
        })),
      })) || [],
    };
  }

  private mapPractitionersFromBundle(bundle: Bundle): Record<string, Practitioner> {
    const practitioners: Record<string, Practitioner> = {};

    bundle.entry?.forEach(entry => {
      const resource = entry.resource as Practitioner;
      if (resource.resourceType === 'Practitioner') {
        practitioners[entry.fullUrl!] = resource;
      }
    });

    return practitioners;
  }

  private mapPractitionerToGraphQL(practitioner: Practitioner) {
    return {
      id: practitioner.id,
      identifier: practitioner.identifier?.map(id => ({
        system: id.system,
        value: id.value,
      })),
      name: practitioner.name?.map(name => ({
        text: name.text,
      })),
      telecom: practitioner.telecom?.map(telecom => ({
        system: telecom.system,
        value: telecom.value,
      })),
    };
  }

  private mapCodeableConcept(codeableConcept: any) {
    return {
      coding: codeableConcept.coding?.map((coding: any) => ({
        system: coding.system,
        code: coding.code,
        display: coding.display,
      })),
    };
  }
}
