import { MasrshalObject } from "../../src/Buffer/MarshalObject"
import { BindingParameterType } from "../../src/IFS/Bindings"
import { _PlSqlCommand } from "../../src/IFS/PlSqlCommand"
import { _CmdBlock } from "../../src/IFS/CmdBlock"
import { Connection } from "../../src/IFS/Connection"
import { NewId } from '../../src/IFS/Util';

class TestSizeSqlMessage extends _PlSqlCommand {
    public TestBindingSize() {
        const prognoseValue = this.SizeOfRequestBidings(0);
        if (prognoseValue === 0) return;
        const prognoseObject = 29 + prognoseValue;
        const bindValue = this.GetRequestBidings(0);
        const bindObject = [{
            "name": "BIND_VARIABLES",
            "type": "R.B64",
            "buffer": true,
            "value": bindValue,
        }];
        //console.log(JSON.stringify(bindValue, null, 4));
        const realValue = MasrshalObject.Marshall(bindValue).byteLength - 2;
        const realObject= MasrshalObject.Marshall(bindObject).byteLength - 2;
        expect(prognoseValue).toEqual(realValue);
        expect(prognoseObject).toEqual(realObject);
    }

    public TestCommandSize() {
        const prognoseValue = this.SizeOfRequestcommands();
        const object = this.CreateRequestCommands();
        //console.log(JSON.stringify(object, null, 4));
        const realValue = MasrshalObject.Marshall(object).byteLength - 2;
        expect(prognoseValue).toEqual(realValue); //command
    }

    public TestBodySize(options? : { [k: string]: string }) {
        if (options) {
            this._cursorId = options.cursorId || "";
            this._commandId = options.commandId || "";
            this._debugContextName = options.debugContextName || "";
            this._debugAppStackFrame = options.debugAppStackFrame || "";
            this._selectColumns = options.selectColumns || "";
            this._debugIntoInfo = options.debugIntoInfo || "";
            this._debugBindInfo = options.debugBindInfo || "";
            this._generateOuterBlock = options.generateOuterBlock || "";
            this._maxRows = parseInt(options.maxRows);
            this._skipRows = parseInt(options._skipRows);
        }

        const prognoseValue = this.SizeOfRequestBody();
        const object = this.CreateRequestBody();
        //console.log(JSON.stringify(object, null, 4));
        const realValue = MasrshalObject.Marshall(object).byteLength;
        expect(prognoseValue).toEqual(realValue); //body
    }

}
    
test("Size of message", () => {
    const conn = new Connection("ifs.test.com");
    const binding : BindingParameterType = {
            'BIND_STRING': "STRING",
            'BIND_NUMBER': 123.6,
            'BIND_NUMBER2': 67,
            'BIND_DATE': new Date(2021, 5, 17),
            'BIND_DATE2': new Date(2021, 5, 17, 12, 45, 41),
            'BIND_BINARY': new Uint8Array([56, 82, 23]),
            'BIND_BINARY2': new ArrayBuffer(2)
        };
    const queryNoBinding = new TestSizeSqlMessage( conn, "BEGIN :BIND_STRING, :BIND_NUMBER, :BIND_NUMBER2, :BIND_DATE, :BIND_DATE2, :BIND_BINARY, :BIND_BINARY2 END;" )
    queryNoBinding.TestBindingSize();
    queryNoBinding.TestCommandSize();
    queryNoBinding.TestBodySize();
    const query = new TestSizeSqlMessage( conn, "BEGIN :BIND_STRING, :BIND_NUMBER, :BIND_NUMBER2, :BIND_DATE, :BIND_DATE2, :BIND_BINARY, :BIND_BINARY2 END;", binding )
    query.TestBindingSize();
    query.TestCommandSize();
    query.TestBodySize();
    conn.transactionId = "12345";
    query.TestBodySize();
    query.TestBodySize({
        cursorId: "12345",
        debugContextName: "fileInfo.request.commands[0].debugContextName fileInfo.request.commands[0].debugContextName fileInfo.request.commands[0].debugContextName fileInfo.request.commands[0].debugContextName",
        debugAppStackFrame: "fileInfo.request.commands[0].debugAppStackFrame",
        selectColumns: "fileInfo.request.commands[0].selectColumns",
        debugIntoInfo: "fileInfo.request.commands[0].debugIntoInfo",
        debugBindInfo: "fileInfo.request.commands[0].debugBindInfo",
        generateOuterBlock: "fileInfo.request.commands[0].generateOuterBlock",
        maxRows: "100",
        skipRows: "10",
    });
})


