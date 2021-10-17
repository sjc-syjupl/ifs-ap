import { BindingOneParameterType, BindingMultiParameterType } from "./Bindings"
import { IfsDataArrayType, IfsDataObjectType } from "../Buffer/MarshalObject"
import { _Message, Message } from "./Message"
import { Connection } from './Connection';

//----------------- Response -----------------
export interface OneResponse {
    readonly ok: boolean;
    readonly errorText: string;
    readonly partialResult: boolean;
    readonly bindings : IfsDataObjectType;
    readonly result: IfsDataArrayType;
    readonly connection: Connection;
}
export interface MultiResponse {
    readonly ok: boolean;
    readonly errorText: string;
    readonly partialResult: boolean;
    readonly bindings : Array<IfsDataObjectType>;
    readonly result: Array<IfsDataArrayType>;
    readonly connection: Connection;
}
export interface _PlSqlResponse {
    readonly ok: boolean;
    readonly errorText: string;
    readonly partialResult: boolean;
    readonly bindings : (IfsDataObjectType | Array<IfsDataObjectType>);
    readonly result: (IfsDataArrayType | Array<IfsDataArrayType>);
    readonly request: (PlSqlOneCommand | PlSqlMultiCommand);
    readonly connection: Connection;
}

export interface PlSqlOneResponse extends OneResponse {
    readonly partialResult: boolean;
    readonly bindings : IfsDataObjectType;
    readonly result: IfsDataArrayType;
    readonly request: PlSqlOneCommand;
}
export interface PlSqlMultiResponse extends MultiResponse {
    readonly partialResult: boolean;
    readonly bindings : Array<IfsDataObjectType>;
    readonly result: Array<IfsDataArrayType>;
    readonly request?: PlSqlMultiCommand;
}
export type PlSqlResponse<T> = 
    T extends BindingOneParameterType ? PlSqlOneResponse :
    T extends BindingMultiParameterType ? PlSqlMultiResponse :
    PlSqlOneResponse;
export type PlSqlCommand<T> = 
    T extends BindingOneParameterType ? PlSqlOneCommand :
    T extends BindingMultiParameterType ? PlSqlMultiCommand :
    PlSqlOneCommand;

export interface SqlOneResponse  extends OneResponse {
    readonly request: SqlOneCommand;
}
export interface SqlMultiResponse  extends MultiResponse {
    readonly request: SqlMultiCommand;
}
export type SqlResponse<T> = 
    T extends BindingOneParameterType ? SqlOneResponse :
    T extends BindingMultiParameterType ? SqlMultiResponse :
    SqlOneResponse;
export type SqlCommand<T> = 
    T extends BindingOneParameterType ? SqlOneCommand :
    T extends BindingMultiParameterType ? SqlMultiCommand :
    SqlOneCommand;


export type SqlResponseFetch<T> = 
    T extends SqlOneCommand ? SqlOneResponse :
    T extends SqlMultiCommand ? SqlMultiResponse :
    never;
export type SqlCommandFetch<T> =
    T extends SqlOneCommand ? SqlOneCommand :
    T extends SqlMultiCommand ? SqlMultiCommand :
    never;


//----------------- Command -----------------

export interface _IPlSqlCommand extends Message {
    get sqlString(): string;
    set sqlString(value: string);
    get executed(): boolean;

    get response(): (PlSqlOneResponse | PlSqlMultiResponse | SqlOneResponse | SqlMultiResponse);
    Execute(): Promise<(PlSqlOneResponse | PlSqlMultiResponse | SqlOneResponse| SqlMultiResponse)>;
}

export interface PlSqlOneCommand extends _IPlSqlCommand {
    get response(): PlSqlOneResponse ;
    Execute(): Promise<PlSqlOneResponse>;
}
export interface PlSqlMultiCommand extends _IPlSqlCommand {
    get response(): PlSqlMultiResponse ;
    Execute(): Promise<PlSqlMultiResponse>;
}


export interface _ISqlCommand extends _IPlSqlCommand {
    get maxRows(): (number | undefined);
    set maxRows(value: (number | undefined));

    get skipRows(): (number | undefined);
    set skipRows(value: (number | undefined));

    get partialResult(): (boolean | Array<boolean>);
    Fetch(rows: number): Promise<(SqlOneResponse | SqlMultiResponse)>;
}

export interface SqlOneCommand extends _ISqlCommand {
    get response(): SqlOneResponse ;
    Execute(): Promise<SqlOneResponse>;

    get partialResult(): boolean;
    Fetch(rows: number): Promise<SqlOneResponse>;
    CloseCursor(): Promise<PlSqlOneResponse>
}
export interface SqlMultiCommand extends _ISqlCommand {
    get response(): SqlMultiResponse ;
    Execute(): Promise<SqlMultiResponse>;

    get partialResult(): Array<boolean>;
    Fetch(rows: number): Promise<SqlMultiResponse>;
}

