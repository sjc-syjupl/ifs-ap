import { BindingParameterType } from "./Bindings"
import { MasrshalObject, BufferMarkers, IfsDataType, IfsDataArrayType, IfsDataObjectType } from "../Buffer/MarshalObject"
import { IsEmpty, NewId } from "./Util"
import { UTF8Length } from "../Buffer/utf8"
import { ConnectionInterface } from './ConnectionInterface';
import { _Message } from "./Message"
import { Connection } from './Connection';
import { SqlOneResponse, SqlMultiResponse, PlSqlOneResponse, PlSqlMultiResponse, _ISqlCommand, _IPlSqlCommand } from './PlSqlCommandTypes';


export class _PlSqlCommand extends _Message implements _IPlSqlCommand, _ISqlCommand {
    protected _sqlString: string = "";
    protected _commandId: string = "";
    protected _cursorId?: string;
    protected _response?: (PlSqlOneResponse | PlSqlMultiResponse);

    protected _maxRows?: number;
    protected _skipRows?: number;

    protected _debugContextName = "";
    protected _debugAppStackFrame = "";
    protected _selectColumns = "";
    protected _debugIntoInfo = "";
    protected _debugBindInfo = "";
    protected _generateOuterBlock = "";
 
    constructor (connection: ConnectionInterface, sqlString: string, bindings?: BindingParameterType, options? : { [k: string]: string }) {
        super(connection);
        this._commandId = "";
        this._interface = "AccessPlsql";
        this._operation = "Invoke";

        this._sqlString = this.FixSqlString( sqlString );
        if (bindings) this.AddBinding(bindings);
        if (options) {
            this.SetOptions(options);
        }
    }

    public SetOptions(options: { [k: string]: string }) {        
        this._cursorId = options.cursorId || "";
        this._debugContextName = options.debugContextName || "";
        this._debugAppStackFrame = options.debugAppStackFrame || "";
        this._selectColumns = options.selectColumns || "";
        this._debugIntoInfo = options.debugIntoInfo || "";
        this._debugBindInfo = options.debugBindInfo || "";
        this._generateOuterBlock = options.generateOuterBlock || "";
        this._clientSessionId = options.clientSessionId || "";
        this.maxRows = parseInt(options.maxRows);
        this._skipRows = parseInt(options._skipRows);
    }

    public ClearFiledsId() {
        this._commandId = "";
    }


    public get sqlString(): string{
        return this._sqlString;
    }
    public set sqlString( value : string ) {
        this._sqlString = this.FixSqlString( value );
    }

    public get maxRows(): (number|undefined) {
        return this._maxRows;
    }
    public set maxRows( value : (number|undefined) ) {
        this._maxRows = value;
        if (this._maxRows && !this._clientSessionId && !this.multipleQuery) {
            this.OpenCursor();
        }
    }

    public get skipRows(): (number|undefined) {
        return this._skipRows;
    }
    public set skipRows( value : (number|undefined) ) {
        this._skipRows = value;
    }

    public get partialResult(): boolean {
        if (this.multipleQuery) {
            return false;
        } else {
            return this._cursorId ? this._cursorId != "" : false;
        }
    }

    public get commandId(): string{
        if (!this._commandId)
            this._commandId = NewId();
        return this._commandId;
    }    

    public set commandId( value : string ){
        this._commandId = value;
    }    

    public get executed(): boolean{
        return this._response != undefined;
    }

    public get response(): (PlSqlOneResponse|PlSqlMultiResponse) {
        if (this._response) {
            return this._response;            
        } else {
            return this.ErrorResponse("It hasn't been executed yet.");
        }
    }

    public set response( response : PlSqlOneResponse|PlSqlMultiResponse) {
        this._response = response;
    }