class TestSizeCmdBlockMessage extends _CmdBlock {
    public TestBodySize(options? : { [k: string]: string }) {
        if (options) {
            this._cursorId = options.cursorId || "";
            this._commandId = options.commandId || "";
            this._debugContextName = options.debugContextName || "";
            this._debugAppStackFrame = options.debugAppStackFrame || "";
            this._selectColumns = options.selectColumns || "";
            this._debugIntoInfo = options.debugIntoInfo || "";
            this._debugBindInfo = options.debugBindInfo || "";
            this._generateOuterBlock = options.generateOuterBlock || "";
            this._maxRows = parseInt(options.maxRows);
            this._skipRows = parseInt(options._skipRows);
        }

        const prognoseValue = this.SizeOfRequestBody();
        const object = this.CreateRequestBody();
        //console.log(JSON.stringify(object, null, 4));
        const realValue = MasrshalObject.Marshall(object).byteLength;
        expect(prognoseValue).toEqual(realValue); //body
    }
}


test("Size of CmdBlock message", () => {
    const conn = new Connection("ifs.test.com");
    const binding: BindingParameterType = {
        'BIND_STRING': "STRING",
        'BIND_NUMBER': 123.6,
        'BIND_NUMBER2': 67,
        'BIND_DATE': new Date(2021, 5, 17),
        'BIND_DATE2': new Date(2021, 5, 17, 12, 45, 41),
        'BIND_BINARY': new Uint8Array([56, 82, 23]),
        'BIND_BINARY2': new ArrayBuffer(2)
    };
    const queryNoBinding = new TestSizeCmdBlockMessage(conn);
    queryNoBinding.PlSql( "BEGIN :BIND_STRING, :BIND_NUMBER, :BIND_NUMBER2, :BIND_DATE, :BIND_DATE2, :BIND_BINARY, :BIND_BINARY2 END;" )
    queryNoBinding.Sql( "SELECT 1 A FROM DUAL" )
    queryNoBinding.Sql( "SELECT INVOICE_ID, INVOICE_NO FROM &AO.INVOICE" )
    queryNoBinding.TestBodySize();
    const query = new TestSizeCmdBlockMessage(conn )
    queryNoBinding.PlSql( "BEGIN :BIND_STRING, :BIND_NUMBER, :BIND_NUMBER2, :BIND_DATE, :BIND_DATE2, :BIND_BINARY, :BIND_BINARY2 END;", binding )
    queryNoBinding.Sql( "SELECT 1 A FROM DUAL" )
    queryNoBinding.Sql( "SELECT INVOICE_ID, INVOICE_NO FROM &AO.INVOICE" )
    query.TestBodySize();
    conn.transactionId = "12345";
    query.TestBodySize();
    query.TestBodySize({
        cursorId: "12345",
        debugContextName: "fileInfo.request.commands[0].debugContextName fileInfo.request.commands[0].debugContextName fileInfo.request.commands[0].debugContextName fileInfo.request.commands[0].debugContextName",
        debugAppStackFrame: "fileInfo.request.commands[0].debugAppStackFrame",
        selectColumns: "fileInfo.request.commands[0].selectColumns",
        debugIntoInfo: "fileInfo.request.commands[0].debugIntoInfo",
        debugBindInfo: "fileInfo.request.commands[0].debugBindInfo",
        generateOuterBlock: "fileInfo.request.commands[0].generateOuterBlock",
        maxRows: "100",
        skipRows: "10",
    });
})


test("NewId length", () => {
    for (let i = 1; i < 100; i++){
        expect(NewId().length).toEqual(19);
    }
})
