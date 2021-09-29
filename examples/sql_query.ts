
import { Connection } from "ifs-ap"

let conn = new Connection("https://ifs.demo.com:48080/", "ifsapp", "ifsapp", "IFS10");


// Simple SQL query 
conn.Sql(`SELECT count(*) COUNT_ 
            FROM &AO.customer_info `)
.then(result => {    
    console.log(`Customers Count ${result.ok} ${result.errorText}`);
    console.log(result.result);
    /*
    Customers Count true
    [ { COUNT_: 1287 } ] 
    */
})


// Query with bindings parameter
conn.Sql(`SELECT customer_id,
                 name,
                 country
            FROM &AO.customer_info
           WHERE ROWNUM <= :count `,
         { "count" : 20 })
.then(result => {
    console.log(`Customers list, ${result.ok} ${result.errorText}`);
    console.log(result.result);
    /*
    Customers list, true
    [
      { CUSTOMER_ID: 'FR_AIRBUS', NAME: 'Airbus France', COUNTRY: 'ANDORRA' },
      { CUSTOMER_ID: 'FR_AIRBUS_GERMANY', NAME: 'Airbus Germany', COUNTRY: 'GERMANY' },
      ... next 18 records
    ]  
    */
})


// If in bindings parameters we have an array (not an object) then the query is executed multiple times and in returned results we have an array of responses.
conn.Sql(`SELECT :customer_id CUSTOMER_ID, 
                 &AO.Customer_Info_API.Get_Name( : customer_id) NAME 
            FROM dual`,
          [ { "customer_id": "AGIL" },
            { "customer_id": "FR_AIRBUS" },
            { "customer_id": "BP7" }
          ])
.then(result => {
    console.log(`CustomersNames ${result.ok} ${result.errorText}`);
    console.log(result.result);
    /*
    CustomersNames true
    [
      [ { CUSTOMER_ID: 'AGIL', NAME: 'Agility and Co UK' } ],
      [ { CUSTOMER_ID: 'FR_AIRBUS', NAME: 'Airbus France' } ],
      [ { CUSTOMER_ID: 'BP7', NAME: 'Harley Davidson' } ]
    ]
    */
})

// In the query, we can enter as a parameter the maximum number of returned and the number of skipped rows.
conn.Sql(`SELECT customer_id, 
                 name,
                 country
            FROM &AO.customer_info`,
         {}, 20, 20)  // bindings={}, maxRows=20, skipRows=20
.then(result => {
    console.log(`First 20 customers, count=${result.result.length}`);   
    console.log(result.result);
    /*
    First 20 customers, count=20
    [
      { CUSTOMER_ID: '50', NAME: 'OEM', COUNTRY: 'UNITED STATES' },
      { CUSTOMER_ID: 'JP', NAME: 'Jean Paule', COUNTRY: 'FRANCE' },
      ... next 18 records
    ]  
    */
    result.request.CloseCursor();
})



// If we use parameter maxRows then this query may be treated as a cursor.
// Later we can get the next records from the query and in the end, we can close the cursor.
conn.Sql(`SELECT customer_id, 
                 name,
                 country
            FROM &AO.customer_info`,
          {}, 20)  // maxRows=20
.then(result => {
    console.log(`20 customers, count=${result.result.length}`);   
    /*20 customers, count=20 */

    return result.request.Fetch(20);  // Get next 20 records
}).then(result => {
    console.log(`20 + next 20 customers, count=${result.result.length}`);
    /*20 + next 20 customers, count=40 */

    return result.request.CloseCursor();
});
