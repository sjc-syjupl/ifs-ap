export enum IfsVersion {
    IFS_10 = 1,
    IFS_9,
    IFS_8,
}

export interface ConnectionInterface {

    SetCredentials(loginId: string, loginPassword: string) : void;

    get loginCredentials(): string;

    get connectionString(): string;
    set connectionString(value: string);

    GetFullConnectionString(ifsInterface: string, operation: string): string;

    get ifsVersion(): IfsVersion;
    set ifsVersion(value: (string | IfsVersion));

    get locale(): string;
    set locale(value: string);

    get runAs(): string;
    set runAs(value: string);

    get debug(): boolean;
    set debug(value: boolean);

    get timeout(): number;
    set timeout(value: number);
    get transactionIsActive(): boolean;

    get transactionId(): string;
    set transactionId(value: string);

    get clientSessionId(): string;
    set clientSessionId(value: string);

    get clientId(): string;
    
}