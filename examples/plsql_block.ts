
import { Connection } from "ifs-ap"

let conn = new Connection("https://ifs.demo.com:48080/", "ifsapp", "ifsapp", "IFS10");


// Example Pl/SQL code
// When executing PL/SQL code the result value is always in result.bindings object (not in result.result).
// Pl/Sql block will be automatically committed at the end of execution, by default (or rollback if returns error).
conn.PlSql(`
    DECLARE
        order_no_  VARCHAR2(20);
    BEGIN
        order_no_ := :order_no;
        IF &AO.Customer_Order_API.Get_Objstate( order_no_ ) = 'Planned' THEN
            &AO.Customer_Order_API.Set_Released( order_no_ );
        END IF;
        :objstate := &AO.Customer_Order_API.Get_Objstate( order_no_ );
    END;`,
  { "order_no":"P10576", "objstate":"" }
)
.then(result => {    
    console.log(`Pl/Sql result`);
    console.log(`status=${result.ok} error=${result.errorText}`);
    console.log(result.bindings);
    /*
    Pl/Sql result
    status=true error=
    { order_no: null, objstate: 'Released' }
    */
})



// In the same way as in a SQL query, in the bindings parameter we can deliver a table of objects.
// Then the Pl/SQL code is executed multiple times and in returned result, we have an array of responses.
conn.PlSql(`
    DECLARE
        order_no_  VARCHAR2(20);
    BEGIN
        order_no_ := :order_no;
        IF &AO.Customer_Order_API.Get_Objstate( order_no_ ) = 'Planned' THEN
            &AO.Customer_Order_API.Set_Released( order_no_ );
        END IF;
        :objstate := &AO.Customer_Order_API.Get_Objstate( order_no_ );
    END;`,
  [
    { "order_no": "P10576", "objstate": "" },
    { "order_no": "P10254", "objstate": "" },
    { "order_no": "P10329", "objstate": "" },
    { "order_no": "P10086", "objstate": "" },
  ]
)
.then(result => {    
    console.log(`Multiple Pl/Sql results`);
    console.log(`status=${result.ok} error=${result.errorText}`);
    console.log(result.bindings);
    /*
    Multiple Pl/Sql results
    status=true error=
    [
      { order_no: null, objstate: 'Released' },
      { order_no: null, objstate: 'PartiallyDelivered' },
      { order_no: null, objstate: 'Invoiced' },
      { order_no: null, objstate: 'Cancelled' }
    ]
    */
})



conn.BeginTransaction()
.then(result => {
  console.log( "Start transaction")  
  if (!result.ok) throw Error(result.errorText);
  return result.connection.PlSql(`
    DECLARE
        order_no_  VARCHAR2(20);
    BEGIN
        order_no_ := :order_no;
        IF &AO.Customer_Order_API.Get_Objstate( order_no_ ) = 'Planned' THEN
            &AO.Customer_Order_API.Set_Released( order_no_ );
        END IF;
        :objstate := &AO.Customer_Order_API.Get_Objstate( order_no_ );
    END;`,
    { "order_no": "P10557", "objstate": "" }
  );
})
.then(result => {
  console.log( `First Pl/Sql block, status=${result.ok} error=${result.errorText}`)  
  if (!result.ok) throw Error(result.errorText);
  return result.connection.PlSql(`
    DECLARE
        order_no_  VARCHAR2(20);
    BEGIN
        order_no_ := :order_no;
        IF &AO.Customer_Order_API.Get_Objstate( order_no_ ) = 'Planned' THEN
            &AO.Customer_Order_API.Set_Released( order_no_ );
        END IF;
        :objstate := &AO.Customer_Order_API.Get_Objstate( order_no_ );
    END;`,
    { "order_no": "P10254", "objstate": "" }
  );
})
.then(result => {
  console.log( `Second Pl/Sql block, status=${result.ok} error=${result.errorText}`)  
  if (!result.ok) throw Error(result.errorText);
  console.log( 'Commit')  
  result.connection.Commit();
})
.catch(result => {
  console.log( result )
  console.log( 'Rollback')  
  result.connection.Rollback();
})
/*
Start transaction
First Pl/Sql block, status=true error=
Second Pl/Sql block, status=true error=
Commit
*/
