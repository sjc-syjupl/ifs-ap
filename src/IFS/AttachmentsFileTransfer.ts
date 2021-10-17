import { ConnectionInterface } from "./ConnectionInterface"
import { _Message } from "./Message"
import { fetch } from "cross-fetch";
import { MasrshalObject, IfsDataType, IfsDataObjectType  } from "../Buffer/MarshalObject"
import { UTF8Length } from "../Buffer/utf8";
import { assert } from "console";
import { Delay } from "./Util"

export interface AttachmentResponse{
    ok: boolean,
    errorText: string,

    luName?: string,
    keyRef?: string,
    
    docClass? : string,
    docNo? : string,
    docSheet? : string,
    docRev?: string,
    docType?: string;
    fileNo? : number,
    
    fileName? : string,
    fileData? : ArrayBuffer
}

export abstract class AttachmentsFileTransfer extends _Message {
    private static FileTransferIntercface = "FileOperationHelper";
    private static CreateTicketOperation = "CreateTicket";
    private static DeleteTicketOperation = "DeleteTicket";
    private static ReadFileOperation = "ReadFile";
    private static WriteFileOperation = "WriteFileDeleteTicket";
    private static DeleteFileOperation = "DeleteFile";

    private static FileServiceInterfaceOperation = "ifsfileservice/FileTransfer";

    protected _docClass = "";
    protected _docNo= "";
    protected _docSheet= "";
    protected _docRev= "";
    protected _fileNo = 0;
    protected _docType= "";
    //protected _fileType = "";
    protected _fileName = "";

    protected _ticketId = "";


    constructor (connection: ConnectionInterface) {
        super(connection);
        this._interface = AttachmentsFileTransfer.FileTransferIntercface;
        this._operation = "";
    }

    private async CreateTicket() : Promise<AttachmentResponse> {
        this._operation = AttachmentsFileTransfer.CreateTicketOperation;
        const response = await this.Execute();
        return response;
    }

    private async DeleteTicket(): Promise<AttachmentResponse> {
        this._operation = AttachmentsFileTransfer.DeleteTicketOperation;
        const response =  await this.Execute();
        this._ticketId = "";
        return response;
    }

    protected async GetDownloadTicket(docClass: string, docNo: string, docSheet: string, docRev: string, docType: string, fileNo: number, ticketId :string, fileName: string) : Promise<AttachmentResponse> {
        this._operation = AttachmentsFileTransfer.ReadFileOperation;
        this._docClass = docClass;
        this._docNo = docNo;
        this._docSheet = docSheet;
        this._docRev = docRev;
        this._docType = docType;
        this._fileNo = fileNo;
        this._ticketId = ticketId;
        this._fileName = fileName;
        return await this.Execute();
    }

    protected async GetUploadTicket(docClass: string, docNo: string, docSheet: string, docRev: string, docType: string, fileNo: number, ticketId :string, fileName: string) : Promise<AttachmentResponse> {
        this._operation = AttachmentsFileTransfer.WriteFileOperation;
        this._docClass = docClass;
        this._docNo = docNo;
        this._docSheet = docSheet;
        this._docRev = docRev;
        this._docType = docType;
        this._fileNo = fileNo;
        this._ticketId = ticketId;
        this._fileName = fileName;
        return await this.Execute();
    }


    public SizeOfRequestBody(): number {
        switch (this._operation) {
            case AttachmentsFileTransfer.CreateTicketOperation:
                return 6;
            case AttachmentsFileTransfer.DeleteTicketOperation:
                return 48 + this._ticketId.length;
            case AttachmentsFileTransfer.ReadFileOperation:
                return 130 + UTF8Length(this._docClass) + this._docNo.length + this._docSheet.length + this._docRev.length + this._docType.length + this._fileNo.toString().length + this._ticketId.length + UTF8Length(this._fileName);
            case AttachmentsFileTransfer.WriteFileOperation:
                return 151 + UTF8Length(this._docClass) + this._docNo.length + this._docSheet.length + this._docRev.length + this._docType.length + this._fileNo.toString().length + this._ticketId.length + UTF8Length(this._fileName);
            case AttachmentsFileTransfer.DeleteFileOperation:
                return 113 + UTF8Length(this._docClass) + this._docNo.length + this._docSheet.length + this._docRev.length + this._docType.length + this._fileNo.toString().length;
            default:
                return 220;
        }
    }

