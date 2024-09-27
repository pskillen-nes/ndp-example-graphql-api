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

export class MddhWrapper extends AbstractServiceWrapper {
  constructor() {
    super('Medical Device Registry');
  }

  getMedicalDevicesByPatient = async (_: any, args: { [k: string]: string }) => {
    const chi = args['chiNumber'];


    let compositionsData: DeviceSearchResponseType;
    try {
      const patientResponse = await mddh.getEhrBySubject(chi);
      const patient = patientResponse.data as OpenEhrEHRBodyCanonical;
      if (!patientResponse || patientResponse.statusCode !== 200) {
        const response = this.handleNotFoundError('Patient not found', {chiNumber: chi});
        return response;
      }

      // List all compositions for the patient's EHR
      const listCompositionsResponse = await mddh.listCompositionsForEhr(patient.ehr_id!.value);
      compositionsData = listCompositionsResponse.data as DeviceSearchResponseType;
    } catch (error) {
      return this.handleError(error as Error | string);
    }


    // Get an array of compositions
    const compositions = compositionsData.deviceRecords.map(dr => dr.composition);

    // Map the compositions to extract the devices
    const devices = this.mapMedicalDevices(compositions);

    return devices || [];
  };

  // Function to map an array of compositions to devices
  private mapMedicalDevices(compositions: any[]): any[] {
    return compositions.flatMap((composition: any) => {
      // Handle each composition and map devices
      return this.mapCompositionToDevices(composition);
    });
  }

  // Helper function to map a single composition to devices
  private mapCompositionToDevices(composition: any): any[] {
    // Check for `content` in composition and map through it
    return composition.content?.flatMap((action: any) => {
      if (action.name?.value === "Procedure") {
        // Map procedures to extract device information
        return this.mapProcedureToDevices(action);
      }
      return [];
    }) || [];
  }

  // Helper function to map procedure data to devices
  private mapProcedureToDevices(procedure: any): any[] {
    // Find the "Device Details" cluster in the procedure description
    return procedure.description?.items?.flatMap((item: any) => {
      if (item.name?.value === "Device Details") {
        return this.extractDeviceDetails(item);
      }
      return [];
    }) || [];
  }

  // Helper function to extract device details from the "Device Details" cluster
  private extractDeviceDetails(deviceCluster: any): any[] {
    const device = {
      productDescription: this.getItemValue(deviceCluster, "Product description"),
      lotOrBatchNum: this.getItemValue(deviceCluster, "Device Lot or Batch number"),
      deviceSerialNum: this.getItemValue(deviceCluster, "Device Serial number"),
      udi: this.getItemValue(deviceCluster, "Unique device identifier (UDI)"),
      mddClass: this.getItemValue(deviceCluster, "Class"),
      anatomicalLocation: this.getItemValueFromCluster(deviceCluster, "Anatomical location", "Body site name")
    };

    return [device];
  }

  // Helper function to get value from an ELEMENT item
  private getItemValue(cluster: any, itemName: string): string | null {
    const item = cluster.items?.find((i: any) => i.name?.value === itemName);
    return item?.value?.value || null;
  }

  // Helper function to get a value from a nested cluster
  private getItemValueFromCluster(cluster: any, clusterName: string, itemName: string): string | null {
    const subCluster = cluster.items?.find((i: any) => i.name?.value === clusterName);
    if (subCluster?.items) {
      return this.getItemValue(subCluster, itemName);
    }
    return null;
  }

  // // Function to map EHR data to medical devices
  // private mapMedicalDevices(ehrData: any): any[] {
  //   // Map through the content array, filtering for procedure actions
  //   return ehrData.content?.flatMap((action: any) => {
  //     if (action.name?.value === "Procedure") {
  //       // Map procedures to extract device information
  //       return this.mapProcedureToDevices(action);
  //     }
  //     return [];
  //   }) || [];
  // }
  //
  // // Helper function to map procedure data to devices
  // private mapProcedureToDevices(procedure: any): any[] {
  //   // Find the device cluster in the procedure description
  //   return procedure.description?.items?.flatMap((item: any) => {
  //     if (item.name?.value === "Device Details") {
  //       // Map the device details and other metadata to the response structure
  //       return {
  //         productDescription: item.items?.find((i: any) => i.name?.value === "Product description")?.value?.value || null,
  //         deviceSerialNum: item.items?.find((i: any) => i.name?.value === "Device Serial number")?.value?.value || null,
  //         lotOrBatchNum: item.items?.find((i: any) => i.name?.value === "Device Lot or Batch number")?.value?.value || null,
  //         udi: item.items?.find((i: any) => i.name?.value === "Unique device identifier (UDI)")?.value?.id || null,
  //         mddClass: item.items?.find((i: any) => i.name?.value === "Class")?.value?.value || null,
  //         anatomicalLocation: this.mapAnatomicalLocation(item.items),
  //         procedure: {
  //           name: procedure.description?.items?.find((i: any) => i.name?.value === "Procedure name")?.value?.value || null,
  //           code: procedure.description?.items?.find((i: any) => i.name?.value === "Procedure name")?.value?.defining_code?.code_string || null,
  //           procedureType: procedure.description?.items?.find((i: any) => i.name?.value === "Procedure type")?.value?.value || null
  //         },
  //         operation: {
  //           id: procedure.protocol?.items?.find((i: any) => i.name?.value === "Operation identifier")?.value?.id || null,
  //           dateTime: procedure.time?.value || null
  //         }
  //       };
  //     }
  //     return [];
  //   }) || [];
  // }

  // // Helper function to map anatomical location data
  // private mapAnatomicalLocation(items: any[]): any {
  //   const anatomicalCluster = items?.find((i: any) => i.name?.value === "Anatomical location");
  //   if (anatomicalCluster) {
  //     return {
  //       bodySite: anatomicalCluster.items?.find((i: any) => i.name?.value === "Body site name")?.value?.value || null,
  //       laterality: anatomicalCluster.items?.find((i: any) => i.name?.value === "Laterality")?.value?.value || null,
  //     };
  //   }
  //   return null;
  // }
}
