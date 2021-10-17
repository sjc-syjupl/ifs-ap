# ifs-ap

This is a package allowed to connect to the IFS ERP system from the Node.js environment.<br>
<br>
If you create your own application (like an app on the phone or website) and want to get some data from the IFS ERP system you have two options.<br>

- The first option is to use IFS Access Provider, a package delivered by IFS.<br>
  Unfortunately, those packages delivered by IFS are only for only two programming languages, .Net and Java.<br>
  This forces us to use servers written in those two languages, and all servers are written in a different language (line for example Node.js) are excluded from the possibility to connect to IFS.<br>
- The second option is connected to Oracle directly, but this type of connection many times are forbidden because of licence limitations.<br>
<p>
The purpose of this package is to expand the above possibilities by allowing to connect to IFS from the Node.js ecosystem.
This package connects with the IFS Extender Server and exchanges messages in the same binary format as IFS Access Provider do.<br>
Look to the folder with examples to get more information about functions provided by this library.<br>
<br>
The next step, I hope, will be allowed to connect the app directly to IFS without any servers in the middle.<br>

## Install

```sh
npm install ifs-ap
```

## SQL query

```javascript
import { Connection } from "ifs-ap";
const conn = new Connection("https://ifs.demo.com:48080/", "ifsapp", "ifsapp", "IFS10" );

conn.Sql(
    `SELECT customer_id,
            name,
            country
       FROM &AO.customer_info
      WHERE ROWNUM <= :count `,
    { count: 20 }
  )
  .then((result) => {
    console.log(result.result);
    /*
    [
      { CUSTOMER_ID: 'FR_AIRBUS', NAME: 'Airbus France', COUNTRY: 'ANDORRA' },
      { CUSTOMER_ID: 'FR_AIRBUS_GERMANY', NAME: 'Airbus Germany', COUNTRY: 'GERMANY' },
      ... next 18 records
    ]  
    */
  });
```

## PL/SQL block

```javascript
import { Connection } from "ifs-ap";
const conn = new Connection("https://ifs.demo.com:48080/", "ifsapp", "ifsapp", "IFS10" );

conn.PlSql(
    `
    DECLARE
        order_no_  VARCHAR2(20);
    BEGIN
        order_no_ := :order_no;
        IF &AO.Customer_Order_API.Get_Objstate( order_no_ ) = 'Planned' THEN
            &AO.Customer_Order_API.Set_Released( order_no_ );
        END IF;
        :objstate := &AO.Customer_Order_API.Get_Objstate( order_no_ );
    END;`,
    { order_no: "P10576", objstate: "" }
  )
  .then((result) => {
    console.log(result.bindings);
    /*
    { order_no: null, objstate: 'Released' }
    */
  });
```

## Download Attachment
```javascript
import { Connection } from "ifs-ap";
import * as fs from 'fs';
const conn = new Connection("https://ifs.demo.com:48080/", "ifsapp", "ifsapp", "IFS10" );
const attachment = conn.Attachments();

attachment.GetFilesByRef('Voucher', 'ACCOUNTING_YEAR=2020^COMPANY=10^VOUCHER_NO=2020000000^VOUCHER_TYPE=I^') // get all attachments by lu and ref
    .then(result => {
        if (result) {
            console.log( result );
            for(const file of result){
                if (file.fileName && file.fileData) {
                    fs.writeFile( file.fileName, Buffer.from( file.fileData ), _err => {} );
                }
            }
        }
    })
```

