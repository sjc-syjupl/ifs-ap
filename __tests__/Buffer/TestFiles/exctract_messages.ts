import * as fs from 'fs';
import { MasrshalObject, IfsDataType, IfsDataObjectType, IfsDataArrayType } from "../../../src/Buffer/MarshalObject"

const CRLF = "\x0D\x0A";

function ExtractPart(fileData: Buffer, startPart : string, stopPart : string) : Buffer {
    const start = fileData.indexOf(startPart);
    const stop = fileData.indexOf(stopPart);

    return fileData.subarray(start + startPart.length, stop);
}

function Extract(fileData: Buffer, name: string): Buffer{
    return ExtractPart(fileData, `<${name}>` + CRLF, `</${name}>` );
}

function DeleteFile(fileName: string) {
    try {
        fs.unlinkSync(fileName);
    }
    catch(err) {
    }    
}
function SaveToFile(fileName: string, body: (Buffer|string)) {
    DeleteFile(fileName);
    fs.writeFileSync( fileName, body );
}

function MergeCommands(commands: IfsDataArrayType) {
    const newCommands: IfsDataArrayType = [];
    let prevItem : (IfsDataObjectType|undefined) = undefined;
    for (const item of commands) {
        if (prevItem) {
            if (item.commandId.endsWith("-1") || prevItem.commandId == item.commandId.substring(0, item.commandId.length - 2)) {
                if (!Array.isArray(prevItem.bindingsObject)) {
                    prevItem.bindingsObject = [prevItem.bindingsObject];
                    prevItem.bindingsSendObject = [prevItem.bindingsSendObject];
                    prevItem.partialResult = false
                    prevItem.result = [prevItem.result || []];
                    prevItem.commandId = prevItem.commandId.substring(0, prevItem.commandId.length - 2);
                }
                prevItem.bindingsObject.push( item.bindingsObject );
                prevItem.bindingsSendObject.push( item.bindingsSendObject );
                prevItem.result.push( item.result || [] );
            } else {
                newCommands.push(prevItem);                
                prevItem = item;            
            }
        } else {
            prevItem = item;            
        }
    }
    if (prevItem) {
        newCommands.push(prevItem);
    }
    return newCommands;
}

