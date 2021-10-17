import { BinaryWriter } from "../Buffer/BinaryWriter"
import { TokenReader } from "../Buffer/TokenReader"
import { Base64ToArray } from '../Buffer/utf8';
import { ToIfsString } from "../IFS/Util"
import { IfsDateStringToDate, IsEmpty } from "../IFS/Util"

export enum BufferMarkers  {
  ActionMarker = 0x1C,          //28
  BeginBufferMarker = 0x1B,     //27
  EndBufferMarker = 0x1A,       //26
  HeadMarker = 0x19,            //25
  NameMarker = 0x18,            //24
  TypeMarker = 0x17,            //23
  StatusMarker = 0x16,          //22
  ValueMarker = 0x15,           //21
  NullValueMarker = 0x14,       //20
  NoValueMarker = 0x13,         //19
  InvalidValueMarker = 0x12,    //18
  CountMarker = 0x11,           //17
  ChangedValueMarker = 0x10,    //16
  UnchangedValueMarker = 0x0F,  //15
  RowIdentityMarker = 0x0E,     //14
  
  BinaryDataMarker = 33         //33
}
export const MaxByteBufferMarkers = 0x1C;

export type IfsDataObjectType = { [k: string]: any };
export type IfsDataArrayType = Array<IfsDataObjectType>;
export type IfsDataType = (IfsDataObjectType | IfsDataArrayType | Array<IfsDataType>);

export type transfromFuncType = (path: string, value: IfsDataType) => IfsDataType;

export class MasrshalObject {

    private static Write4BytesLength(length : number, writer : BinaryWriter) {
        writer.WriteByte(length >> 24);
        writer.WriteByte((length & 0x00ff0000) >> 16);
        writer.WriteByte((length & 0x0000ff00) >> 8);
        writer.WriteByte( length & 0x000000ff);
    }

    private static Read4BytesLength(tr: TokenReader): number
    {
        const len1 = tr.ReadUByte();
        const len2 = tr.ReadUByte();
        const len3 = tr.ReadUByte();
        const len4 = tr.ReadUByte();
        return (len1 << 24) + (len2 << 16) + (len3 << 8) + len4;    
    }


    private static WriteTextLength(value: number, writer : BinaryWriter)
    {
        if (value < 64)
        {
            writer.WriteByte(value & 0x3F);
        }
        else if (value < 4096)
        {
            writer.WriteByte(((value >> 6) | 0x40) & 0x7F);
            writer.WriteByte((value >> 0) & 0x3F);
        }
        else if (value < 262144)
        {
            writer.WriteByte(((value >> 12) | 0x40) & 0x7F);
            writer.WriteByte(((value >> 6) | 0x40) & 0x7F);
            writer.WriteByte((value >> 0) & 0x3F);
        }
        else if (value < 16777216)
        {
            writer.WriteByte(((value >> 18) | 0x40) & 0x7F);
            writer.WriteByte(((value >> 12) | 0x40) & 0x7F);
            writer.WriteByte(((value >> 6) | 0x40) & 0x7F);
            writer.WriteByte((value >> 0) & 0x3F);
        }
        else if (value < 1073741824)
        {
            writer.WriteByte(((value >> 24) | 0x40) & 0x7F);
            writer.WriteByte(((value >> 18) | 0x40) & 0x7F);
            writer.WriteByte(((value >> 12) | 0x40) & 0x7F);
            writer.WriteByte(((value >> 6) | 0x40) & 0x7F);
            writer.WriteByte((value >> 0) & 0x3F);
        }
        else
        { 
            writer.WriteByte(((value >> 30) | 0x40) & 0x7F);
            writer.WriteByte(((value >> 24) | 0x40) & 0x7F);
            writer.WriteByte(((value >> 18) | 0x40) & 0x7F);
            writer.WriteByte(((value >> 12) | 0x40) & 0x7F);
            writer.WriteByte(((value >> 6) | 0x40) & 0x7F);
            writer.WriteByte((value >> 0) & 0x3F);
        }
    }

    private static ReadTextLength(tr: TokenReader): number
    {
        let val = 0;
        let b = tr.ReadUByte();
        while ((b & 0x40) == 0x40)
        {
            val <<= 6;
            val += (b & 0x3F);
            b = tr.ReadUByte(); 
        }
        val <<= 6;
        val += (b & 0x3F);

        return val;
    }

