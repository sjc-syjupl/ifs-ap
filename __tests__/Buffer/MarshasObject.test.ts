import * as fs from 'fs';
import { MasrshalObject, IfsDataType, IfsDataObjectType } from "../../src/Buffer/MarshalObject"

const folderTestFiles = "./__tests__/Buffer/TestFiles";

test("Object => Data => Object", () => {
	let obj, obj2, data;
	obj = testObject1;
	data = MasrshalObject.Marshall(obj);
	obj2 = MasrshalObject.Unmarshall(data);
	expect(obj).toEqual(obj2);

	obj = testObject2;
	data = MasrshalObject.Marshall(obj);
	expect(data).toEqual(testObject2Data);
	obj2 = MasrshalObject.Unmarshall(data);
	expect(obj).toEqual(obj2);

	obj = testObject3;
	data = MasrshalObject.Marshall(obj);
	obj2 = MasrshalObject.Unmarshall(data);
	expect(obj).toEqual(obj2);
});


test.each(fs.readdirSync(folderTestFiles).filter(e => e.endsWith("dat"))  )
	("Test file: %s", (file) => {
	const data = new Uint8Array(fs.readFileSync(folderTestFiles+"/"+file, null));

	const ifsObject = MasrshalObject.Unmarshall(data);
	const data2 = MasrshalObject.Marshall(ifsObject);
	expect(data).toEqual(data2);
	//console.log(file + ' DONE');
});

    
test("Transform and extract part", () => {
	const data = MasrshalObject.Marshall(testObject3);
	const obj2 = MasrshalObject.Unmarshall(data, TestTransformData);

	const objStauts = MasrshalObject.ExtractSubobject(obj2, [0, { name: "STATUS" }]);
	expect(objStauts).toEqual(testObject3Status);

	const objData = MasrshalObject.ExtractSubobject(obj2, [1, { name: "PLSQL_INVOCATION", buffer: true }, { buffer: true, name: "" }, { name: "COMMANDS", type: "ARRAY", buffer: true }, { name: "DATA", _next: true }, { name: "RESULT" }]);
	expect(objData).toHaveProperty('value')
	if (objData && "value" in objData)
		expect(objData.value).toEqual(testObject3Data);
});


function TestTransformData(path: string, value: IfsDataType): IfsDataType {
        if (path === "/PLSQL_INVOCATION//COMMANDS//RESULT") {
            if (("value" in value) && Array.isArray(value.value)) {
                const newValue: IfsDataObjectType = {};
                value.value.forEach(elem => {
                    newValue[elem.name] = elem.isNull ? null : MasrshalObject.IfsValueToJavascript( elem.value, elem.type );
                });                
                return newValue;
            }
        }
        return value;
}


const testObject1 = [
	{
		"name": "DocumentObjectConnection.DocumentObjectConnection",
		"buffer": true,
		"value": [
			{
				"bufferName": "Test data",
				"buffer": true,
				"value": [
					{
						"name": "OBJ_ID",
						"type": "LPA",
						"value": "AAB2QwAAFAACJKMAAp"
					},
					{
						"name": "OBJ_VERSION",
						"type": "LPA",
						"value": "20210729141748"
					},
					{
						"name": "DOC_CLASS",
						"type": "LPT",
						"status": "MN",
						"value": "400"
					},
					{
						"name": "DOC_NO",
						"type": "LPT",
						"status": "MN",
						"value": "1200516"
					},
					{
						"name": "DOC_SHEET",
						"type": "LPT",
						"status": "MN",
						"value": "1"
					},
					{
						"name": "DOC_REV",
						"type": "LPT",
						"status": "M",
						"value": "A1"
					},
					{
						"name": "LU_NAME",
						"type": "LPT",
						"status": "MN",
						"value": "CustomerOrder"
					},
					{
						"name": "KEY_REF",
						"type": "LPT",
						"status": "MN",
						"value": "ORDER_NO=BP10113^"
					},
					{
						"delimiter": 20,
						"name": "CATEGORY",
						"type": "LPT",
						"isNull": true,
						"value" : null
					},
					{
						"name": "COPY_FLAG",
						"type": "ENUM",
						"status": "M",
						"value": "OK"
					},
					{
						"name": "KEEP_LAST_DOC_REV",
						"type": "ENUM",
						"status": "M",
						"value": "LATEST_REVISION"
					},
					{
						"name": "SURVEY_LOCKED_FLAG",
						"type": "ENUM",
						"status": "M",
						"value": "UNLOCKED"
					},
					{
						"delimiter": 20,
						"name": "DOC_OBJECT_DESC",
						"type": "LPT",
						"isNull": true,
						"value" : null
					},
					{
						"name": "KEY_VALUE",
						"type": "LPT",
						"status": "N",
						"value": "BP10113^"
					},
					{
						"name": "REV_NO",
						"type": "N",
						"status": "N",
						"value": "1"
					},
					{
						"name": "DATE_CONNECTED",
						"type": "D",
						"value": "2021-07-29"
					},
					{
						"delimiter": 19,
						"name": "DATE_CONNECTED2",
						"type": "D",
						"value": undefined
					},
					{
						"name": "BINARY_DATA",
						"type": "R.B64",
						"binary": true,
						"value": new Uint8Array([34, 67, 32, 116, 101, 115, 116, 0, 255, 30, 34, 67, 32, 116, 101, 115, 116, 0, 255, 30, 34, 67, 32, 116, 101, 115, 116, 0, 255, 30])
					},
				]
			}
		]
	}
];

const testObject2 = [
	{
							"bufferName": "Test name",
                            "buffer": true,
                            "value": [
								{
									"bufferName": "Test name 2",
                                    "buffer": true,
                                    "value": []
                                }
                            ]
                        }
                    ];