function GetMessageInfo(message: IfsDataType): object {
    /*
    let header: IfsDataType;
    let body: (IfsDataType | undefined);
    if (Array.isArray(message) && message.length >= 2 && Array.isArray(message[0])) {
        header = message[0];
        body = message[1];
    } else if (Array.isArray(message) && message.length > 0 && !Array.isArray(message[0])) {
        header = message; 
        body = undefined;
        message = [message, undefined];// response with error don't have body part
    }
    */
    if (Array.isArray(message) && message.length > 0 && !Array.isArray(message[0])) {
        message = [message, undefined];// response with error don't have body part
    }
    if (!(Array.isArray(message) && message.length >= 2 && Array.isArray(message[0]))) {
        throw Error("Wrong type of message.");
    }
    let info : IfsDataType = {};
    info.status = (MasrshalObject.ExtractSubobject(message, [0, { name: "STATUS" }]) as IfsDataObjectType)?.value;
    info.errorText = (MasrshalObject.ExtractSubobject(message, [0, { name: "ERROR" }, { name: "MESSAGE" }]) as IfsDataObjectType)?.value;
    const fndContext = MasrshalObject.ExtractSubobject(message, [0, { name: "FND_CONTEXT" }]) as IfsDataObjectType;
    info.clientId = (MasrshalObject.ExtractSubobject(fndContext, [{ name: "CLIENT_ID" }]) as IfsDataObjectType)?.value;
    info.requestId = (MasrshalObject.ExtractSubobject(fndContext, [{ name: "REQUEST_ID" }]) as IfsDataObjectType)?.value;
    info.locale = (MasrshalObject.ExtractSubobject(fndContext, [{ name: "LOCALE" }]) as IfsDataObjectType)?.value;
    info.language = (MasrshalObject.ExtractSubobject(fndContext, [{ name: "LANGUAGE" }]) as IfsDataObjectType)?.value;
    info.debug = (MasrshalObject.ExtractSubobject(fndContext, [{ name: "DEBUG" }]) as IfsDataObjectType) != undefined;
    info.runAs = (MasrshalObject.ExtractSubobject(fndContext, [{ name: "RUN_AS" }]) as IfsDataObjectType)?.value;

    const plSql = MasrshalObject.ExtractSubobject(message, [1, { name: "PLSQL_INVOCATION" }]) as IfsDataObjectType;
    if (plSql) {
        info.invocationId = (MasrshalObject.ExtractSubobject(plSql, [{ name: "DATA", "type": "PLSQL_INVOCATION" }]) as IfsDataObjectType)?.value;
        const dataBuffer = (MasrshalObject.ExtractSubobject(plSql, [ {buffer:true, name:""}]) as IfsDataObjectType)?.value;
        info.transactionId = (MasrshalObject.ExtractSubobject(dataBuffer, [{ name: "TRANSACTION_ID" }]) as IfsDataObjectType)?.value || "";
        let commandsArray: IfsDataArrayType = [];
        if (dataBuffer)
            (dataBuffer as IfsDataArrayType).forEach(el => {
                if (el.name && el.name === "COMMANDS") {
                    const commands = el;
                    const commandsId: string[] = (commands.value as IfsDataArrayType).filter(el => el.name === "DATA").map(el => el.value);
                    for (const commandId of commandsId) {
                        const commandsInfo: IfsDataType = {};
                        commandsInfo.commandId = (MasrshalObject.ExtractSubobject(commands, [{ name: "DATA", value: commandId }]) as IfsDataObjectType)?.value;
                        const data = MasrshalObject.ExtractSubobject(commands, [{ name: "DATA", value: commandId, _next: true }] ) as IfsDataObjectType;
                        commandsInfo.sqlString = (MasrshalObject.ExtractSubobject(data, [{ name: "STATEMENT" }]) as IfsDataObjectType)?.value;
                        if (commandsInfo.sqlString) {
                            switch (commandsInfo.sqlString) {
                                case "COMMIT":
                                case "ROLLBACK":
                                case "FETCH":
                                case "END_CLIENT_SESSION":
                                    commandsInfo.method = commandsInfo.sqlString;
                                    break;
                                default:
                                    commandsInfo.method = (commandsInfo.sqlString as string).toUpperCase().startsWith('SELECT') ? "SQL" : "PL_SQL";
                            }
                        }
                        commandsInfo.maxRows = (MasrshalObject.ExtractSubobject(data, [{ name: "MAX_ROWS" }]) as IfsDataObjectType)?.value;
                        commandsInfo.skipRows = (MasrshalObject.ExtractSubobject(data, [{ name: "SKIP_ROWS" }]) as IfsDataObjectType)?.value;
                        commandsInfo.rowCount = (MasrshalObject.ExtractSubobject(data, [{ name: "ROW_COUNT" }]) as IfsDataObjectType)?.value;
                        commandsInfo.partialResult = (MasrshalObject.ExtractSubobject(data, [{ name: "PARTIAL_RESULT" }]) as IfsDataObjectType)?.value;
                        commandsInfo.cursorId = (MasrshalObject.ExtractSubobject(data, [{ name: "CURSOR_ID" }]) as IfsDataObjectType)?.value;
                        if (commandsInfo.partialResult === undefined && commandsInfo.cursorId) {
                            commandsInfo.partialResult = true;                            
                        }
                        else {
                            commandsInfo.partialResult = commandsInfo.partialResult == "TRUE";
                        }

                        commandsInfo.debugContextName = (MasrshalObject.ExtractSubobject(data, [{ name: "DEBUG_CONTEXT_NAME" }]) as IfsDataObjectType)?.value;
                        commandsInfo.debugAppStackFrame = (MasrshalObject.ExtractSubobject(data, [{ name: "DEBUG_APP_STACK_FRAME" }]) as IfsDataObjectType)?.value;
                        commandsInfo.selectColumns = (MasrshalObject.ExtractSubobject(data, [{ name: "SELECT_COLUMNS" }]) as IfsDataObjectType)?.value;
                        commandsInfo.debugIntoInfo = (MasrshalObject.ExtractSubobject(data, [{ name: "DEBUG_INTO_INFO" }]) as IfsDataObjectType)?.value;
                        commandsInfo.debugBindInfo = (MasrshalObject.ExtractSubobject(data, [{ name: "DEBUG_BIND_INFO" }]) as IfsDataObjectType)?.value;
                        commandsInfo.generateOuterBlock = (MasrshalObject.ExtractSubobject(data, [{ name: "GENERATE_OUTER_BLOCK" }]) as IfsDataObjectType)?.value;

                        const bindVariables = (MasrshalObject.ExtractSubobject(data, [{ name: "BIND_VARIABLES" }]) as IfsDataObjectType);
                        let bindValuesSendObject: IfsDataObjectType = {};
                        let bindValuesObject: IfsDataObjectType = {};
                        if (bindVariables) {
                            (bindVariables.value as Array<IfsDataObjectType>).forEach(el => {
                                bindValuesObject[el.name] = MasrshalObject.IfsValueToJavascript(el.value, el.type);
                                bindValuesSendObject[el.name] = { direction: el.status, value: el.value, type: el.type};
                            })        
                        }
                        commandsInfo.bindingsObject = bindValuesObject;
                        commandsInfo.bindingsSendObject = bindValuesSendObject;
                        let result = (MasrshalObject.ExtractSubobject(data, [{ name: "RESULT" }]) as IfsDataObjectType)?.value;
                        if (result) {
                            let resultData : IfsDataArrayType = [];
                            (result as IfsDataArrayType).forEach(data => {
                                const record : IfsDataObjectType = {};
                                (data.value as IfsDataArrayType).forEach(el => {
                                    record[el.name] = MasrshalObject.IfsValueToJavascript(el.value, el.type);
                                })
                                resultData.push(record);
                            })
                            commandsInfo.result = resultData;
                        }
                        commandsArray.push(commandsInfo);
                        
                    }
                }
            })
        info.commands = MergeCommands(commandsArray);
    }

    info.message = message;
    return info;
}


