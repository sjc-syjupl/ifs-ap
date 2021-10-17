import { IfsDataType } from "../Buffer/MarshalObject"
import { SqlOneResponse } from "./PlSqlCommand"
import { AttachmentResponse } from "./AttachmentsFileTransfer"

export interface AttachmentKeys{
    docClass : string,
    docNo : string,
    docSheet : string,
    docRev: string,
    docType: string;
    fileNo: number,
    fileName: string,
    title? : string
}
    

export interface AttachmentsInterface {
    GetKeys(luName: string, keyRef: string): Promise<AttachmentKeys[]>;
    GetFirstKey(luName: string, keyRef: string): Promise<AttachmentKeys | undefined>;

    GetFile(docKeysParam: AttachmentKeys): Promise<AttachmentResponse>;
    AddFile(docClass: string, title: string, fileName: string, fileData: ArrayBuffer, luName?: string, keyRef?: string,): Promise<AttachmentResponse>;
    ModifyFile(docKeysParam: AttachmentKeys, fileName: string, fileData: ArrayBuffer): Promise<AttachmentResponse>;
    RemoveFile(docKeysParam: AttachmentKeys): Promise<AttachmentResponse>;

    AddReference(docKeysParam: AttachmentKeys, luName: string, keyRef: string): Promise<AttachmentResponse>;
    RemoveReference(docKeysParam: AttachmentKeys, luName: string, keyRef: string): Promise<AttachmentResponse>;

    InfoToKeys(info: SqlOneResponse): AttachmentKeys[];
    InfoToKey(info: (SqlOneResponse | IfsDataType)): (AttachmentKeys | undefined);
    GetInfo(luName: string, keyRef: string): Promise<SqlOneResponse>;
    /*
    ModifyInfo(docKeysParam: AttachmentKeys, info: {
        title?: string, doc_rev_text?: string, language_code?: string,
        correspondent?: string, reference?: string,
        description1?: string, description2?: string, description3?: string, description4?: string, description5?: string, description6?: string, info?: string
    }): Promise<SqlOneResponse>;
    */
}

