import { SqlOneResponse } from "./PlSqlCommandTypes"
import { IfsDataType } from "../Buffer/MarshalObject"
import { AttachmentsFileTransfer, AttachmentResponse } from "./AttachmentsFileTransfer"
import { Connection } from "./Connection"
import { AttachmentsInterface, AttachmentKeys } from "./AttachmentsInterface"
import { _PlSqlCommand } from "./PlSqlCommand"
import { IsEmpty } from "./Util"

export class Attachments extends AttachmentsFileTransfer implements AttachmentsInterface {

    public async CloseTempSession(): Promise<SqlOneResponse> {
        const endSessionQuery = new _PlSqlCommand(this._connection, "END_CLIENT_SESSION", {}, {'clientSessionId':this._clientSessionId} );
        if (this._clientSessionId) {
            await endSessionQuery.Execute()
            this._clientSessionId = "";
        }
        return endSessionQuery.response as SqlOneResponse;
    }
    
    public async GetInfo(luName: string, keyRef: string, onlyFirst: boolean = false): Promise<SqlOneResponse> {
        return await (this._connection as Connection).Sql(
            `SELECT D.DOC_CLASS, D.DOC_NO, D.DOC_SHEET, D.DOC_REV, F.FILE_NO, F.DOC_TYPE, F.FILE_TYPE, F.USER_FILE_NAME FILE_NAME,
        I.TITLE, I.DOC_REV_TEXT, I.LANGUAGE_CODE, I.FORMAT_SIZE, I.DT_CHG, I.USER_SIGN, I.DT_CRE, I.USER_CREATED, I.ORIGINAL_CREATOR, I.ORIGINAL_CREATION_DATE, 
        I.CORRESPONDENT, I.REFERENCE, 
        I.DESCRIPTION1, I.DESCRIPTION2, I.DESCRIPTION3, I.DESCRIPTION4, I.DESCRIPTION5, I.DESCRIPTION6, I.INFO, 
        I.OBJSTATE, I.STATE 
   FROM &AO.DOC_REFERENCE_OBJECT d 
   JOIN &AO.EDM_FILE f ON d.DOC_CLASS = f.DOC_CLASS AND d.DOC_NO = f.DOC_NO AND d.DOC_SHEET = f.DOC_SHEET AND d.DOC_REV = f.DOC_REV
   JOIN &AO.DOC_ISSUE i ON d.DOC_CLASS = i.DOC_CLASS AND d.DOC_NO = i.DOC_NO AND d.DOC_SHEET = i.DOC_SHEET AND d.DOC_REV = i.DOC_REV
  WHERE d.LU_NAME = :luName 
    AND d.KEY_REF = :keyRef`
                + (onlyFirst ? ' AND ROWNUM = 1' : '')
            ,
            { "luName": luName, "keyRef": keyRef });
    }

    public InfoToKeys(info: SqlOneResponse ): AttachmentKeys[] {
        if (!info.ok || info.result.length == 0)
            return [];
        return info.result.map( x => this.FixDocKeysName(x) );
    }

    public InfoToKey(info: (SqlOneResponse | IfsDataType)): (AttachmentKeys | undefined ) {
        if ('result' in info) {
            const response = info as SqlOneResponse;
            if (!response.ok || response.result.length == 0)
                return undefined;
            return this.InfoToKeys(response)[0];
        } else {
            return this.FixDocKeysName(info);
        }
    }

    public async GetKeys(luName: string, keyRef: string): Promise<AttachmentKeys[]> {
        const info = await this.GetInfo(luName, keyRef);
        return this.InfoToKeys(info);
    }

    public async GetFirstKey(luName: string, keyRef: string): Promise<AttachmentKeys | undefined> {
        const info = await this.GetInfo(luName, keyRef, true);
        return this.InfoToKey( info )
    }