    public async Fetch(rows: number): Promise<(SqlOneResponse | SqlMultiResponse)> {
        if (this.multipleQuery) {
            return this.ErrorResponse("Fetch method is available only if you don't use array in the binding parameter.")  as SqlOneResponse;
        }
        if (!this._clientSessionId) {
            return this.ErrorResponse("Fetch method is available if you used maxRows in a previous query.")  as SqlOneResponse;
        }
        this.maxRows = rows;
        if (this.partialResult) {
            await this._Execute();
        } else if (!this.executed ) {
            await this.Execute();
        }
        return this._response as SqlOneResponse;
    };

    public OpenCursor() {
        this.OpenTempSession();
    }

    public async CloseTempSession(): Promise<SqlOneResponse> {
        if (this._clientSessionId) {
            const endSessionQuery = new _PlSqlCommand(this._connection, "END_CLIENT_SESSION");
            endSessionQuery._clientSessionId = this._clientSessionId;
            this._response = await endSessionQuery.Execute();
            this._clientSessionId = "";
        }
        return this._response as SqlOneResponse;
    }

    public async CloseCursor(): Promise<SqlOneResponse> {
        if (this._clientSessionId) {
            this._response = await this.CloseTempSession();
            this._cursorId = "";
        }
        return this._response as SqlOneResponse;
    }

    public AddBinding(bindings: BindingParameterType) {
        super.AddBinding(bindings);
        if (this._sqlString && this._bindings) {
            this.bindings.forEach(bind =>
                bind.bindings.forEach( el => {
                    if (this._sqlString.indexOf(":" + el.name) < 0) {
                        throw Error("Can't find binding name " + el.name);
                    }
            }))
        }
    }

    public static IsSelectStatement( sqlString : string ): boolean {
        const upperSqlString = sqlString.trim().toUpperCase();
        return (upperSqlString.startsWith("SELECT") || upperSqlString.startsWith("WITH"));
    }

    public static IsPlSqlStatement( sqlString : string ): boolean {
        const upperSqlString = sqlString.trim().toUpperCase();
        return (upperSqlString.startsWith("DECLARE") || upperSqlString.startsWith("BEGIN") || upperSqlString.startsWith("ROLLBACK") || upperSqlString.startsWith("COMMIT") || upperSqlString.startsWith("FETCH") || upperSqlString.startsWith("END_CLIENT_SESSION"));
    }

    protected FixSqlString(sqlString: string): string {
        const upperSqlString = sqlString.trim().toUpperCase();

        if (upperSqlString.startsWith("SELECT") ||
            upperSqlString.startsWith("WITH") ||
            upperSqlString.startsWith("ROLLBACK") ||
            upperSqlString.startsWith("COMMIT") ||
            upperSqlString.startsWith("FETCH") ||
            upperSqlString.startsWith("END_CLIENT_SESSION")) {
            return sqlString;    
        } else {
            let newSqlString = sqlString;
            if (!upperSqlString.endsWith(";"))
                newSqlString += ";";
            if (!(upperSqlString.startsWith("BEGIN") || (upperSqlString.startsWith("DECLARE"))))
                newSqlString = "BEGIN " + newSqlString + " END;";
            return newSqlString;            
        }
    }

    public static TransformResultFunc(path: string, value: IfsDataType): IfsDataType {
        if (path === "/PLSQL_INVOCATION//COMMANDS//RESULT") {
            if (("value" in value) && Array.isArray(value.value)) {
                const newValue: IfsDataObjectType = {};
                value.value.forEach(elem => {
                    newValue[elem.name] = elem.isNull ? null : MasrshalObject.IfsValueToJavascript( elem.value, elem.type );
                });                
                return newValue;
            }
        }
        return value;
    }

    protected RequestMessage(): [number, Uint8Array] {
        if(this._bindings && _PlSqlCommand.IsSelectStatement( this._sqlString )){
            this.bindings.forEach(bind =>
                bind.bindings.forEach(el => {
                el.direction = "IN";
            }))
        }
        return super.RequestMessage();
    }