const testObject2Data = new Uint8Array([
	27, 27, 25, 84, 101, 115, 116, 32,
	110, 97, 109, 101, 27, 25, 84, 101,
	115, 116, 32, 110, 97, 109, 101, 32,
	50, 26, 26, 26
]);

const testObject3Status = {
	"name": "STATUS",
	"type": "T",
	"status": "Q",
	"value": "DONE"
};

const testObject3Data =
	[
		{
			LPA_TYPE: 'AAB2QwAAFAACJKMAAp',
			LPT_TYPE: '400',
			ENUM_TYPE: 'OK',
			T_TYPE: 'TRUE',
			N_TYPE: 1.12,
			I_TYPE: 1,
			B_TYPE: true,
			B_TYPE2: false,
			DATE_TYPE: new Date(2021, 6, 29),
			DATE_TYPE2: new Date(2021,11,19,10,1,15),
			VALID_TO: null,
			BINARY: new Uint8Array([56, 52,95])
		},
		{
			LPA_TYPE: 'AAB2QwAAFAACJKMAAp',
			LPT_TYPE: '400',
			ENUM_TYPE: 'OK',
			T_TYPE: 'TRUE',
			N_TYPE: 1.12,
			I_TYPE: 1,
			B_TYPE: true,
			B_TYPE2: false,
			DATE_TYPE: new Date(2021, 6, 29),
			DATE_TYPE2: new Date(2021,11,19,10,1,15),
			VALID_TO: null,
			BINARY: new Uint8Array([56, 52,95])
		}
	];
		
const testObject3 =
[
	[
		testObject3Status,
	],
	[
		{
			"name": "PLSQL_INVOCATION",
			"buffer": true,
			"value": [
				{
					"delimiter": 14,
					"name": "DATA",
					"type": "PLSQL_SERVER.PLSQL_INVOCATION",
					"status": "Create",
					"value": "28abb8bb-5f23-411e-be8a-ef14b58b9a18"
				},
				{
					"buffer": true,
					"value": [
						{
							"name": "COMMANDS",
							"type": "ARRAY",
							"status": "*",
							"buffer": true,
							"value": [
								{
									"delimiter": 14,
									"name": "DATA",
									"type": "PLSQL_SERVER.COMMAND",
									"status": "Create",
									"value": "ebab30a4-3212-4b36-aab5-8bd69a301f54"
								},
								{
									"buffer": true,
									"value": [
										{
											"name": "RESULT",
											"type": "R.B64",
											"status": "*",
											"buffer": true,
											"value": [
												{
													"name": "DATA",
													"buffer": true,
													"value": [
																{
																	"name": "LPA_TYPE",
																	"type": "LPA",
																	"value": "AAB2QwAAFAACJKMAAp"
																},
																{
																	"name": "LPT_TYPE",
																	"type": "LPT",
																	"value": "400"
																},
																{
																	"name": "ENUM_TYPE",
																	"type": "ENUM",
																	"value": "OK"
																},
																{
																	"name": "T_TYPE",
																	"type": "T",
																	"value": "TRUE"
																},
																{
																	"name": "N_TYPE",
																	"type": "N",
																	"value": "1.12"
																},
																{
																	"name": "I_TYPE",
																	"type": "I",
																	"value": "1"
																},
																{
																	"name": "B_TYPE",
																	"type": "B",
																	"value": "TRUE"
																},
																{
																	"name": "B_TYPE2",
																	"type": "B",
																	"value": "FALSE"
																},
																{
																	"name": "DATE_TYPE",
																	"type": "D",
																	"value": "2021-07-29"
																},
																{
																	"name": "DATE_TYPE2",
																	"type": "D",
																	"value": "2021-12-19-10.01.15"
																},
																{
																	"delimiter": 20,
																	"name": "VALID_TO",
																	"type": "DTS",
																	"isNull": true,
																	"value" : null
																},
																{
																	"name": "BINARY",
																	"type": "R.B64",
																	"binary": true,
																	"value": new Uint8Array([56, 52,95])
																},
													]
												},
												{
													"name": "DATA",
													"buffer": true,
													"value": [
																{
																	"name": "LPA_TYPE",
																	"type": "LPA",
																	"value": "AAB2QwAAFAACJKMAAp"
																},
																{
																	"name": "LPT_TYPE",
																	"type": "LPT",
																	"value": "400"
																},
																{
																	"name": "ENUM_TYPE",
																	"type": "ENUM",
																	"value": "OK"
																},
																{
																	"name": "T_TYPE",
																	"type": "T",
																	"value": "TRUE"
																},
																{
																	"name": "N_TYPE",
																	"type": "N",
																	"value": "1.12"
																},
																{
																	"name": "I_TYPE",
																	"type": "I",
																	"value": "1"
																},
																{
																	"name": "B_TYPE",
																	"type": "B",
																	"value": "TRUE"
																},
																{
																	"name": "B_TYPE2",
																	"type": "B",
																	"value": "FALSE"
																},
																{
																	"name": "DATE_TYPE",
																	"type": "D",
																	"value": "2021-07-29"
																},
																{
																	"name": "DATE_TYPE2",
																	"type": "D",
																	"value": "2021-12-19-10.01.15"
																},
																{
																	"delimiter": 20,
																	"name": "VALID_TO",
																	"type": "DTS",
																	"isNull": true,
																	"value" : null
																},
																{
																	"name": "BINARY",
																	"type": "R.B64",
																	"binary": true,
																	"value": new Uint8Array([56, 52,95])
																},
													]
												},
											]
										},
									]
								}
							]
						}
					]
				}
			]
		}
	]
];
