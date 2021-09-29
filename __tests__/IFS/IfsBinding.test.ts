import { BindingsArray, Bindings, BindingType } from "../../src/IFS/Bindings"

test("Test binding parameter", () => {
    let binding: Bindings;

    binding = new Bindings();
    expect( binding.bindings.length ).toEqual(0);

    binding.AddBinding( {} );
    expect( binding.bindings.length ).toEqual(0);


    let longString = "test";
    for (let i = 1; i < 4500; i++){
        longString += "_";
    }
     
    const expectedBindings =
        [
            { direction: "IN_OUT", name: 'BIND_STRING', value: "STRING", type:"LPT" },
            { direction: "IN_OUT", name: 'BIND_NUMBER', value: 123.6, type:"N" },
            { direction: "IN_OUT", name: 'BIND_INTEGER', value: 67, type:"I" },
            { direction: "IN_OUT", name: 'BIND_DATE', value: new Date(2021, 5, 17), type:"DT" },
            { direction: "IN_OUT", name: 'BIND_CLOB', value: longString, type:"LT" },
            { direction: "IN_OUT", name: 'BIND_BINARY', value: new Uint8Array([56, 82, 23]), type:"R.B64" },
            { direction: "IN_OUT", name: 'BIND_BINARY2', value: new Uint8Array(new ArrayBuffer(2)), type:"R.B64" },
            { direction: "OUT", name: 'BIND_STRING2', value: "", type:"LPT" },
            { direction: "OUT", name: 'BIND_NUMBER2', value: 0, type:"N" },
            { direction: "OUT", name: 'BIND_INTEGER2', value: 0, type:"I" },
            { direction: "OUT", name: 'BIND_DATE2', value: new Date(2000, 0, 1), type:"DT" },
            { direction: "OUT", name: 'BIND_CLOB2', value: "", type:"LT" },
            { direction: "OUT", name: 'BIND_BLOB2', value: new Uint8Array(), type:"R.B64" },
        ];

    binding = new Bindings({
        'BIND_STRING': "STRING",
        'BIND_NUMBER': 123.6,
        'BIND_INTEGER': 67,
        'BIND_DATE': new Date(2021,5,17),
        'BIND_CLOB': longString,
        'BIND_BINARY': new Uint8Array([56, 82,23]),
        'BIND_BINARY2': new ArrayBuffer(2),
        'BIND_STRING2': BindingType.TYPE_VARCHAR2,
        'BIND_NUMBER2': BindingType.TYPE_NUMBER,
        'BIND_INTEGER2': BindingType.TYPE_INTEGER,
        'BIND_DATE2': BindingType.TYPE_DATE,
        'BIND_CLOB2': BindingType.TYPE_CLOB,
        'BIND_BLOB2': BindingType.TYPE_BLOB,
    });
    expect(binding.bindings).toEqual(expectedBindings);


    binding = new Bindings();
    binding.AddBinding({
        'BIND_STRING': "STRING",
        'BIND_NUMBER': { type: "N", value: 123.6, direction: "IN_OUT" }
    });
    binding.AddBinding({
        'BIND_INTEGER': 67,
        'BIND_DATE': new Date(2021, 5, 17),
        'BIND_CLOB': longString,
        'BIND_BINARY': new Uint8Array([56, 82,23]),
        'BIND_BINARY2': new ArrayBuffer(2),
    });
    binding.AddBinding({
        'BIND_STRING2': BindingType.TYPE_VARCHAR2,
        'BIND_NUMBER2': BindingType.TYPE_NUMBER,
        'BIND_INTEGER2': BindingType.TYPE_INTEGER,
        'BIND_DATE2': BindingType.TYPE_DATE,
        'BIND_CLOB2': BindingType.TYPE_CLOB,
        'BIND_BLOB2': BindingType.TYPE_BLOB,
    });
    expect(binding.bindings).toEqual( expectedBindings  );

});

test("Test wrong parameter", () => {

    expect(() => new Bindings({ 'BIND_STRING': Symbol('aa') })).toThrow(Error);

});


test("Test multi bindings", () => {

    const expectedBindings =
        [
            { direction: "IN_OUT", name: 'BIND_STRING', value: "STRING", type:"LPT" },
        ];

    const bindings = new BindingsArray();
    bindings.AddBinding({ 'BIND_STRING': "STRING" });
    expect(bindings.multipleQuery).toEqual( false );
    expect(bindings.bindingsArray.length).toEqual( 1 );
    expect(bindings.bindingsArray[0].bindings).toEqual( expectedBindings );

    const bindings2 = new BindingsArray();
    bindings2.AddBinding( [ { 'BIND_STRING': "STRING" }, { 'BIND_STRING': "STRING" } ]);
    expect(bindings2.multipleQuery).toEqual( true );
    expect(bindings2.bindingsArray.length).toEqual( 2 );
    expect(bindings2.bindingsArray[0].bindings).toEqual( expectedBindings );
    expect(bindings2.bindingsArray[1].bindings).toEqual( expectedBindings );

});