    private* MessageIndexTab() : IterableIterator<{ index: number, cursorId: string }> {
        let index: number, maxIndex: number;
        const bindings = this.bindings;
        if (bindings.length == 0) {
            index = -1;
            maxIndex = 0;
        } else {
            index = 0;
            maxIndex = bindings.length;
        }
        const partialResult = this._cursorId != undefined && this._cursorId != "";
        for (; index < maxIndex; index++) {
            const cursorId = partialResult ? this._cursorId : "";
            if (!partialResult || cursorId != "") {
                yield {index:index, cursorId : cursorId ||""};
            }
        }
    }
    
    public SizeOfRequestcommands(): number {
        let sizeBytes = 0;
        const bindings = this.bindings;
        const sqlLength = UTF8Length(this.sqlString);
        const multipleQuery = this.multipleQuery;
        for( const { index, cursorId } of this.MessageIndexTab()) {
                sizeBytes += 42
                    + (this.commandId.length + (multipleQuery ? 1 + index.toString().length : 0))
                    + (cursorId != "" ? 21 : 15 + (sqlLength < 64 ? 1 : 2) + sqlLength )
                    + (index >= 0 && !IsEmpty(bindings[index]) && !IsEmpty(bindings[index].bindings) ? 29 + this.SizeOfRequestBidings(index) : 0)
                    + (this._generateOuterBlock ? 28 : 0)
                    + (this._debugContextName ? 24 + (this._debugContextName.length < 64 ? 1 : 2) + this._debugContextName.length : 0)
                    + (this._debugAppStackFrame ? 28 + (this._debugAppStackFrame.length < 64 ? 1 : 2) + this._debugAppStackFrame.length : 0)
                    + (this._debugBindInfo ? 21 + (this._debugBindInfo.length < 64 ? 1 : 2) + this._debugBindInfo.length : 0)
                    + ((cursorId != "" || !["COMMIT", "ROLLBACK", "END_CLIENT_SESSION"].includes(this.sqlString)) ? 25 : 0)
                    + (this._maxRows ? 12 + this._maxRows.toString().length : 0)
                    + (this._skipRows ? 13 + this._skipRows.toString().length : 0)
                    + (cursorId != "" ? 16 + cursorId.length : 0)
                    + (this._selectColumns ? 20 + (this._selectColumns.length < 64 ? 1 : 2) + this._selectColumns.length : 0)
                    + (this._debugIntoInfo ? 20 + (this._debugIntoInfo.length < 64 ? 1 : 2) + this._debugIntoInfo.length : 0);
        }
        return sizeBytes;
    }