    private static WriteIfsDataToBuffer(data: IfsDataType, writer : BinaryWriter, bufferName? : string) {
        writer.WriteByte(BufferMarkers.BeginBufferMarker);
        if (bufferName) {
            writer.WriteByte(BufferMarkers.HeadMarker);
            writer.WriteUTF8String(bufferName);
        }
        if (!Array.isArray(data)) throw Error("Wrong IfsDataType");
        (data as IfsDataArrayType).forEach(element => {
            if (element.name) {
                writer.WriteByte(BufferMarkers.NameMarker);
                writer.WriteUTF8String(element.name);
            }
            if (element.type) {
                writer.WriteByte(BufferMarkers.TypeMarker);
                writer.WriteUTF8String(element.type);
            }
            if (element.status) {
                writer.WriteByte(BufferMarkers.StatusMarker);
                writer.WriteUTF8String(element.status);
            }

            const type = element.type || "";
            const delimiter = element.delimiter || (element.buffer ? BufferMarkers.BeginBufferMarker : BufferMarkers.ValueMarker);
            let value = element.value || "";
            if (element.isNull) {
                writer.WriteByte(BufferMarkers.NullValueMarker);
            } else if ((delimiter === BufferMarkers.ValueMarker) && (element.value === undefined)) {
                writer.WriteByte(BufferMarkers.NoValueMarker);
            } else if (delimiter != BufferMarkers.ValueMarker && (type != "R.B64")) {
                if (element.buffer) {
                    MasrshalObject.WriteIfsDataToBuffer(value, writer, element.bufferName );
                } else {
                    writer.WriteByte(delimiter);
                    writer.WriteUTF8String(value);                    
                }
            } else {
                writer.WriteByte(BufferMarkers.ValueMarker);
                if (type === "R.B64") {
                    if (element.buffer) {
                        writer.WriteByte(BufferMarkers.BinaryDataMarker);
                        const saveWriterOffset1 = writer.offset;
                        writer.Skip(4);
                        MasrshalObject.WriteIfsDataToBuffer(value, writer, element.bufferName);
                        const saveWriterOffset2 = writer.offset;
                        writer.offset = saveWriterOffset1;
                        MasrshalObject.Write4BytesLength(saveWriterOffset2 - saveWriterOffset1 - 4, writer);
                        writer.offset = saveWriterOffset2;
                    } else if (element.binary) {
                        writer.WriteByte(BufferMarkers.BinaryDataMarker);
                        if (value instanceof ArrayBuffer) value = new Uint8Array(value);
                        MasrshalObject.Write4BytesLength((value as Uint8Array).length, writer);
                        writer.WriteBytes(value as Uint8Array);
                    } else {
                        writer.WriteUTF8String(ToIfsString(value));
                    }
                }else if (type === "LPA" || type === "LPT") {
                    const length = writer.UTF8Length( value );
                    MasrshalObject.WriteTextLength(length, writer);
                    writer.WriteUTF8String(value, length);
                } else {
                    writer.WriteUTF8String(ToIfsString(value));
                }
            }
        });
        writer.WriteByte(BufferMarkers.EndBufferMarker);
    }

    private static ReadIfsDataFromBuffer( tr : TokenReader, path : string, transformFunc? : transfromFuncType ): IfsDataType {
        let bufferTable: IfsDataArrayType = [];
        let name: string, type: string, status: string;
        let item: { [k: string]: any } = {}
        let bufferName = "";
        
        tr.MatchDelimiter(BufferMarkers.BeginBufferMarker);
        if (tr.NextByte() == BufferMarkers.HeadMarker)
        {
            tr.offset++;
            bufferName = tr.GetToken()
            tr.offset--;
            tr.delimiter = BufferMarkers.BeginBufferMarker;
        }
        while (tr.delimiter != BufferMarkers.EndBufferMarker)
        {
            name = (tr.delimiter === BufferMarkers.NameMarker) ? tr.GetToken() : '';
            type = (tr.delimiter === BufferMarkers.TypeMarker) ? tr.GetToken() : '';
            status = (tr.delimiter === BufferMarkers.StatusMarker) ? tr.GetToken() : '';
            item = (tr.delimiter === BufferMarkers.ValueMarker || tr.delimiter === BufferMarkers.BeginBufferMarker) ? {} : { delimiter: tr.delimiter };
            if (name) item.name = name;
            if (type) item.type = type;
            if (status) item.status = status;

            switch (tr.delimiter)
            {
                case BufferMarkers.NullValueMarker:
                    item.isNull = true;
                    item.value = null;
                    tr.GetToken();
                    break;
                case BufferMarkers.NoValueMarker:
                    item.value = undefined;
                    tr.GetToken();
                    break;
                case BufferMarkers.ValueMarker:
                    if (type === "R.B64")
                    {
                        if (tr.NextByte() === BufferMarkers.BinaryDataMarker)
                        {
                            tr.offset++;
                            const bytesLength = MasrshalObject.Read4BytesLength(tr);
                            if (bytesLength > 0 && tr.NextByte() === BufferMarkers.BeginBufferMarker) {
                                item.buffer = true;
                                tr.GetToken();
                                item.value = this.ReadIfsDataFromBuffer(tr, path+'/'+name, transformFunc);
                                if (transformFunc)
                                    item = transformFunc(path, item);
                            } else {
                                item.binary = true;
                                item.value = tr.ReadBytes(bytesLength);
                            }
                            tr.GetToken();
                        }
                        else
                        {
                            item.value = tr.GetToken();
                        }
                    }
                    else if (type === "LPA" || type === "LPT")
                    {
                        const strLength = MasrshalObject.ReadTextLength(tr);
                        item.value = tr.ReadUTF8String(strLength);
                        tr.GetToken();
                    }
                    else
                    {
                        item.value = tr.GetToken();
                    }
                    break;
                case BufferMarkers.InvalidValueMarker:
                case BufferMarkers.ChangedValueMarker:
                case BufferMarkers.UnchangedValueMarker:
                case BufferMarkers.TypeMarker:
                case BufferMarkers.ActionMarker:
                case BufferMarkers.RowIdentityMarker:
                case BufferMarkers.CountMarker:
                    const value = tr.GetToken();
                    if (value) item.value = value;
                    break;
                case BufferMarkers.BeginBufferMarker:
                    if (bufferName) {
                        item.bufferName = bufferName;
                        bufferName = "";
                    }
                    item.buffer = true;
                    item.value = this.ReadIfsDataFromBuffer(tr, path + '/' + name, transformFunc);
                    if (transformFunc)
                        item = transformFunc(path, item);
                    tr.MatchDelimiter(BufferMarkers.EndBufferMarker);
                    break;
            }
            bufferTable.push(item);
        }
        tr.CheckDelimiter(BufferMarkers.EndBufferMarker);
        return bufferTable;
    }

