import { Connection } from "ifs-ap"
import * as fs from 'fs';

const conn = new Connection("https://ifs.demo.com:48080/", "ifsapp", "ifsapp", "IFS10");
const attachment = conn.Attachments();

attachment.GetFirstKey('Voucher', 'ACCOUNTING_YEAR=2020^COMPANY=10^VOUCHER_NO=2020000000^VOUCHER_TYPE=I^')
    .then(result => {
        if (result) {
            return  attachment.GetFile( result );  // get attachment data by key
        }
        throw Error("Error");
    }).then(result => {
        if (result.fileName && result.fileData) {
            fs.writeFile( result.fileName, Buffer.from( result.fileData ), _err => {} );
        }

        conn.EndSession();
        console.log( "END" )
    })


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




