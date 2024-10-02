import MddhAPI from "../ndp-cdr-apis-common/services/MddhAPI";
import config from "../config";
import {getApiAuthHeader, getSecretsManagerSecret} from "../init-services";
import {DeviceSearchResponseType, OpenEhrEHRBodyCanonical} from "../ndp-cdr-apis-common/services/OpenEhrAPI.types";
import {AbstractServiceWrapper} from "./AbstractServiceWrapper";


const mddh = await initMddhAPI();

export async function initMddhAPI(): Promise<MddhAPI> {
  // if the SecretsManager secret name is specified, retrieve the value and override our current config
  const secretName = config.mddhAPI.auth.secretsManager?.secretName;
  if (secretName) {
    const newConfig = await getSecretsManagerSecret(secretName);

    if (newConfig)
      config.mddhAPI = {
        ...config.mddhAPI,
        ...newConfig
      };
  }

  const {baseUrl, basePath, apiKey} = config.mddhAPI;
  const serverNodeName = config.mddh.serverNodeName;
  const authHeader = await getApiAuthHeader(config.mddhAPI);

  const api = new MddhAPI(baseUrl, basePath, authHeader, apiKey, serverNodeName);
  console.log(`Using MDDH API at ${api.getApiUrl('/')}`);
  return api;
}


export interface MedicalDevice {
  deviceSerialNum: string | null;
  productDescription: string | null;
  lotOrBatchNum: string | null;
  mddClass: string | null;
  procedure: Procedure;
  operation: Operation;
}

export interface Procedure {
  id: string | null;
  code: string | null;
  description: string | null;
}

export interface Operation {
  id: string | null;
  identifier: string | null;
  dateTime: string | null;
}


export class MddhWrapper extends AbstractServiceWrapper {
  constructor() {
    super('Medical Device Registry');
  }

  getMedicalDevicesByChi = async (_: any, args: { [k: string]: string }) => {
    const chi = args['chiNumber'];


    let searchResponse: DeviceSearchResponseType;
    try {
      const patientResponse = await mddh.getEhrBySubject(chi);
      const patient = patientResponse.data as OpenEhrEHRBodyCanonical;
      if (!patientResponse || patientResponse.statusCode !== 200) {
        const response = this.handleNotFoundError('Patient not found', {chiNumber: chi});
        return response;
      }

      // List all compositions for the patient's EHR
      const listCompositionsResponse = await mddh.listCompositionsForEhr(patient.ehr_id!.value);
      searchResponse = listCompositionsResponse.data as DeviceSearchResponseType;
    } catch (error) {
      return this.handleError(error as Error | string);
    }


    // Map the compositions to extract the devices
    const devices = this.mapMedicalDevices(searchResponse);

    return devices || [];
  };

  private mapMedicalDevices(openEhrResponse: any): MedicalDevice[] {
    const deviceRecords = openEhrResponse.deviceRecords || [];
    const medicalDevices: MedicalDevice[] = [];

    // Loop through each device record (i.e., each composition)
    deviceRecords.forEach((record: any) => {
      const composition = record.composition;

      // Loop through the content in the composition to find procedures
      const procedures = composition.content.filter(
        (content: any) => content.name.value === 'Procedure'
      );
      const operation = composition.content.find(
        (content: any) => content.name.value === 'Operation'
      );

      procedures.forEach((procedure: any) => {
        // Extract device details from the procedure description items
        const deviceDetailsArray = procedure?.description?.items.filter(
          (item: any) => item.name.value === 'Device Details'
        );

        // If device details exist, map each device
        deviceDetailsArray.forEach((deviceDetails: any) => {
          const productDescription = deviceDetails?.items?.find(
            (item: any) => item.name.value === 'Product description'
          )?.value?.value;
          const deviceSerialNum = deviceDetails?.items?.find(
            (item: any) => item.name.value === 'Device Serial number'
          )?.value?.value;
          const lotOrBatchNum = deviceDetails?.items?.find(
            (item: any) => item.name.value === 'Device Lot or Batch number'
          )?.value?.value;
          const mddClass = deviceDetails?.items?.find(
            (item: any) => item.name.value === 'Class'
          )?.value?.value;

          // Map the medical device object
          const mappedDevice: MedicalDevice = {
            deviceSerialNum: deviceSerialNum || null,
            productDescription: productDescription || null,
            lotOrBatchNum: lotOrBatchNum || null,
            mddClass: mddClass || null,
            procedure: {
              id: procedure?.archetype_node_id || null,
              code: procedure?.description?.items.find(
                (item: any) => item.name.value === 'Procedure name'
              )?.value?.defining_code?.code_string || null,
              description: procedure?.description?.items.find(
                (item: any) => item.name.value === 'Procedure name'
              )?.value?.value || null,
            },
            operation: {
              id: composition?.archetype_node_id || null,
              identifier: composition?.protocol?.items.find(
                (item: any) => item.name.value === 'Operation identifier'
              )?.value?.id || null,
              dateTime: composition?.time?.value || null,
            },
          };

          // Add the mapped device to the results array
          medicalDevices.push(mappedDevice);
        });

      });
    });

    return medicalDevices;
  }

}
