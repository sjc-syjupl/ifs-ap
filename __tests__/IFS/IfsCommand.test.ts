import * as fs from 'fs';
import { Response } from "cross-fetch"
import { IfsDataArrayType } from "../../src/Buffer/MarshalObject"
import { _Message } from "../../src/IFS/Message"
import { _PlSqlResponse, _PlSqlCommand } from "../../src/IFS/PlSqlCommand"
import { Connection } from "../../src/IFS/Connection"
//import { MasrshalObject } from "../../src/Buffer/MarshalObject"
const util = require("../../src/IFS/Util")

const folderTestFiles = "./__tests__/Buffer/TestFiles";

class TestIfsConnection extends Connection{
    public set clientId( value : string) {
        Connection._clientId = value;
    }

    public get clientId(): string {
        return Connection._clientId;
    }

    public SetClientSessionId(value: string) {
        this._clientSessionId = value;
    }
}

async function MockedResponse(file: string, sql? : _PlSqlCommand) : Promise<{fileInfo : { [k: string]: any }, conn : Connection, response: _PlSqlResponse}> {
    const fileInfo = JSON.parse(fs.readFileSync(folderTestFiles + "/" + file, 'utf8'));
        
    const requestBody = new Uint8Array(fs.readFileSync(folderTestFiles + "/" + fileInfo.requestFile, null));
    const responseBody = new Uint8Array(fs.readFileSync(folderTestFiles + "/" + fileInfo.responseFile, null));

    const conn = new TestIfsConnection("ifs.test.com");
    conn.clientId = fileInfo.request.clientId;
    expect(conn.clientId).toEqual(fileInfo.request.clientId);

    let newIdIndex = 0;
    let newIdtab: string[] = [];
    (fileInfo.request.commands as Array<{ commandId: string }>).forEach(el => {
        newIdtab.push(el.commandId);
    });
    newIdtab.push(fileInfo.request.requestId);
    newIdtab.push(fileInfo.request.invocationId);
    const spyNewId = jest.spyOn(util, "NewId").mockImplementation(() : string => {
        return newIdtab[newIdIndex++];
    });

    const spySizeHeader = jest.spyOn(_Message.prototype, "SizeOfRequestHeader").mockImplementation((): number => {
        return 1024;
    });
    
    const spySendMessage = jest.spyOn(_Message.prototype, "SendMessage").mockImplementation(async (_headerBytes: number, body: Uint8Array): Promise<Response> => {

        //console.log(JSON.stringify(MasrshalObject.Unmarshall(requestBody), null, 4));        
        //console.log("");
        //console.log(JSON.stringify(MasrshalObject.Unmarshall(body), null, 4));


        //expect(headerBytes).toEqual(fileInfo.headerBytes);
        expect(body.byteLength).toEqual(requestBody.byteLength);
        expect(body).toEqual(requestBody);

        return new Response(responseBody, { headers: [["Content-Type", "application/octet-stream"]], status: 200 });
    });

    conn.locale = fileInfo.request.locale;
    conn.runAs = fileInfo.request.runAs;
    conn.transactionId = fileInfo.request.transactionId;
    conn.SetClientSessionId(fileInfo.request.clientSessionId);
    if (fileInfo.request.clientSessionId)
        expect(conn.clientSessionId).toEqual(fileInfo.request.clientSessionId);
    conn.debug = fileInfo.request.debug || false;
    fileInfo.request.commands[0].clientSessionId = '_';

    let response: _PlSqlResponse;
    switch (fileInfo.method){
        case "SQL":
            response = await conn.Sql(fileInfo.request.commands[0].sqlString, fileInfo.request.commands[0].bindingsSendObject,
                fileInfo.request.commands[0].maxRows,
                fileInfo.request.commands[0].skipRows,
                fileInfo.request.commands[0] );
            break;
        case "PL_SQL":
            response = await (new _PlSqlCommand(conn, fileInfo.request.commands[0].sqlString, fileInfo.request.commands[0].bindingsSendObject, fileInfo.request.commands[0]).Execute()) as _PlSqlResponse;
            break;
        case "COMMIT":
            response = await conn.Commit();
            break;
        case "ROLLBACK":
            response = await conn.Rollback();
            break;
        case "FETCH":
            if (sql) {
                sql.SetOptions(fileInfo.request.commands[0]);
                sql.ClearFiledsId();
            } else {
                sql = new _PlSqlCommand(conn, fileInfo.request.commands[0].sqlString, fileInfo.request.commands[0].bindingsSendObject, fileInfo.request.commands[0]);
                expect(sql.partialResult).toEqual(true);
            }
            response = await sql.Fetch(fileInfo.request.commands[0].maxRows);
            break;
        case "END_CLIENT_SESSION":
            response = await conn.EndSession();
            break;
        case "CMD_BLOCK":
            let cmdBlock = conn.CmdBlock();
            expect(cmdBlock.executed).toEqual(false);
            expect(cmdBlock.response.ok).toEqual(false);
            (fileInfo.request.commands as Array<{ [k: string]: any }>).forEach(el  => {
                switch (el.method) {
                    case "SQL":
                        if (el.sqlString) {
                            cmdBlock.Sql(el.sqlString, el.bindingsSendObject, el.maxRows, el.skipRows, el);                            
                        }
                        break;
                    case "PL_SQL":
                        if (el.sqlString) {
                            cmdBlock.PlSql(el.sqlString, el.bindingsSendObject, el);
                        }
                        break;
                    case "COMMIT":
                        cmdBlock.Commit();
                        break;
                    case "ROLLBACK":
                        cmdBlock.Rollback();
                        break;
                    default:
                        throw Error("Wrong test method: " + el.method)
                }
            });
            response = (await cmdBlock.Execute()) as _PlSqlResponse;
            expect(cmdBlock.response).toEqual(response);
            expect(cmdBlock.executed).toEqual(true);
            expect(cmdBlock.commands.length).toEqual(fileInfo.request.commands.length);
            break;
        default:
            throw Error("Wrong test method: " + fileInfo.method)
    }
    spyNewId.mockRestore();
    spySendMessage.mockRestore();
    spySizeHeader.mockRestore();

    return {fileInfo : fileInfo, conn: conn, response: response};
}

