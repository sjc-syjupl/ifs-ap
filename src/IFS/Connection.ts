import { StringToBase64 } from "../Buffer/utf8"
import { BindingParameterType } from "./Bindings"
import { NewId } from "./Util"
import { _PlSqlCommand} from './PlSqlCommand';
import { PlSqlOneCommand, PlSqlResponse, PlSqlOneResponse, SqlResponse, _ISqlCommand } from './PlSqlCommandTypes';
import { CmdBlock, _CmdBlock } from "./CmdBlock"
import { ConnectionInterface, IfsVersion } from "./ConnectionInterface"
import { AttachmentsInterface } from "./AttachmentsInterface"
import { Attachments } from "./Attachments"
//import { AttrFunc, AttrType, ActionType } from "./AttrFunc"

export type ConnectionOptions = ({ locale? : string, runAs? : string, ifsVersion?: (string|IfsVersion), timeout?:number});



export class Connection implements ConnectionInterface {
    protected static _clientId = "IFS.Node.AP";
    
    protected _connectionString: string = "";
    protected _loginId: string = "";
    protected _loginCredentials: string = "";
    protected _locale: string = "";
    protected _runAs: string = "";
    protected _timeout: number = 60000;
    protected _transactionId: string = "";
    protected _clientSessionId: string = "";
    protected _ifsVersion: IfsVersion = IfsVersion.IFS_10;
    protected _debug: boolean = false;
    protected _autoCommit: boolean = true;
    protected _duringExecution: boolean = false;

    constructor(connectionString: string, loginId?: string, loginPassword?: string, ifsVersion? : string, options?: ConnectionOptions) {
        if (options) {
            this._locale = options.locale || "";
            this._runAs = options.runAs || "";
            this.ifsVersion = options.ifsVersion || IfsVersion.IFS_10;
            this._timeout = options.timeout || 60000;
        }
        this.ifsVersion = ifsVersion || this.ifsVersion || IfsVersion.IFS_10;
        this.connectionString = connectionString;
        if (loginId) {
            this.SetCredentials(loginId, loginPassword || "");
        }
    }

    public Clone(): Connection {
        const newConnection = new Connection(this._connectionString);
        newConnection._loginId = this._loginId;
        newConnection._loginCredentials = this._loginCredentials;
        newConnection._locale = this._locale;
        newConnection._runAs = this._runAs;
        newConnection._timeout = this._timeout;
        newConnection._ifsVersion = this._ifsVersion;
        return newConnection;
    }

    public SetCredentials(loginId: string, loginPassword: string) {
        this._clientSessionId = "";
        this._loginId = loginId || "";
        this._loginCredentials = 'Basic ' + StringToBase64(this._loginId + ":" + loginPassword)
    }

    public get loginCredentials(): string {
        return this._loginCredentials;
    }

    public get connectionString(): string {
        return this._connectionString;
    }
    public set connectionString(value: string) {
        if (value.indexOf("//") === -1)
            value = 'http://' + value;
        if (value.indexOf("/", value.indexOf("//") + 2) === -1)
            value += "/";
        value = value.substring(0, value.indexOf("/", value.indexOf("//") + 2) + 1);
        this._connectionString = value;
    }

    public GetFullConnectionString(ifsInterface: string, operation: string): string {
        //https://docs.ifs.com/techdocs/Foundation1/010_overview/210_security/090_exposing_to_internet/
        let fullConnectionString = this._connectionString;
        if (this._ifsVersion === IfsVersion.IFS_10) {
            fullConnectionString += (ifsInterface === "AccessPlsql") ? "main/compatibility/plsqlgateway" : "main/compatibility/clientgateway";
        } else {  //IFS_8 and IFS_9
            fullConnectionString += "fndext/clientgateway";
        }
        fullConnectionString += `/${ifsInterface}/${operation}`;
        return fullConnectionString;
    }

    public get ifsVersion(): IfsVersion {
        return this._ifsVersion;
    }
    public set ifsVersion(value: (string | IfsVersion)) {
        if (typeof value === "string") {
            value = value.trim().toUpperCase();
            switch (value) {
                case "10": 
                case "IFS10": 
                case "IFS_10":
                    value = IfsVersion.IFS_10;
                    break;
                case "9": 
                case "IFS9": 
                case "IFS_9":
                    value = IfsVersion.IFS_9;
                    break;
                case "8": 
                case "IFS8": 
                case "IFS_8":
                    value = IfsVersion.IFS_8;
                    break;
                default:
                    throw Error(`Wrong IFS version ${value}. Example value: IFS_10.`)
            }
        }
        this._ifsVersion = value;
    }

    public get locale(): string {
        return this._locale || "en-US";
    }
    public set locale(value: string) {
        this._locale = value;
    }

    public get runAs(): string {
        return this._runAs;
    }
    public set runAs(value: string) {
        this._clientSessionId = "";
        this._runAs = value;
    }

    public get debug(): boolean {
        return this._debug;
    }
    public set debug(value: boolean) {
        this._debug = value;
    }

    public get timeout(): number {
        return this._timeout;
    }
    public set timeout(value: number) {
        this._timeout = value;
    }

    public get transactionIsActive(): boolean {
        return this._transactionId != "";
    }

    public get transactionId(): string {
        return this._transactionId;
    }
    public set transactionId(value: string) {
        this._transactionId = value;
    }

    public get clientSessionId(): string {
        if (!this._clientSessionId) this._clientSessionId = NewId();
        return this._clientSessionId;
    }

    public get clientId(): string {
        return Connection._clientId;
    }

    public CmdBlock(): CmdBlock {
        return new _CmdBlock(this);
    }
   
