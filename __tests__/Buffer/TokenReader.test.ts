import { BinaryWriter } from "../../src/Buffer/BinaryWriter"
import { TokenReader } from "../../src/Buffer/TokenReader"
import { BufferMarkers } from "../../src/Buffer/MarshalObject"


test("TokenReader, simple text", () => {
    const testStr = "This is test array";
    const testStr2 = "This is test array śćÓŁ Ń";

    const writer = new BinaryWriter();
    writer.WriteByte(BufferMarkers.BeginBufferMarker);
    writer.WriteByte(BufferMarkers.NameMarker);
    writer.WriteUTF8String(testStr);
    writer.WriteByte(BufferMarkers.ValueMarker);
    writer.WriteUTF8String(testStr2);
    writer.WriteByte(BufferMarkers.EndBufferMarker);

    const tr = new TokenReader(writer.ToUint8Array());
    
    tr.GetToken();
    expect(() => tr.MatchDelimiter(BufferMarkers.ValueMarker) ).toThrow(Error);
    tr.MatchDelimiter(BufferMarkers.BeginBufferMarker);
    tr.CheckDelimiter(BufferMarkers.NameMarker);
    expect(tr.GetToken()).toEqual(testStr);
    tr.CheckDelimiter(BufferMarkers.ValueMarker);
    expect(() => tr.CheckDelimiter(BufferMarkers.NameMarker)).toThrow(Error);
    expect(tr.GetToken()).toEqual(testStr2);
    tr.CheckDelimiter(BufferMarkers.EndBufferMarker);
    expect(tr.EndOfStream()).toEqual(true);
});


