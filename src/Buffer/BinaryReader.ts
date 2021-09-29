import { UTF8ArrayToString } from "./utf8";

export enum SeekType{
	SEEK_CUR = 1,
	SEEK_SET = 2,
	SEEK_END = 3,
}

export class BinaryReader{

	private _buffer : ArrayBuffer;
	private _view : DataView;
	private _offset: number;
	private _array: Uint8Array;

	constructor ( mixed : (string|ArrayBuffer|Uint8Array) ){
		let buffer: ArrayBuffer;
		let array: Uint8Array;
		if (typeof mixed === 'string') {
			const length = mixed.length;
			buffer = new ArrayBuffer(length);
			array  = new Uint8Array(buffer);

			for (let i=0; i<length; ++i ) {
				array[i] = mixed.charCodeAt(i) & 0xff;
			}
		}
		else if (mixed instanceof ArrayBuffer) {
			buffer = mixed;
			array = new Uint8Array(mixed);
		}
		else if (mixed instanceof Uint8Array) {
			buffer = mixed.buffer;
			array = mixed;
		}
		else {
			throw new Error('BinaryReader() - Undefined buffer type');
		}

		this._buffer = buffer;
		this._array = array;
		this._view  = new DataView( buffer );
		this._offset = 0;
	}

	public get buffer(): ArrayBuffer {
		return this._buffer;
	}

	public get uint8Array(): Uint8Array {
		return this._array;
	}
	
	public EndOfStream(): boolean{
		return this._offset >= this._buffer.byteLength;
	}
	
	public NextByte() : number
	{
		return this._view.getInt8( this._offset );
	}

	public ReadByte() : number
	{
		return this._view.getInt8( this._offset++ );
	}
    
	public NextChar() : string
	{
		return String.fromCharCode( this._view.getInt8( this._offset ) );
	}
    
	public ReadChar() : string
	{
		return String.fromCharCode( this._view.getInt8( this._offset++ ) );
	}
	public ReadUByte() : number
	{
		return this._view.getUint8( this._offset++ );
	};
    /*
	public ReadUChar() : string
	{
		return String.fromCharCode( this._view.getUint8( this._offset++ ) );
	}

	public ReadShort() : number
	{
		const data = this._view.getInt16( this._offset, true );
		this._offset += 2;

		return data;
	};


	public ReadUShort() : number
	{
		const data = this._view.getUint16( this._offset, true );
		this._offset += 2;

		return data;
	};

	public ReadLong() : number
	{
		const data = this._view.getInt32( this._offset, true );
		this._offset += 4;

		return data;
	};

	public ReadInt() : number { return this._ReadLong(); }


	public ReadULong() : number
	{
		const data = this._view.getUint32( this._offset, true );
		this._offset += 4;

		return data;
	};
	public ReadUInt() : number { return this._ReadULong(); }

	public ReadFloat() : number
	{
		const data = this._view.getFloat32( this._offset, true );
		this._offset += 4;

		return data;
	};

	public ReadDouble() : number
	{
		const data = this._view.getFloat64( this._offset, true );
		this._offset += 8;

		return data;
	};

	public Tell()
	{
		return this._offset;
	};
    */
	public get offset(): number {
		return this._offset;
	}
	public set offset( value : number ) {
		this._offset = value;
	}

	public ReadBytes(len: number): Uint8Array {
		const uint8 = new Uint8Array(this._buffer.slice(this._offset, this._offset + len));
		this._offset += len;
		return uint8;
	}

	public ReadUTF8String(len: number): string {
		const str = UTF8ArrayToString(this._array, this._offset, len);
		this._offset += len;
		return str;
	}

	public ReadString( len : number ) : string
	{
		let out = '';	
		for (let i = 0; i < len; ++i) {
			out += String.fromCharCode(this._array[this._offset++]);
		}
		return out;
	};

	public Skip(len: number) {
		this._offset += len;
	}

	public Seek( index : number, type : SeekType = SeekType.SEEK_SET )
	{
		type    = type || SeekType.SEEK_SET;
		this._offset =
			type === SeekType.SEEK_CUR ? this._offset + index :
			type === SeekType.SEEK_END ? this._buffer.byteLength + index :
			index
		;
	};

}