    public async GetFile(docKeysParam: AttachmentKeys): Promise<AttachmentResponse> {
        const docKeys = this.FixDocKeysName(docKeysParam);
        const getFileSession = new Attachments(this.connection);
        return await getFileSession.Download(docKeys.docClass, docKeys.docNo, docKeys.docSheet,
            docKeys.docRev, docKeys.docType, docKeys.fileNo, docKeys.fileName)
    }
    
    public async GetFilesByRef(luName: string, keyRef: string): Promise<AttachmentResponse[]>{
        const keys = await this.GetKeys(luName, keyRef);
        if (!IsEmpty(keys)) {
            return (await Promise.all( keys.map( key => this.GetFile( key ) ) )) as AttachmentResponse[];
        }
        return [];
    }

    public async AddFile(docClass: string, title: string, fileName: string, fileData: ArrayBuffer, luName?: string, keyRef?: string, ): Promise<AttachmentResponse> {
        const docKeys = await this.AttachEmptyDoc(docClass, title, fileName, luName||"", keyRef||"" );
        return await this.ModifyFile(this.FixDocKeysName(docKeys), fileName, fileData);
    }

    public async ModifyFile(docKeysParam: AttachmentKeys, fileName: string, fileData: ArrayBuffer): Promise<AttachmentResponse> {
        const docKeys = this.FixDocKeysName(docKeysParam);
        const getFileSession = new Attachments(this.connection);
        getFileSession.OpenTempSession()
        const checkOut = await getFileSession.CheckOut(docKeys);
        if (!checkOut.ok) return this.ErrorResponse(checkOut.errorText);

        const upload = await getFileSession.Upload(docKeys.docClass, docKeys.docNo, docKeys.docSheet,
            docKeys.docRev, docKeys.docType, docKeys.fileNo, fileName, fileData)
        if (!upload.ok) return this.ErrorResponse(upload.errorText);

        const checkIn = await getFileSession.CheckIn(docKeys);
        getFileSession.CloseTempSession().then(_ => { } );           
        return checkIn;
    }

    public async RemoveFile(docKeysParam: AttachmentKeys ): Promise<AttachmentResponse> {
        const docKeys = this.FixDocKeysName(docKeysParam);
        return await this.DeleteFile(docKeys.docClass, docKeys.docNo, docKeys.docSheet,
            docKeys.docRev, docKeys.docType, docKeys.fileNo);
    }

    
    public async AddReference(docKeysParam: AttachmentKeys, luName: string, keyRef: string): Promise<AttachmentResponse> {
        const docKeys = this.FixDocKeysName(docKeysParam);
        const detach = await (this._connection as Connection).PlSql( 
    `DECLARE
        objid_      VARCHAR2(2000);
        
        CURSOR get_objid IS
        SELECT objid
        FROM &AO.DOC_REFERENCE_OBJECT
        WHERE doc_class = :docClass
        AND doc_no = :docNo
        AND doc_sheet = :docSheet
        AND doc_rev = :decRev
        AND lu_name = :luName
        AND key_ref = :keyRef;
    BEGIN
        OPEN get_objid;
        FETCH get_objid INTO objid_;
        CLOSE get_objid;
        IF objid_ IS NULL THEN
            &AO.DOC_REFERENCE_OBJECT_API.Create_New_Reference__( :luName, :keyRef, :docClass, :docNno, :docSheet, :docRev);
            COMMIT;
        END IF;
    END;`,
            {"docClass": docKeys.docClass, "docNo": docKeys.docNo, "docSheet": docKeys.docSheet, "docRev": docKeys.docRev, "luName": luName, "keyRef": keyRef },
            );
        if (!detach.ok) return this.ErrorResponse(detach.errorText);
        return {
            ok: true,
            errorText: "",
            luName: luName,
            keyRef: keyRef,
            docClass: docKeys.docClass,
            docNo: docKeys.docNo,
            docSheet: docKeys.docSheet,
            docRev: docKeys.docRev,
            fileNo: docKeys.fileNo,
            fileName: docKeys.fileName
        } as AttachmentResponse;
    }

    
    public async RemoveReference(docKeysParam: AttachmentKeys, luName: string, keyRef: string): Promise<AttachmentResponse> {
        const docKeys = this.FixDocKeysName(docKeysParam);
        const detach = await (this._connection as Connection).PlSql( 
    `DECLARE
        info_       VARCHAR2(2000);
        objid_      VARCHAR2(2000);
        objversion_ VARCHAR2(2000);
        
        CURSOR get_objid IS
        SELECT objid, objversion 
        FROM &AO.DOC_REFERENCE_OBJECT
        WHERE doc_class = :docClass
        AND doc_no = :docNo
        AND doc_sheet = :docSheet
        AND doc_rev = :decRev
        AND lu_name = :luName
        AND key_ref = :keyRef;
    BEGIN
        OPEN get_objid;
        FETCH get_objid INTO objid_, objversion_;
        CLOSE get_objid;
        IF objid_ IS NOT NULL THEN
            &AO.DOC_REFERENCE_OBJECT_API.Remove__(info_, objid_, objversion_, 'DO' );
            COMMIT;
        END IF;
    END;`,
            {"docClass": docKeys.docClass, "docNo": docKeys.docNo, "docSheet": docKeys.docSheet, "docRev": docKeys.docRev, "luName": luName, "keyRef": keyRef },
            );
        if (!detach.ok) return this.ErrorResponse(detach.errorText);
        return {
            ok: true,
            errorText: "",
            luName: "",
            keyRef: "",
            docClass: docKeys.docClass,
            docNo: docKeys.docNo,
            docSheet: docKeys.docSheet,
            docRev: docKeys.docRev,
            fileNo: docKeys.fileNo,
            fileName: docKeys.fileName
        } as AttachmentResponse;
    }
    
