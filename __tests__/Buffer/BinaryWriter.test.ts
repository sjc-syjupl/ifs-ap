import { BinaryWriter } from "../../src/Buffer/BinaryWriter"
import { BinaryReader, SeekType } from "../../src/Buffer/BinaryReader"
import { UTF8Length } from "../../src/Buffer/utf8"

test("simple text", () => {
        const testStr = "This is test array";
        const testArray = new Uint8Array([
                84, 104, 105, 115,  32, 105,
                115,  32, 116, 101, 115, 116,
                32,  97, 114, 114,  97, 121
                ]);

        const writer = new BinaryWriter();
        expect(writer.ToUint8Array()).toEqual(new Uint8Array()); //empty array 

        writer.WriteString(testStr);
        expect(writer.ToString()).toEqual(testStr);
        expect(writer.ToUint8Array()).toEqual(testArray);
});

test("mixed values in buffer", () => {
        const testStr = "This is test array";
        const testStrUtf8 = "This is test array ąćół ";
        const testStrUtf8Len = UTF8Length(testStrUtf8);
        const byteTest = 123;
        const charTest = "A";
        const skeepBytes = 1200;
        const arrayTest = new Uint8Array([34, 67, 32, 116, 101, 115, 116, 0, 255, 30, 34, 67, 32, 116, 101, 115, 116, 0, 255, 30, 34, 67, 32, 116, 101, 115, 116, 0, 255, 30]);

        const writer = new BinaryWriter();
        /* 1 */ writer.WriteString(testStr);
        /* 2 */ writer.WriteUByte(testStrUtf8Len);
                writer.WriteUTF8String(testStrUtf8);
        /* 3 */ writer.WriteByte(byteTest);
        /* 4 */ writer.WriteChar(charTest);
                writer.Skip(skeepBytes);
        /* 5 */ writer.WriteBytes(arrayTest);

        const reader = new BinaryReader(writer.ToUint8Array());
        /* 1 */ expect(reader.ReadString(testStr.length)).toEqual(testStr);
                reader.Seek(0, SeekType.SEEK_SET);
                expect(reader.ReadString(testStr.length)).toEqual(testStr);
        /* 2 */ expect(reader.NextByte()).toEqual(testStrUtf8Len);
                expect(reader.ReadUByte()).toEqual(testStrUtf8Len);
                expect(reader.ReadUTF8String(testStrUtf8Len)).toEqual(testStrUtf8);
                reader.Seek(-1 * testStrUtf8Len, SeekType.SEEK_CUR);
                expect(reader.ReadUTF8String(testStrUtf8Len)).toEqual(testStrUtf8);
        /* 3 */ expect(reader.ReadByte()).toEqual(byteTest);
                expect(reader.EndOfStream()).toEqual(false);
        /* 4 */ expect(reader.ReadChar()).toEqual(charTest);
                reader.Skip(skeepBytes);
        /* 5 */ expect(reader.ReadBytes(arrayTest.length)).toEqual(arrayTest);

                expect(reader.EndOfStream()).toEqual(true);

        const reader2 = new BinaryReader(writer.ToString());
        expect(reader.buffer).toEqual(reader2.buffer);
});