test.each(fs.readdirSync(folderTestFiles).filter(e => e.endsWith("json")))("Test file: %s", async (file) => {
    const { fileInfo, conn, response } = await MockedResponse(file);

    expect(response.request).not.toBeUndefined();
    expect(response.request?.executed).toEqual(true);
    expect(response.request?.response).toEqual(response);
    expect(response.request?.connection).toEqual(conn);

    expect(response.ok).toEqual((fileInfo.response.status||"") === "DONE");
    expect(response.errorText).toEqual(fileInfo.response.errorText || "");
    expect(conn.transactionId).toEqual(fileInfo.response.transactionId || "");
    if (!fileInfo.response.commands) {
        expect(response.bindings).toEqual({});
        expect(response.result).toEqual([]);                
        expect(response.partialResult).toEqual(false);
    } else if (fileInfo.method === "CMD_BLOCK") {
        const bindings = (fileInfo.response.commands as IfsDataArrayType).map(el => el.bindingsObject);
        expect(response.bindings).toEqual(bindings);
        const result = (fileInfo.response.commands as IfsDataArrayType).map(el => ChangeDateStr(el.result || []));
        expect(response.result).toEqual(result);
        const partialResult = (fileInfo.response.commands as IfsDataArrayType).map(el => el.partialResult === "TRUE");
        expect(response.partialResult).toEqual(partialResult);
        expect(response.request?.multipleQuery).toEqual(true);
    } else {
        expect(response.bindings).toEqual(fileInfo.response.commands[0].bindingsObject || {});
        ChangeDateStr(fileInfo.response.commands[0].result || []);
        expect(response.result).toEqual(fileInfo.response.commands[0].result || []);
        expect(response.partialResult).toEqual(fileInfo.response.commands[0].partialResult === "TRUE");
    }
    
});

test.each(fs.readdirSync(folderTestFiles).filter(e => e.endsWith("_fetch.json")))("Test fetch file: %s", async (file) => {
    const baseFile = fs.readdirSync(folderTestFiles).filter(e => e.endsWith(file.replace("_fetch", "")));
    if (baseFile.length === 0) return;
    const { response: baseResponse } = await MockedResponse(baseFile[0]);
    const baseResult = [ ...baseResponse.result ];
    const { response:fetchResponse } = await MockedResponse(file);
    const fetchResult = [ ...fetchResponse.result ];
    const { response } = await MockedResponse(file, baseResponse.request as _PlSqlCommand);
    expect(baseResponse.request?.sqlString).toEqual(response.request?.sqlString);
    expect(response.result.length).toEqual(baseResult.length + fetchResult.length);
    const result = [ ...baseResult, ...fetchResult];
    expect(response.result).toEqual(result);
});


afterAll(() => {
    jest.restoreAllMocks();
});



function ChangeDateStr(result: IfsDataArrayType) {
    if (Array.isArray(result)) {
        result.forEach(el => {
            if (Array.isArray(el)) {
                ChangeDateStr(el);
            } else if (typeof el === "object"){
                for (let [key, value] of Object.entries(el)) {
                    if ((typeof value === "string") && value.length === 24 && value.endsWith(".000Z")) {
                        el[key] = new Date(value);
                    }
                }
            }
        })
    }
    return result;
}

