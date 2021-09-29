export function NewId() : string {
    const newId = Date.now().toString(36).padEnd(8, '0') + Math.random().toString(36).substring(2, 13).padEnd(11, '0');
    //console.assert(newId.length === 19, "NewId length "+newId.length.toString()+" <> 19 :"+newId);
    return newId;
}


export function DateToIfsDateString(value: Date): string {
    const yyyy = value.getFullYear().toString();                                    
    const mm = (value.getMonth()+1).toString(); // getMonth() is zero-based         
    const dd = value.getDate().toString();
    const hh = value.getHours().toString();
    const mi = value.getMinutes().toString();
    const ss = value.getSeconds().toString();

    return yyyy + '-' + (mm[1]?mm:"0"+mm[0]) + '-' + (dd[1]?dd:"0"+dd[0]) + '-' + (hh[1]?hh:"0"+hh[0]) + '.' + (mi[1]?mi:"0"+mi[0]) + '.' + (ss[1]?ss:"0"+ss[0]);
}

export function IfsDateStringToDate(value: string): Date {
    //  yyyy-mm-dd-hh.mi.ss
    const dateParts = value.replace('.', '-').replace('.', '-').split('-').map( el => parseInt(el));
    if (dateParts.length == 3) {
        return new Date( dateParts[0], dateParts[1]-1, dateParts[2] );  // month is from 0                
    } else {
        return new Date( dateParts[0], dateParts[1]-1, dateParts[2], dateParts[3], dateParts[4], dateParts[5] );  // month is from 0        
    }
}

export function ToIfsString(value: any): any {
    if (typeof value === "string")
        return value;
    if (typeof value === "number")
        return value.toString();
    if (value instanceof Date)
        return DateToIfsDateString(value);
    return value;
}

export function IsEmpty(data: any): boolean {
    if (data) {
        for (let _i in data) return false;
    }
    return true;
}