    public CreateRequestBody(): IfsDataType {        
        let request: IfsDataType;
        if (this._operation === AttachmentsFileTransfer.CreateTicketOperation) {
            request = [
                        {
                            "buffer": true,
                            "value": [
                                {
                                    "buffer": true,
                                    "value": []
                                }
                            ]
                        }
                    ];
        } else if (this._operation === AttachmentsFileTransfer.DeleteTicketOperation) {
            request = [
                        {
                            "name": "FILEOPERATIONHELPER_READFILE",
                            "buffer": true,
                            "value": [
                                {
                                    "buffer": true,
                                    "value": [
                                        {
                                            "name": "TICKET",
                                            "type": "LPT",
                                            "value": this._ticketId
                                        }
                                    ]
                                }
                            ]
                        }
                    ];
        } else if (this._operation === AttachmentsFileTransfer.ReadFileOperation || this._operation === AttachmentsFileTransfer.WriteFileOperation) {
            request = [
                        {
                            "buffer": true,
                            "value": [
                                {
                                    "buffer": true,
                                    "value": [
                                        {
                                            "name": "DOC_CLASS",
                                            "type": "LPT",
                                            "value": this._docClass
                                        },
                                        {
                                            "name": "DOC_NO",
                                            "type": "LPT",
                                            "value": this._docNo
                                        },
                                        {
                                            "name": "DOC_SHEET",
                                            "type": "LPT",
                                            "value": this._docSheet
                                        },
                                        {
                                            "name": "DOC_REV",
                                            "type": "LPT",
                                            "value": this._docRev
                                        },
                                        {
                                            "name": "DOC_TYPE",
                                            "type": "LPT",
                                            "value": this._docType
                                        },
                                        {
                                            "name": "FILE_NO",
                                            "type": "N",
                                            "value": this._fileNo
                                        },
                                        {
                                            "name": "TICKET",
                                            "type": "LPT",
                                            "value": this._ticketId
                                        },
                                        {
                                            "name": "CHECK_OUT_FILE_NAME",
                                            "type": "LPT",
                                            "value": this._fileName
                                        },
                                        ... (this._operation === AttachmentsFileTransfer.WriteFileOperation ? [
                                            {
                                                "name": "DELETE_TICKET",
                                                "type": "B",
                                                "value": "TRUE",
                                            }
                                        ] : []),
                                    ]
                                }
                            ]
                        }
                    ];
        } else if (this._operation === AttachmentsFileTransfer.DeleteFileOperation) {
            request = [
                        {
                            "buffer": true,
                            "value": [
                                {
                                    "buffer": true,
                                    "value": [
                                        {
                                            "name": "DOC_CLASS",
                                            "type": "LPT",
                                            "value": this._docClass
                                        },
                                        {
                                            "name": "DOC_NO",
                                            "type": "LPT",
                                            "value": this._docNo
                                        },
                                        {
                                            "name": "DOC_SHEET",
                                            "type": "LPT",
                                            "value": this._docSheet
                                        },
                                        {
                                            "name": "DOC_REV",
                                            "type": "LPT",
                                            "value": this._docRev
                                        },
                                        {
                                            "name": "DOC_TYPE",
                                            "type": "LPT",
                                            "value": this._docType
                                        },
                                        {
                                            "name": "FILE_NO",
                                            "type": "N",
                                            "value": this._fileNo
                                        },
                                        {
                                            "name": "IS_X_EDM_TYPE",
                                            "type": "B",
                                            "value": "FALSE"
                                        },
                                    ]
                                }
                            ]
                        }
                    ];
        } else {
            request = []
        }            
        return request;
    }

    protected ErrorResponse(errorText: string ): AttachmentResponse {
        return { ok: false, errorText: errorText };
    }

    protected _ErrorResponse(errorText: string, fileInfo: Object ): AttachmentResponse {
        if (this._clientSessionId) {
            this.CloseTempSession().then(_ => { } );
        }
        return { ...fileInfo, ok: false, errorText: errorText };
    }

    protected async Execute(): Promise<AttachmentResponse> {
        return (await this._ExecuteMessage()) as AttachmentResponse;
    };