    private async AttachEmptyDoc(docClass: string, title: string, fileName: string, luName: string, keyRef: string ): Promise<AttachmentResponse> {
        const newAttachment = await (this._connection as Connection).PlSql( 
    `DECLARE
        attr_       VARCHAR2(32000);
        doc_attr_   VARCHAR2(32000);
        info_       VARCHAR2(2000);
    
        doc_class_ VARCHAR2(12);
        doc_no_    VARCHAR2(120);
        doc_sheet_ VARCHAR2(10) := '1';
        doc_rev_   VARCHAR2(6) := 'A1';
        doc_type_  VARCHAR2(30);
        file_type_ VARCHAR2(30);
        file_extension_ VARCHAR2(260);
        title_     VARCHAR2(260);
        file_name_ VARCHAR2(260);
        lu_name_   VARCHAR2(10);
        key_ref_   VARCHAR2(500);
        language_code_ VARCHAR2(2);
        doc_format_ VARCHAR2(6);
        local_path_ VARCHAR2(260);
    BEGIN
        doc_class_ := :docClass;
        file_name_ := :fileName;
        title_ := :title;
        lu_name_ := :luName;
        key_ref_ := :keyRef;
        
        file_extension_ := upper(substr(file_name_, instr(file_name_, '.', -1) + 1));
        file_type_ := &AO.edm_application_api.Get_File_Type(file_extension_);
        doc_type_ := &AO.edm_application_api.Get_Doc_Type_From_Ext(file_extension_);
        IF title_ IS NULL THEN
            titel_ := substr(file_name_, 1, length(file_name_) - length(file_extension_) - 1);
        END IF;
    
        &AO.Client_Sys.Clear_Attr(attr_);
        &AO.Client_Sys.Add_To_Attr('DOC_CLASS', doc_class_, attr_);
        &AO.Client_Sys.Add_To_Attr('DOC_SHEET', doc_sheet_, attr_);
        &AO.Client_Sys.Add_To_Attr('DOC_REV', doc_rev_, attr_);
        
        &AO.Client_Sys.Clear_Attr(doc_attr_);
        &AO.Client_Sys.Add_To_Attr('TITLE', title_, doc_attr_);
        &AO.Client_Sys.Add_To_Attr('STRUCTURE', '0', doc_attr_);
        
        &AO.Doc_Issue_API.Create_Title_And_Rev__(info_, attr_, doc_attr_);
        doc_no_ := &AO.Client_Sys.get_item_value('DOC_NO', attr_);
        
        IF (lu_name_ IS NOT NULL) AND (key_ref_ IS NOT NULL) THEN
            &AO.DOC_REFERENCE_OBJECT_API.Create_New_Reference__(lu_name_, key_ref_, doc_class_, doc_no_, doc_sheet_, doc_rev_);
        END IF;
        &AO.EDM_FILE_API.Create_File_Reference(local_path_,
                                                doc_class_, doc_no_, doc_sheet_, doc_rev_, doc_type_, file_type_,
                                                local_path_ => '', 
                                                create_new_file_name_ => 1);
        :docSheet := doc_sheet;
        :docNo := doc_no_;
        :docRev := doc_rev_;
        :fileNo := 1;
        COMMIT;
    END;`,
            {"docClass": docClass, "docNo": "", "docSheet": "", "docRev": "", "fileNo": 0, "luName": luName, "keyRef": keyRef, "fileName": fileName, "title": title }
            );
        if (!newAttachment.ok) return this.ErrorResponse(newAttachment.errorText);
        return {
            ok: true,
            errorText: "",
            luName: luName,
            keyRef: keyRef,
            docClass: docClass,
            docNo: "docNo" in newAttachment.bindings ? newAttachment.bindings.docNo : "",
            docSheet: "docNo" in newAttachment.bindings ? newAttachment.bindings.docSheet : "",
            docRev: "docNo" in newAttachment.bindings ? newAttachment.bindings.docRev : "",
            fileNo: "docNo" in newAttachment.bindings ? newAttachment.bindings.fileNo : 0,
            fileName: fileName
        } as AttachmentResponse;
    }

