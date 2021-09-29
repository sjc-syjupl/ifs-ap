import { IfsVersion } from "../../src/IFS/ConnectionInterface"
import { Connection } from "../../src/IFS/Connection"
import { StringToBase64 } from "../../src//Buffer/utf8"


test("Init parameters", () => {
    let conn = new Connection("ifs.com");

    expect(conn.connectionString).toEqual("http://ifs.com/");
    expect(conn.ifsVersion).toEqual(IfsVersion.IFS_10);
    expect(conn.GetFullConnectionString("AccessPlsql", "Invoke") ).toEqual("http://ifs.com/main/compatibility/plsqlgateway/AccessPlsql/Invoke");
    expect(conn.locale).toEqual("en-US");
    expect(conn.runAs).toEqual("");
    expect(conn.transactionIsActive).toEqual(false);

    conn = new Connection("ifs.com", "ifsapp", "ifsapp", "IFS9", {locale: "pl-PL", runAs:"ALAIN", ifsVersion: "IFS10", timeout: 600});
    expect(conn.ifsVersion).toEqual(IfsVersion.IFS_9);
    expect(conn.GetFullConnectionString("AccessPlsql", "Invoke") ).toEqual("http://ifs.com/fndext/clientgateway/AccessPlsql/Invoke");
    expect(conn.locale).toEqual("pl-PL");
    expect(conn.runAs).toEqual("ALAIN");
    expect(conn.loginCredentials).toEqual('Basic ' + StringToBase64("ifsapp:ifsapp" ));
    expect(conn.timeout).toEqual(600);

    conn = new Connection("ifs.com", "ifsapp", "ifsapp", "IFS_8", {locale: "pl-PL", runAs:"ALAIN"});
    expect(conn.ifsVersion).toEqual(IfsVersion.IFS_8);
    expect(conn.GetFullConnectionString("AccessPlsql", "Invoke")).toEqual("http://ifs.com/fndext/clientgateway/AccessPlsql/Invoke");
    conn.ifsVersion = "9";
    expect(conn.ifsVersion).toEqual(IfsVersion.IFS_9);
    conn.ifsVersion = "IFS10";
    expect(conn.ifsVersion).toEqual(IfsVersion.IFS_10);
    conn.SetCredentials("ifsapp", "ifsapp");
    expect(conn.loginCredentials).toEqual('Basic ' + StringToBase64("ifsapp:ifsapp"));
    conn.locale = "en-US";
    expect(conn.locale).toEqual("en-US");
    conn.runAs = "ALAIN";
    expect(conn.runAs).toEqual("ALAIN");
    conn.timeout = 600;
    expect(conn.timeout).toEqual(600);
    expect(() => conn.ifsVersion = "11" ).toThrow(Error);


    expect(conn.clientId).toEqual("IFS.Node.AP");
    const currSessionId = conn.clientSessionId;
    expect(conn.clientSessionId).toEqual(currSessionId);

});