    public MapResponse(ifsData: IfsDataType): AttachmentResponse {
        let result: AttachmentResponse;
        if (this._operation === AttachmentsFileTransfer.CreateTicketOperation) {
            const tmpResultData = MasrshalObject.ExtractSubobject(ifsData, [
                1,
                { "name": "FILEOPERATIONHELPER_CREATETICKET", "buffer": true },
                { "name": "DATA", "type": "FILEOPERATIONHELPER.FILEOPERATIONHELPER_CREATETICKET" },
                { "name": "__RESULT", "type": "T" }]);
            if (tmpResultData) {
                this._ticketId = (tmpResultData as IfsDataObjectType).value;
                result = { ok: true, errorText: "" };
            } else {
                return this.ErrorResponse("Error in returned data. I can't find a record with ticket.");
            }
        } else {
            if (this._operation != AttachmentsFileTransfer.ReadFileOperation && this._operation != AttachmentsFileTransfer.WriteFileOperation) {
                this._ticketId = "";
            }
            result = { ok: true, errorText: "" };
        }
        return result;
;
    }

    protected async Download(docClass: string, docNo: string, docSheet: string, docRev: string, docType: string, fileNo: number, fileName: string): Promise<AttachmentResponse> {
        this.OpenTempSession()
        const ticket = await this.CreateTicket();
        const fileInfo = { docClass: docClass, docNo: docNo, docSheet: docSheet, docRev: docRev, docType: docType, fileNo: fileNo };
        if (!ticket.ok || !this._ticketId) return this._ErrorResponse('CreateTicket: '+ticket.errorText, fileInfo);
        
        const maxTry = 50; //try for 5 seconds
        for (let i = 1; i <= maxTry; i++){
            const readFile = await this.GetDownloadTicket(docClass, docNo, docSheet, docRev, docType, fileNo, this._ticketId, fileName);
            if (readFile.ok) break;
            if (i === maxTry) {
                return this._ErrorResponse('GetDownloadTicket: '+readFile.errorText, fileInfo);            
            } else {
                await Delay(100);
            }
        }

        const fileData = await this.DownloadFile(this._ticketId, fileName);
        
        this.DeleteTicket().then( _ => {
            this.CloseTempSession().then(_ => { } );           
        });

        return { ...fileInfo, ok: true, errorText: "", fileName: fileName, fileData: fileData };
    }

    protected async Upload(docClass: string, docNo: string, docSheet: string, docRev: string, docType: string, fileNo: number, fileName: string, fileData: ArrayBuffer) : Promise<AttachmentResponse> {
        const ticket = await this.CreateTicket();
        const fileInfo = { docClass: docClass, docNo: docNo, docSheet: docSheet, docRev: docRev, docType: docType, fileNo: fileNo };
        if (!ticket.ok || !this._ticketId) return this._ErrorResponse(ticket.errorText, fileInfo);

        await this.UploadFile(this._ticketId, fileName, fileData);

        const writeFile = await this.GetUploadTicket(docClass, docNo, docSheet, docRev, docType, fileNo, this._ticketId, fileName);
        this._ticketId = "";
        if (!writeFile.ok)
            return this._ErrorResponse(writeFile.errorText, fileInfo);

        return { ...fileInfo, ok: true, errorText: "", fileName: fileName, fileData: fileData };
    }
    

    private async UploadFile(ticket: string, fileName : string, fileData: ArrayBuffer): Promise<ArrayBuffer> {
        const formData  = new FormData();
        assert(ticket);
        formData.append("FILE_TRANSFER_TICKET", ticket);
        formData.append("file", new Blob([new Uint8Array(fileData)]), fileName)

        const response = await fetch(this._connection.connectionString + AttachmentsFileTransfer.FileServiceInterfaceOperation,  {
            method: 'POST',
            body: formData
        });
     
        return await response.arrayBuffer();
    }

    private async DownloadFile(ticket: string, fileName: string): Promise<ArrayBuffer> {
        assert(ticket);
        const response = await fetch(this._connection.connectionString + AttachmentsFileTransfer.FileServiceInterfaceOperation,  {
            method: 'POST',
            body: new URLSearchParams({
                "FILE_TRANSFER_TICKET": ticket,
                "FILE_NAME": fileName
            })
        });
     
        return await response.arrayBuffer();
    }

    protected async DeleteFile(docClass: string, docNo: string, docSheet: string, docRev: string, docType: string, fileNo: number) : Promise<AttachmentResponse> {
        this._operation = AttachmentsFileTransfer.DeleteFileOperation;
        this._docClass = docClass;
        this._docNo = docNo;
        this._docSheet = docSheet;
        this._docRev = docRev;
        this._docType = docType;
        this._fileNo = fileNo;
        const response = await this.Execute();
        return { docClass: docClass, docNo: docNo, docSheet: docSheet, docRev: docRev, docType: docType, fileNo: fileNo , ...response };
    }
}