//execute IFS, switch on debug, export message to XML
fs.readdirSync(".").filter(e => e.endsWith("xml")).forEach(file => {
    console.log(file)
    const fileData = fs.readFileSync(file, null);

    const headerBufferRequest = Extract(fileData, 'HeaderBufferRequest');
    const bodyBufferRequest = Extract(fileData, 'BodyBufferRequest');
    const headerBufferResponse = Extract(fileData, 'HeaderBufferResponse');
    const bodyBufferResponse = Extract(fileData, 'BodyBufferResponse');
    const request = Buffer.concat([headerBufferRequest, bodyBufferRequest]);
    const response = Buffer.concat([headerBufferResponse, bodyBufferResponse]);

    const baseFileName = file.substr(0, file.length - 4);
    SaveToFile(baseFileName + '_Request.dat', request);
    SaveToFile(baseFileName + '_Response.dat', response);
})
console.log("")


fs.readdirSync(".").filter(e => e.endsWith("_Request.dat")).forEach(file => {
    console.log(file)
    const requestFileName = file;
    const responseFileName = file.replace('_Request.dat', '_Response.dat');
    const jsonFileName = file.replace('_Request.dat', '.json');

    const request = fs.readFileSync(requestFileName, null);
    const response = fs.readFileSync(responseFileName, null);
    let info : IfsDataType = {
        requestFile: requestFileName,
        responseFile: responseFileName,
        //headerBytes: headerBufferRequest.byteLength,
    };
    info.request = GetMessageInfo(MasrshalObject.Unmarshall(new Uint8Array(request)));
    info.response = GetMessageInfo(MasrshalObject.Unmarshall(new Uint8Array(response)));
    if (info.request.commands.length === 1) {
        info.method = info.request.commands[0].method;
    } else {
        info.method = "CMD_BLOCK";
    }
    SaveToFile(jsonFileName, JSON.stringify(info, null, 4));
})