    public CreateRequestCommands(): Array<IfsDataType> {
        const commands: Array<IfsDataType> = [];
        const bindings = this.bindings;
        const multipleQuery = this.multipleQuery;
        for( const { index, cursorId } of this.MessageIndexTab()) {
                commands.push({
                    "name": "COMMANDS",
                    "type": "ARRAY",
                    "status": "*",
                    "buffer": true,
                    "value": [
                        {
                            "delimiter": BufferMarkers.RowIdentityMarker,
                            "name": "DATA",
                            "type": "COMMAND",
                            "status": "Create",
                            "value": this.commandId + (multipleQuery ? "-"+index.toString() : "" )
                        },
                        {
                            "buffer": true,
                            "value": [
                                ... (cursorId != "" ? [
                                    {
                                        "value": "FETCH",
                                        "name": "STATEMENT",
                                        "type": "LPA"
                                    },
                                ] : [
                                    {
                                        "value": this.sqlString,
                                        "name": "STATEMENT",
                                        "type": "LPA"
                                    },
                                ]), 
                                ... (index >= 0 && !IsEmpty(bindings[index]) && !IsEmpty(bindings[index].bindings) ? [
                                    {
                                        "name": "BIND_VARIABLES",
                                        "type": "R.B64",
                                        "buffer": true,
                                        "value": this.GetRequestBidings(index),
                                    }
                                ] : []),
                                ... (this._generateOuterBlock ? [
                                    {
                                        "name": "GENERATE_OUTER_BLOCK",
                                        "type": "B",
                                        "value": "TRUE",
                                    }
                                ] : []),
                                ... (this._debugContextName ? [
                                    {
                                        "name": "DEBUG_CONTEXT_NAME",
                                        "type": "LPA",
                                        "value": this._debugContextName,
                                    }
                                ] : []),
                                ... (this._debugAppStackFrame ? [
                                    {
                                        "name": "DEBUG_APP_STACK_FRAME",
                                        "type": "LPA",
                                        "value": this._debugAppStackFrame,
                                    }
                                ] : []),
                                ... (this._debugBindInfo ? [
                                    {
                                        "name": "DEBUG_BIND_INFO",
                                        "type": "LPA",
                                        "value": this._debugBindInfo,
                                    }
                                ] : []),
                                ... (((cursorId != "") || !["COMMIT", "ROLLBACK", "END_CLIENT_SESSION"].includes(this.sqlString)) ? [
                                    {
                                        "name": "RESULT_RECORD_TYPE",
                                        "type": "LPA",
                                        "value": ""
                                    },
                                ] : []),
                                ... (this._maxRows ? [
                                    {
                                        "name": "MAX_ROWS",
                                        "type": "I",
                                        "value": this._maxRows,
                                    }
                                ] : []),
                                ... (this._skipRows ? [
                                    {
                                        "name": "SKIP_ROWS",
                                        "type": "I",
                                        "value": this._skipRows,
                                    }
                                ] : []),
                                ... (cursorId != "" ? [
                                    {
                                        "name": "CURSOR_ID",
                                        "type": "LPA",
                                        "value": cursorId,
                                    }
                                ] : []),
                                ... (this._selectColumns ? [
                                    {
                                        "name": "SELECT_COLUMNS",
                                        "type": "LPA",
                                        "value": this._selectColumns,
                                    }
                                ] : []),
                                ... (this._debugIntoInfo ? [
                                    {
                                        "name": "DEBUG_INTO_INFO",
                                        "type": "LPA",
                                        "value": this._debugIntoInfo,
                                    }
                                ] : []),
                            ]
                        },
                    ],
                });
        };
        return commands;
    }

    public SizeOfRequestBody(): number {
        return 72 
            + (this._connection.transactionId ? this._connection.transactionId.length + 21 : 0)
            + this.SizeOfRequestcommands()
            ;
    }


    protected CreateRequestBody(): IfsDataType{
        const request: IfsDataType = [{
            "name": "PLSQL_INVOCATION",
            "buffer": true,
            "value": [
				{
					"delimiter": BufferMarkers.RowIdentityMarker,
					"name": "DATA",
					"type": "PLSQL_INVOCATION",
					"status": "Create",
					"value": NewId()
				},
                {
                    "buffer": true,
                    "value": [
                        ... (this._connection.transactionId ? [
                            {
                                "name": "TRANSACTION_ID",
                                "type": "LPT",
                                "value": this._connection.transactionId,
                            }
                        ] : []),
                        ... this.CreateRequestCommands()
                    ]
                }
            ],
        }];
        return request;
    }

    protected ErrorResponse(errorText: string): (PlSqlOneResponse | PlSqlMultiResponse) {
        if (this.multipleQuery) {
            this._response = { ok: false, errorText: errorText, partialResult: false, bindings: [], result: [], request: this, connection: this.connection as Connection } as PlSqlMultiResponse;
        } else {
            this._response = { ok: false, errorText: errorText, partialResult: false, bindings: {}, result: [], request: this, connection: this.connection as Connection } as PlSqlOneResponse;
        }
        return this._response;
    }

    public async Execute(): Promise<(PlSqlOneResponse | PlSqlMultiResponse)> {
        this._response = undefined;
        this._cursorId = undefined;
        const prevCurosrId = this._cursorId;
        await this._Execute();
        if (this._clientSessionId && prevCurosrId && !this._cursorId) {
            await this.CloseCursor();
        }
        return this.response;
    }

