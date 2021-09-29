import { StringToUTF8Array, UTF8ArrayToString, Base64ToArray, Base64ToString, ArrayToBase64, StringToBase64 } from "../../src/Buffer/utf8"

test("Base64 to Array", () => {
    const testStr = "This is test array";
    const testStrBase64 = "VGhpcyBpcyB0ZXN0IGFycmF5";
    const testArray = new Uint8Array([
            84, 104, 105, 115,  32, 105,
            115,  32, 116, 101, 115, 116,
            32,  97, 114, 114,  97, 121
            ]);

    expect( Base64ToArray(testStrBase64)).toEqual(testArray);
    expect( ArrayToBase64(testArray) ).toEqual(testStrBase64);

    expect( StringToUTF8Array(testStr)).toEqual(testArray);
    expect(UTF8ArrayToString(testArray)).toEqual(testStr);

    expect(UTF8ArrayToString(new Uint8Array())).toEqual("");
    expect(StringToUTF8Array("")).toEqual(new Uint8Array());
});


test("Base64 to string", () => {
    const testStr1 = "This is test string";
    const testStr1Base64 = "VGhpcyBpcyB0ZXN0IHN0cmluZw==";

    expect( StringToBase64(testStr1) ).toEqual(testStr1Base64);
    expect( Base64ToString(testStr1Base64) ).toEqual(testStr1);
});

test("Base64 to string with national characters", () => {
    const testStr1 = "This is test string ąćężźółń ĄĆĘŻŹÓŁŃ Ǽǽ 不的是 𒀂𒀵𠜎 𠜱 𠝹⠞ ⠙⠁⠧";
    const testStr1Base64 = "VGhpcyBpcyB0ZXN0IHN0cmluZyDEhcSHxJnFvMW6w7PFgsWEIMSExIbEmMW7xbnDk8WBxYMgx7zHvSDkuI3nmoTmmK8g7aCI7bCC7aCI7bC17aGB7byOIO2hge28sSDtoYHtvbnioJ4g4qCZ4qCB4qCn";

    expect( StringToBase64(testStr1).replace("\r\n","") ).toEqual(testStr1Base64);
    expect( Base64ToString(testStr1Base64) ).toEqual(testStr1);
});

