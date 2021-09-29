import { BinaryReader } from "./BinaryReader";
import { BufferMarkers, MaxByteBufferMarkers } from "./MarshalObject"
import { UTF8ArrayToString } from "./utf8"

export class TokenReader extends BinaryReader
{
	private _token : string = "";
	private _delimiter : number = 0;

	public GetToken() : string
	{
		this.Next();
		return this._token;
	}

	public MatchDelimiter(delimiter : number)
	{
		if (this._delimiter == delimiter)
			this.Next();
		else
			throw Error(`Expected delimiter ${delimiter} but found delimiter ${this._delimiter}.`);
	}

	public CheckDelimiter(delimiter : number)
	{
		if (this._delimiter != delimiter)
			throw new Error(`Expected delimiter ${delimiter} but found delimiter ${this._delimiter}.`);
	}

	public get delimiter() : number
	{
		return this._delimiter;
	}
	public set delimiter( value : number )
	{
		this._delimiter = value;
	}

	private Next()
	{		
		let b: number;
		let tokenStart = -1;

		while (true)
		{
			b = this.ReadUByte();
			if (b > MaxByteBufferMarkers) {
				if (tokenStart === -1)
					tokenStart = this.offset-1;
			} else {
				switch (b)
				{
					//case 0xff:
					//	throw new Error("Buffer parsing error");
					case BufferMarkers.RowIdentityMarker:
					case BufferMarkers.ActionMarker:
					case BufferMarkers.BeginBufferMarker:
					case BufferMarkers.EndBufferMarker:
					case BufferMarkers.NameMarker:
					case BufferMarkers.NullValueMarker:
					case BufferMarkers.NoValueMarker:
					case BufferMarkers.StatusMarker:
					case BufferMarkers.TypeMarker:
					case BufferMarkers.InvalidValueMarker:
					case BufferMarkers.CountMarker:
					case BufferMarkers.ValueMarker:
						this._token = (tokenStart === -1) ? "" : UTF8ArrayToString(this.uint8Array, tokenStart, this.offset - tokenStart-1);
						this._delimiter = b;
						return;

					case BufferMarkers.ChangedValueMarker:
					case BufferMarkers.UnchangedValueMarker:
						break;
					default:
						if (tokenStart === -1)
							tokenStart = this.offset-1;
						break;
				}				
			}
		}
	}
}