    protected async _Execute(): Promise<(PlSqlOneResponse | PlSqlMultiResponse)> {
        return (await this._ExecuteMessage( _PlSqlCommand.TransformResultFunc )) as (PlSqlOneResponse | PlSqlMultiResponse);
    };

     public MapResponse(ifsData: IfsDataType): (PlSqlOneResponse | PlSqlMultiResponse) {
        let bindingsArray: Array<IfsDataObjectType> = [];
        let tmpResultData: (IfsDataType | undefined);
        let resultDataArray: Array<IfsDataArrayType> = [];
        tmpResultData = MasrshalObject.ExtractSubobject(ifsData,
             [  1,
                 { name: "PLSQL_INVOCATION", buffer: true },
                 { buffer: true, name: "" }]);
        this._connection.transactionId = "";
        if (tmpResultData) {
            const tmpTransactionId = MasrshalObject.ExtractSubobject(tmpResultData, [{ name: "TRANSACTION_ID" }]) as IfsDataObjectType;
            if (tmpTransactionId) {
                this._connection.transactionId = tmpTransactionId.isNull ? "" : tmpTransactionId.value;
            }
        }
         
        tmpResultData = MasrshalObject.ExtractSubobject(tmpResultData,
            [{ name: "COMMANDS", type: "ARRAY", buffer: true },]);
         
         
        let index: number, maxIndex: number;
        const bindings = this.bindings;
        if (bindings.length == 0) {
            index = -1;
            maxIndex = 0;
        } else {
            index = 0;
            maxIndex = bindings.length;
        }
        const fetchData = this.executed;
        for (; index < maxIndex; index++) {
            let tmpData = MasrshalObject.ExtractSubobject(tmpResultData, [{name:"DATA", value:this._commandId + (this.multipleQuery ? "-"+index.toString() : ""), _next:true}]);
            if (tmpData) {
                const bindings: IfsDataObjectType = {};
                const bindingsData = (MasrshalObject.ExtractSubobject(tmpData, [{ name: "BIND_VARIABLES" }]) as IfsDataObjectType)?.value;
                if (bindingsData && Array.isArray(bindingsData)) {
                    (bindingsData as IfsDataArrayType).forEach(el => {
                        bindings[el.name] = MasrshalObject.IfsValueToJavascript(el.value, el.type);
                    });
                }
                bindingsArray.push(bindings || {});

                const resultData = (MasrshalObject.ExtractSubobject(tmpData, [{ name: "RESULT" }]) as IfsDataObjectType)?.value;
                if (fetchData) {
                    const perviousResult = !this._response ? [] : (this.multipleQuery ? (this._response as PlSqlMultiResponse).result[index] : (this._response as PlSqlMultiResponse).result);
                    perviousResult.push(...(resultData || [] ));
                    resultDataArray.push(perviousResult);
                } else {
                    resultDataArray.push(resultData || []);
                }

                const tmpCursorId = MasrshalObject.ExtractSubobject(tmpData, [{ name: "CURSOR_ID" }]) as IfsDataObjectType;
                this._cursorId = !tmpCursorId || tmpCursorId.isNull ? "" : tmpCursorId.value;

            } else if (fetchData) {
                resultDataArray.push((this._response as PlSqlMultiResponse).result[index]);
            } else {
                return this.ErrorResponse("Error in returned data. I can't find a record with result data.");
            }
        }

        if (this.multipleQuery) {
            this._response = { ok: true, errorText: "", partialResult: this.partialResult, bindings: bindingsArray, result: resultDataArray, request: this, connection: this.connection as Connection } as PlSqlMultiResponse;         
        } else {
            this._response = { ok: true, errorText: "", partialResult: this.partialResult, bindings: bindingsArray[0], result: resultDataArray[0], request: this, connection: this.connection as Connection } as PlSqlOneResponse;                      
        }
        return this._response;
    }


}