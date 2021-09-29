import {IsEmpty} from "./Util"

const TYPE_VARCHAR2: unique symbol = Symbol("VARCHAR2");
const TYPE_NUMBER: unique symbol = Symbol("NUMBER");
const TYPE_INTEGER: unique symbol = Symbol("INTEGER");
const TYPE_DATE: unique symbol = Symbol("DATE");
const TYPE_CLOB: unique symbol = Symbol("CLOB");
const TYPE_BLOB: unique symbol = Symbol("BLOB");

export const BindingType = {
  TYPE_VARCHAR2,
  TYPE_NUMBER,
  TYPE_INTEGER,
  TYPE_DATE,
  TYPE_CLOB,
  TYPE_BLOB,
} as const;

export type BindingValueType = (string | number | Date | Uint8Array | ArrayBuffer | symbol | {direction:string, type:string, value:any } );

type OneBindingObjectType = { direction: string, name: string, value: BindingValueType, type: string };
export type BindingArrayType = Array<OneBindingObjectType>;


export type BindingOneParameterType = { [k: string]: BindingValueType };
export type BindingMultiParameterType = Array<BindingOneParameterType>;
export type BindingParameterType = BindingOneParameterType | BindingMultiParameterType;


export class Bindings {
    protected _bindings: BindingArrayType = [];

    constructor(bindings?: BindingOneParameterType) {
        if (bindings) this.AddBinding(bindings);
    }

    public get bindings() : BindingArrayType {
        return this._bindings;
    }

    public AddBinding(bindings: BindingOneParameterType) {
        if (IsEmpty(bindings)) return;
        if (!this._bindings) this._bindings = [];
        for (let [key, value] of Object.entries(bindings)) {
            let newValue: BindingValueType;
            let type = '';
            if (typeof value === "symbol") {                
                switch (value) {
                    case BindingType.TYPE_VARCHAR2:
                        newValue = '';
                        type = 'LPT';
                        break;
                    case BindingType.TYPE_INTEGER:
                        newValue = 0;
                        type = 'I';
                        break;
                    case BindingType.TYPE_NUMBER:
                        newValue = 0;
                        type = 'N';
                        break;
                    case BindingType.TYPE_DATE:
                        newValue = new Date(2000, 0, 1);
                        type = 'DT';
                        break;
                    case BindingType.TYPE_CLOB:
                        newValue = '';
                        type = "LT";
                        break;
                    case BindingType.TYPE_BLOB:
                        newValue = new Uint8Array();
                        type = 'R.B64';
                        break;
                    default:
                        throw Error('Wrong parameter binding type');
                }
                this._bindings.push({ direction:'OUT', name : key, value: newValue, type: type });
            } else if (typeof value === "object" && "direction" in value) {
                this._bindings.push({ direction:value["direction"], name : key, value: value["value"], type: value["type"] });
            } else {
                newValue = value instanceof ArrayBuffer ? new Uint8Array(value) : value                
                this._bindings.push({ direction:'IN_OUT', name : key, value: newValue, type: this.GetIfsType(key, newValue) });
            }
        }                
    }

    private GetIfsType(name: string, value: any): string {
        if (typeof value === "string") {
            if (value.length <= 4000) {
                return "LPT";  // Text
            } else {
                return "LT";   // LongText
            }
        } else if (typeof value === "number") {
            return Number.isInteger(value) ? "I" :  "N";
        } else if (value instanceof Date) {
            return "DT";
        } else if (value instanceof Uint8Array || value instanceof ArrayBuffer) {
            return "R.B64";
        }
        throw new Error(`Invalid bind variable type for name=${name}. Should be one of (string|nmber|Date|Uint8Array|ArrayBuffer)`);
    }

}

export class BindingsArray {
    private _bindings?: Array<Bindings>;
    private _multipleQuery = false;
    
    get bindingsArray(): Array<Bindings> {
        return this._bindings || [];
    }

    get multipleQuery(): boolean {
        return this._multipleQuery;
    }

    public AddBinding(bindings: BindingParameterType) {
        if (IsEmpty(bindings)) return;
        if (Array.isArray(bindings) ) {
            this._multipleQuery = true;
            this._bindings = []
            bindings.forEach(el => {
                this._bindings?.push(new Bindings(el));
            })
        } else {
            if (!this._bindings || this._bindings.length === 0)
                this._bindings = [ new Bindings() ]
            if (this._bindings) {
                this._bindings[0].AddBinding(bindings);
            }
        }           
    }

}