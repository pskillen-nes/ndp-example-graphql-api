export interface MedicalDevice {
  deviceSerialNum: string;
  productDescription: string;
  lotOrBatchNum: string;
  mddClass: string;
  procedure: {
    code: string;
    description: string;
  };
  operation: {
    identifier: string;
    dateTime: string;
  };
}