    private async CheckOut(docKeysParam: AttachmentKeys ): Promise<AttachmentResponse> {
        const docKeys = this.FixDocKeysName(docKeysParam);
        const checkOut = await (this._connection as Connection).PlSql(
    `DECLARE
        doc_class_ VARCHAR2(12);
        doc_no_    VARCHAR2(120);
        doc_sheet_ VARCHAR2(10);
        doc_rev_   VARCHAR2(6);
        doc_type_  VARCHAR2(30);
        file_no_   NUMBER;
        file_type_ VARCHAR2(30);
        file_name_ VARCHAR2(260);
    BEGIN
        doc_class_ := :docClass;
        doc_no_ := :docNo;
        doc_sheet_ := :docSheet;
        doc_rev_ := :decRev;
        doc_type_ := :docType;
        file_no_ := :fileNo;
        file_name_ := :fileName;
        &AO.EDM_FILE_API.Set_File_State(doc_class_,
                                        doc_no_,
                                        doc_sheet_,
                                        doc_rev_,
                                        doc_type_,
                                        file_no_,
                                        state_ => 'CheckOut',
                                        local_path_ => '');
        &AO.EDM_FILE_API.Set_Local_File_Name_(doc_class_,
                                            doc_no_,
                                            doc_sheet_,
                                            doc_rev_,
                                            doc_type_,
                                            file_name_);
        &AO.EDM_FILE_API.Set_File_State(doc_class_,
                                        doc_no_,
                                        doc_sheet_,
                                        doc_rev_,
                                        doc_type_,
                                        file_no_,
                                        state_ => 'StartCheckIn',
                                        local_path_ => '');
        COMMIT;
    END;`.replace( /  +/g, ' ' ), 
            { "docClass": docKeys.docClass, "docNo": docKeys.docNo, "docSheet": docKeys.docSheet, "docRev": docKeys.docRev, "docType": docKeys.docType, "fileNo": docKeys.fileNo, "fileName": docKeys.fileName }
            );
        if (!checkOut.ok) return this.ErrorResponse(checkOut.errorText);
        return {
            ok: true,
            errorText: "",
            docClass: docKeys.docClass,
            docNo: docKeys.docNo,
            docSheet: docKeys.docSheet,
            docRev: docKeys.docRev,
            fileNo: docKeys.fileNo,
            fileName: docKeys.fileName
        } as AttachmentResponse;
    }

