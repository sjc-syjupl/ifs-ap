# ifs-ap

This project is the simple equivalent of IFS.NET.Access Provider.<br>
This means this module allows to connect to IFS directly from Node.js.<br>
It currently supports IFS 8,9,10 versions and allows the execution of queries and PL/SQL code on IFS.<br>

## Install

```sh
npm install ifs-ap
```

## SQL query

```javascript
import { Connection } from "ifs-ap";
let conn = new Connection(
  "https://ifs.demo.com:48080/",
  "ifsapp",
  "ifsapp",
  "IFS10"
);

conn
  .Sql(
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

## Pl/SQL block

```javascript
import { Connection } from "ifs-ap";
let conn = new Connection(
  "https://ifs.demo.com:48080/",
  "ifsapp",
  "ifsapp",
  "IFS10"
);

conn
  .PlSql(
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