    public static _Marshall(writer: BinaryWriter, data: IfsDataType) {
        if (!IsEmpty(data)) {
            if (Array.isArray(data) && Array.isArray(data[0])) {
                data.forEach(el => {
                    MasrshalObject.WriteIfsDataToBuffer(el, writer);    
                })
            } else {
                MasrshalObject.WriteIfsDataToBuffer(data, writer);
            }
        }
    }
    
    public static Marshall(data: IfsDataType): Uint8Array {
        const writer = new BinaryWriter();
        MasrshalObject._Marshall(writer, data);
        return writer.ToUint8Array();
    }

    public static Unmarshall(data: Uint8Array, transformFunc?: transfromFuncType): IfsDataType {
        if (data.byteLength === 0) return [];
        const tr = new TokenReader(data);
        let returnValue = []
        while (!tr.EndOfStream()) {
            tr.GetToken();
            returnValue.push( MasrshalObject.ReadIfsDataFromBuffer(tr, '', transformFunc)  );
        }
        return returnValue.length === 1 ? returnValue[0] : returnValue;
    }

    public static ExtractSubobject(startObj?: IfsDataType, path?: Array<number|{ [k: string]: any }>): (IfsDataType|undefined) {
        let currObj: (IfsDataType | undefined) = startObj;
        let nextRecord = false;
        try {
            if (startObj && path) {
                path.forEach(pathEl => {
                    if (currObj) {
                        if ((typeof pathEl === "number") && Array.isArray(currObj)) {
                            currObj = (pathEl < currObj.length) ? currObj[pathEl] : undefined;
                        } else if (typeof pathEl === "object" ) {
                            if (currObj && !Array.isArray(currObj) && ('value' in currObj)) {
                                currObj = currObj.value;
                            }
                            if (Array.isArray(currObj)) {
                                currObj = (currObj as IfsDataArrayType).find(el => {
                                    if (nextRecord) {
                                        return true;
                                    } else {
                                        let found = true;
                                        for (let [key, value] of Object.entries(pathEl)) {
                                            if (!key.startsWith("_") && (el[key] || "") != value) {
                                                found = false;
                                                break;
                                            }
                                        }
                                        if (found && ('_next' in pathEl) && pathEl._next) {
                                            found = false;
                                            nextRecord = true;
                                        }
                                        return found;
                                    }
                                });                                
                            } else {
                                return undefined;
                            }
                        } else {
                            return undefined;
                        }
                    }
                    return undefined;
                })            
            }
            return currObj;
        } catch {
            return undefined;
        }
    }

    public static IfsValueToJavascript(value: any, type: string): any {
        if (!value) return value;
        switch (type) {
            case "A":           //Alpha;
            case "LPA":         //Alpha;
            case "LT":          //LongText;
            case "T":           //Text;
            case "LPT":         //Text;
                return value;
            case "I":           //Integer;
                return parseInt(value);
            case "DEC":         //Decimal;
            case "N":           //Number;
                return parseFloat(value);
            case "B":           //Boolean;
                return value === "TRUE";
            case "R.B64":       //Binary;
                return typeof value === "string" ? Base64ToArray(value) : value;
            case "D":           //Date;
            case "DT":          //Time;
            case "DTS":         //TimeStamp;
                return IfsDateStringToDate( value );
            case "AGGREGATE":   //Aggregate;
            case "ASPECT":      //GenericAspect;
            case "ARRAY":       //Array;
            case "ENUM":        //Enumeration;
            case "R.SA":        //SimpleArray;
                return value;
            default:
                throw Error("Unsupported attribute type: " + type);
        }                                
    }


}
