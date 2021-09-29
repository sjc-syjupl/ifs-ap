import { UTF8Length, WriteStringToUTF8Array } from "./utf8";

export class BinaryWriter{

	private _buffer : ArrayBuffer;
	private _view : DataView;
	private _offset : number;
	private _bufferLength: number;

	private static ADD_BUFFER_LENGTH = 1024;

	constructor (bufferLength : number = BinaryWriter.ADD_BUFFER_LENGTH){
		this._bufferLength = bufferLength;
		this._buffer = new ArrayBuffer( this._bufferLength );
		this._view   = new DataView( this._buffer );
		this._offset = 0;
	}

	private CheckBufferLength( addBytes : number){
		if (this._offset + addBytes > this._bufferLength){
			this._bufferLength += addBytes + BinaryWriter.ADD_BUFFER_LENGTH;
			this.ResizeBuffer( this._bufferLength );
		}
	}

	private ResizeBuffer( newByteLength : number ){
		const srcBuffer = this._buffer;
		const destBuffer = new ArrayBuffer(newByteLength);
		var copylen = this._offset;
	
		/* Copy 8 bytes at a time */
		let length = copylen >> 3;
		(new Float64Array(destBuffer, 0, length))
		  .set(new Float64Array(srcBuffer, 0, length));
	
		/* Copy the remaining 0 to 7 bytes, 1 byte at a time */
		const offset = length << 3;
		length = copylen - offset;
		(new Uint8Array(destBuffer, offset, length))
		  .set(new Uint8Array(srcBuffer, offset, length));

		this._buffer = destBuffer;
		this._view = new DataView( this._buffer );
	}

	public get offset() : number {
		return this._offset;
	}
	public set offset(value: number) {
		this._offset = value;
	}

	public get buffer() : ArrayBuffer {
		return this._buffer;
	}
	public set buffer(value: ArrayBuffer) {
		this._buffer = value;
	}
	public get uint8Array() : Uint8Array {
		return new Uint8Array( this._buffer );
	}

	public WriteByte( value : number )
	{
		this.CheckBufferLength(1);
		this._view.setInt8( this._offset++, value );
	}

	public WriteChar( value : string )
	{
		this.WriteByte( value.charCodeAt(0) );
	};

	public WriteUByte(value: number)
	{
		this.CheckBufferLength(1);
		this._view.setUint8( this._offset++, value);
	};

    /*
	public WriteUChar( value : string )
	{
		this._WriteUByte( value.charCodeAt(0) );
	};
    
	public WriteShort( value : number )
	{
		this._CheckBufferLength(2);
		this._view.setInt16( this._offset, value, true);
		this._offset += 2;
	};
    
	public WriteUShort( value : number )
	{
		this._CheckBufferLength(2);
		this._view.setUint16( this._offset, value, true );
		this._offset += 2;
	};
    
	public WriteInt( value : number )
	{
		this._CheckBufferLength(4);
		this._view.setInt32( this._offset, value, true );
		this._offset += 4;
	};
	public WriteLong( value : number ) { return this._WriteInt(value)	}
    
	public WriteUInt( value : number )
	{
		this._CheckBufferLength(4);
		this._view.setUint32( this._offset, value, true );
		this._offset += 4;
	};
	public WriteULong( value : number ) { return this._WriteUInt(value)	}
    
	public WriteFloat( value : number )
	{
		this._CheckBufferLength(4);
		this._view.setFloat32( this._offset, value, true );
		this._offset += 4;
	};

	public WriteDouble( value : number )
	{
		this._CheckBufferLength(8);
		this._view.setFloat64( this._offset, value, true );
		this._offset += 8;
	};

	public WriteLine() {
		this._WriteString("\n");
	}
    */
	
	public UTF8Length(str: string) : number {
		return UTF8Length(str);
	}

	public WriteBytes(uint8: Uint8Array) {
		this.CheckBufferLength(uint8.length);
		(new Uint8Array(this._buffer, this._offset, uint8.length))
		  .set(uint8);
		
		this._offset += uint8.length;
	}

	public WriteUTF8String(str: string, len?: number) {
		if (!len) len = this.UTF8Length(str);
		if (len === str.length) {
			this.WriteString(str);
		} else {
			this.CheckBufferLength(len);
			WriteStringToUTF8Array(str, this.uint8Array, len, this._offset);
			this._offset += len;					
		}
	}

	public WriteString( str : string )
	{
		const len = str.length;

		this.CheckBufferLength(len);
		for (let i = 0; i < len; ++i) {
			this._view.setUint8( this._offset++, str.charCodeAt(i) & 0xff );
		}
	};

	public Skip( count : number )
	{
		this.CheckBufferLength(count);
		this._offset += count;
	};

	public ToString(): string {
		let str = '';
		const uint8  = new Uint8Array(this._buffer);
		for (let i = 0; i < this._offset; ++i) {
			str += String.fromCharCode(uint8[i])
		}
		return str;
	}

	public ToUint8Array() : Uint8Array{
		return new Uint8Array(this._buffer.slice(0, this._offset));
	}
}