    private async CheckIn(docKeysParam: AttachmentKeys): Promise<AttachmentResponse> {
        const docKeys = this.FixDocKeysName(docKeysParam);
        const checkIn = await (this._connection as Connection).PlSql(
    `DECLARE
        doc_class_ VARCHAR2(12);
        doc_no_    VARCHAR2(120);
        doc_sheet_ VARCHAR2(10);
        doc_rev_   VARCHAR2(6);
        doc_type_  VARCHAR2(30);
        file_no_   NUMBER;
        file_type_ VARCHAR2(30);
        file_name_ VARCHAR2(260);
    BEGIN
        doc_class_ := :docClass;
        doc_no_ := :docNo;
        doc_sheet_ := :docSheet;
        doc_rev_ := :decRev;
        doc_type_ := :docType;
        file_no_ := :fileNo;
        file_name_ := :fileName;
        &AO.EDM_FILE_API.Set_File_State(doc_class_,
                                        doc_no_,
                                        doc_sheet_,
                                        doc_rev_,
                                        doc_type_,
                                        file_no_,
                                        state_ => 'FinishCheckIn',
                                        local_path_ => '');
        COMMIT;
    END;`.replace( /  +/g, ' ' ), 
            { "docClass": docKeys.docClass, "docNo": docKeys.docNo, "docSheet": docKeys.docSheet, "docRev": docKeys.docRev, "docType": docKeys.docType, "fileNo": docKeys.fileNo, "fileName": docKeys.fileName }
            );
        if (!checkIn.ok) return this.ErrorResponse(checkIn.errorText);
        return {
            ok: true,
            errorText: "",
            docClass: docKeys.docClass,
            docNo: docKeys.docNo,
            docSheet: docKeys.docSheet,
            docRev: docKeys.docRev,
            fileNo: docKeys.fileNo,
            fileName: docKeys.fileName
        } as AttachmentResponse;
    }

    private FixDocKeysName(docKeys: { [k: string]: any }): AttachmentKeys {
        if ("docClass" in docKeys) {
            const docKeys2 = docKeys as AttachmentKeys;
            return {
                docClass: docKeys2.docClass || "",
                docNo: docKeys2.docNo || "",
                docSheet: docKeys2.docSheet || "",
                docRev: docKeys2.docRev || "",
                docType: docKeys2.docType || "",
                fileNo: docKeys2.fileNo || 0,
                fileName: docKeys2.fileName || "",
                title: docKeys2.title || "",
            } as AttachmentKeys;
            
        } else {
            return {
                docClass: docKeys.DOC_CLASS || "",
                docNo: docKeys.DOC_NO || "",
                docSheet: docKeys.DOC_SHEET || "",
                docRev: docKeys.DOC_REV || "",
                docType: docKeys.DOC_TYPE || "",
                fileNo: docKeys.FILE_NO || 0,
                fileName: docKeys.FILE_NAME || "",
                title: docKeys.TITLE || ""
            } as AttachmentKeys;            
        }
    }
/*
    public async ModifyInfo(docKeysParam: AttachmentKeys, info: {
                    title? : string, doc_rev_text? : string, language_code? : string,
                    correspondent? : string, reference? : string, 
                    description1? : string, description2? : string, description3? : string, description4? : string, description5? : string, description6? : string, info? : string 
    } ) : Promise<SqlOneResponse> {
        
    }
*/    
}
