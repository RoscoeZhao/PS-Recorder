import {getDocumentName} from './phxs-utils';
export {getDocumentName};

export const helloStr = (str: string) => {
  alert(`ExtendScript received a string: ${str}`);
  return str;
};

export const cepAlert = (message: string, title?: string) => {
  alert(message, title, false);
}

//@ts-ignore
export function sendToGenerator(param: any) {
  try {
      var generatorDesc = new ActionDescriptor();
      generatorDesc.putString(stringIDToTypeID("name"), "com.roscoe.ps-recorder-generator");
      generatorDesc.putString(stringIDToTypeID("sampleAttribute"), param);
      executeAction(stringIDToTypeID("generateAssets"), generatorDesc, DialogModes.NO);
  } catch (e: any) {
      alert(e);
  }
}