    public async Sql<T extends BindingParameterType>(sqlString: string, bindings?: T, maxRows?: number, skipRows?: number, options?: { [k: string]: string }): Promise<SqlResponse<T>> {
        if (!_PlSqlCommand.IsSelectStatement(sqlString))
            throw Error("This is not SQL expression: "+ sqlString);
        const result = await (new _PlSqlCommand(this, sqlString, bindings,
            {
                ...(options || {}),
                ...(maxRows ? { maxRows: maxRows.toString() } : {}),
                ...(skipRows ? { skipRows : skipRows?.toString() } : {} )
            }) as PlSqlOneCommand).Execute();
        return result as SqlResponse<T>;
    }

    public async PlSql<T extends BindingParameterType>(sqlString: string, bindings?: T, options?: { [k: string]: string }): Promise<PlSqlResponse<T>> {
        if (!_PlSqlCommand.IsPlSqlStatement(sqlString))
            throw Error("This is not PL/SQL expression: "+ sqlString);
        if (!this._autoCommit) {
            return await (new _PlSqlCommand(this, sqlString, bindings, options) as PlSqlOneCommand).Execute() as PlSqlResponse<T>;            
        } else if (!this._duringExecution) {
            this._duringExecution = true;
            let response = await (new _PlSqlCommand(this, sqlString, bindings, options) as PlSqlOneCommand).Execute() as PlSqlResponse<T>;
            if (this.transactionId) {
                let commitResponse: PlSqlOneResponse;
                if (response.ok) {
                    commitResponse = await this.Commit();
                } else {
                    commitResponse = await this.Rollback();
                }
                if (!commitResponse.ok) {
                    response = {
                        ...response,
                        ok: false,
                        errorText: (response.errorText ? response.errorText + '; ' : '') + commitResponse.errorText
                    }
                }
            }
            this._duringExecution = false;
            return response;
        } else {
            const newConnection = this.Clone();
            let response = await (new _PlSqlCommand(newConnection, sqlString, bindings, options) as PlSqlOneCommand).Execute() as PlSqlResponse<T>;
            const cmdBlock = newConnection.CmdBlock();
            if (newConnection.transactionId) {
                if (response.ok) {
                    cmdBlock.Commit();
                } else {
                    cmdBlock.Rollback();
                }                
            }
            cmdBlock.EndSession();
            const cmdBlockResponse = await cmdBlock.Execute();
            if (!cmdBlockResponse.ok) {
                response = {
                    ...response,
                    ok: false,
                    errorText: (response.errorText ? response.errorText + '; ' : '') + cmdBlockResponse.errorText
                }
            }
            return response;
        }
    }

    public async BeginTransaction(): Promise<PlSqlOneResponse> {
        const newConnection = this.Clone();
        newConnection._autoCommit = false;
        const plSql = new _PlSqlCommand(this, "");
        plSql.response = { ok: true, errorText: "", partialResult: false, bindings: {}, result: [], request: plSql as PlSqlOneCommand, connection: newConnection };
        return plSql.response;
    }

    private async _CommitRollback(procName: string): Promise<PlSqlOneResponse> {
        const plSql = new _PlSqlCommand(this, procName);
        if (this.transactionId) {
            const response = await plSql.Execute() as PlSqlOneResponse;
            console.assert(!this.transactionId);
            return response;
        } else {
            plSql.response = { ok: true, errorText: "", partialResult: false, bindings: {}, result: [], request: plSql as PlSqlOneCommand, connection: this  };
            return plSql.response;
        }
    }

    public async Commit(): Promise<PlSqlOneResponse> {
        return this._CommitRollback( "COMMIT" );
    }

    public async Rollback(): Promise<PlSqlOneResponse> {
        return this._CommitRollback( "ROLLBACK" );
    }

    public async EndSession(): Promise<PlSqlOneResponse> {
        const plSql = new _PlSqlCommand(this, "END_CLIENT_SESSION");
        if (this._clientSessionId) {
            await plSql.Execute() as PlSqlOneResponse;            
        } else {
            plSql.response = { ok: true, errorText: "", partialResult: false, bindings: {}, result: [], request: plSql as PlSqlOneCommand, connection: this  };
        }
        this._clientSessionId = "";
        this.transactionId = "";
        return plSql.response as PlSqlOneResponse;
    }

    public Attachments(): AttachmentsInterface {
        return new Attachments(this);
    }

    /*
    public New(packageName: string, values: IfsAttrType, action: (ActionType|string) = ActionType.Prepare_And_Do): PlSqlCommand {
        return new IfsAttrFunc(this).New( packageName, values, action);
    }

    public Modify(packageName: string, objid : string, objversion: string, values: IfsAttrType, action: (ActionType|string) = ActionType.Do): PlSqlCommand {
        return new IfsAttrFunc(this).Modify( packageName, objid, objversion, values, action);
    }

    public Remove(packageName: string, objid : string, objversion: string, action: (ActionType|string) = ActionType.Do): PlSqlCommand {
        return new IfsAttrFunc(this).Remove( packageName, objid, objversion, action);
    }
    
    public CfNewModify(packageName: string, objid : string, values: IfsAttrType, action: (ActionType|string) = ActionType.Do): PlSqlCommand {
        return new IfsAttrFunc(this).CfNewModify( packageName, objid, values, action);
    }

    public CfRemove(packageName: string, objid : string, values: IfsAttrType, action: (ActionType|string) = ActionType.Do): PlSqlCommand {
        return new IfsAttrFunc(this).CfNewModify( packageName, objid, values, action);
    }
    */

}




