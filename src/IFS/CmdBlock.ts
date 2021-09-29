import { BindingParameterType } from "./Bindings"
import { IfsDataType, IfsDataArrayType, IfsDataObjectType  } from "../Buffer/MarshalObject"
import { ConnectionInterface } from './ConnectionInterface';
import { _Message } from "./Message"
import { PlSqlOneCommand, _IPlSqlCommand, _ISqlCommand, _PlSqlCommand, MultiResponse, PlSqlCommand, SqlCommand, PlSqlMultiResponse} from "./PlSqlCommand"
import { Connection } from './Connection';
//import { AttrType, ActionType } from "./AttrFunc"


export interface CmdBlock {
    get connection() : ConnectionInterface;
    get commands(): Array<(_IPlSqlCommand | _ISqlCommand)>;
    get response(): MultiResponse;
    get executed(): boolean;

    Sql<T extends BindingParameterType>(sqlString: string, bindings?: T, maxRows?: number, skipRows?: number, options?: { [k: string]: string }): SqlCommand<T>;
    PlSql<T extends BindingParameterType>(sqlString: string, bindings?: T, options?: { [k: string]: string }): PlSqlCommand<T>;
    BeginTransaction() : void;
    Commit(): PlSqlOneCommand;
    Rollback(): PlSqlOneCommand;
    EndSession(): PlSqlOneCommand;

    Execute(): Promise<MultiResponse>;
}

export class _CmdBlock extends _PlSqlCommand implements CmdBlock {
    private _commands : Array<_PlSqlCommand> = [];
    //protected _response?: _PlSqlResponse;
    protected _inTransaction = false;

    constructor ( connection : ConnectionInterface ){
        super(connection, "");
    }
    
    public get commands() : Array<(_IPlSqlCommand | _ISqlCommand)> {
        return this._commands;
    }

    get multipleQuery(): boolean {
        return true;
    }

    public get response(): MultiResponse {
        return super.response as MultiResponse;
    }    
    
    public Sql<T extends BindingParameterType>(sqlString: string, bindings?: T, maxRows?: number, skipRows?: number, options?: { [k: string]: string }): SqlCommand<T> {
        if (!_PlSqlCommand.IsSelectStatement(sqlString))
            throw Error("This is not SQL expression: "+ sqlString);
        const plsql = new _PlSqlCommand(this.connection, sqlString, bindings,
            {   ...(options || {}),
                ...(maxRows ? { maxRows: maxRows.toString() } : {}),
                ...(skipRows ? { skipRows : skipRows?.toString() } : {} )
            });
        this._commands.push(plsql);
        return plsql as unknown as SqlCommand<T>;
    }

    public PlSql<T extends BindingParameterType>(sqlString: string, bindings?: T, options?: { [k: string]: string }): PlSqlCommand<T> {
        if (!_PlSqlCommand.IsPlSqlStatement(sqlString))
            throw Error("This is not PL/SQL expression: "+ sqlString);
        const plsql = new _PlSqlCommand(this.connection, sqlString, bindings, options);
        this._commands.push(plsql);
        return plsql as PlSqlCommand<T>;
    }

    public BeginTransaction() {
        this._inTransaction = true;
    }

    public Commit(): PlSqlOneCommand {
        return this.PlSql("COMMIT", {} );
    }

    public Rollback() : PlSqlOneCommand {
        return this.PlSql("ROLLBACK", {} );
    }

    public EndSession() : PlSqlOneCommand {
        return this.PlSql("END_CLIENT_SESSION", {} );
    }

    /*
    public New(packageName: string, values: IfsAttrType, action: (ActionType|string) = ActionType.Prepare_And_Do): PlSqlCommand {
        const plsql = this.connection.New(packageName, values, action) as _PlSqlCommand;
        this._commands.push(plsql);
        return plsql;
    }

    public Modify(packageName: string, objid : string, objversion: string, values: IfsAttrType, action: (ActionType|string) = ActionType.Do): PlSqlCommand {
        const plsql = this.connection.Modify(packageName, objid, objversion, values, action) as _PlSqlCommand;
        this._commands.push(plsql);
        return plsql;
    }

    public Remove(packageName: string, objid : string, objversion: string, action: (ActionType|string) = ActionType.Do): PlSqlCommand {
        const plsql = this.connection.Remove(packageName, objid, objversion, action) as _PlSqlCommand;
        this._commands.push(plsql);
        return plsql;
    }
    
    public CfNewModify(packageName: string, objid : string, values: IfsAttrType, action: (ActionType|string) = ActionType.Do): PlSqlCommand {
        const plsql = this.connection.CfNewModify(packageName, objid, values, action) as _PlSqlCommand;
        this._commands.push(plsql);
        return plsql;
    }
    */

    public async Execute(): Promise<PlSqlMultiResponse> {
        return await super.Execute() as PlSqlMultiResponse;
    }
    
    protected RequestMessage(): [number, Uint8Array] {
        this._commands.forEach(command => {
            if(_PlSqlCommand.IsSelectStatement( this._sqlString )){
                command.bindings.forEach(bind =>
                    bind.bindings.forEach(el => {
                    el.direction = "IN";
                }))
            }
        });
        return super.RequestMessage();
    }
    

    public SizeOfRequestcommands(): number {
        let sizeOf = 0;
        this._commands.forEach(el => {
            sizeOf += el.SizeOfRequestcommands();
        });
        return sizeOf;
    }

    public CreateRequestCommands(): Array<IfsDataType> {
        const commands: Array<IfsDataType> = [];
        this._commands.forEach(el => {
            commands.push(...el.CreateRequestCommands());
        });
        return commands;
    }

    public MapResponse(ifsData: IfsDataType): PlSqlMultiResponse {
        const returnBindings : Array<IfsDataObjectType> = [];
        const returnResult: Array<IfsDataArrayType> = [];
        let errorText = "";
        
        this._commands.forEach(el => {
            const response = el.MapResponse(ifsData);
            if (!response.ok)
                errorText = response.errorText;
            returnBindings.push(response.bindings);
            returnResult.push(response.result);
        })
        if (errorText)
            return this.ErrorResponse(errorText) as PlSqlMultiResponse;

        this._response = { ok: true, errorText: "", partialResult: false, bindings: returnBindings, result: returnResult, request: this, connection: this.connection as Connection };
        return this._response as PlSqlMultiResponse;
   }

}