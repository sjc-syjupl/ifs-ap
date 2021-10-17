import { _PlSqlCommand } from "../../src/IFS/PlSqlCommand"
import { PlSqlOneResponse, PlSqlMultiResponse } from "../../src/IFS/PlSqlCommandTypes"
import { Connection } from "../../src/IFS/Connection"
import { _Message } from "../../src/IFS/Message"
import { _CmdBlock } from "../../src/IFS/CmdBlock"

test("PlSql Command", () => {
    const conn = new Connection("ifs.test.com");
    const plSql = new _PlSqlCommand(conn, "SELECT 1 A FROM DUAL");
    const newSql = "SELECT 222 A FROM DUAL";
    plSql.maxRows = 123;
    plSql.skipRows = 1234;
    plSql.sqlString = newSql;

    expect(plSql.maxRows).toEqual(123);
    expect(plSql.skipRows).toEqual(1234);
    expect(plSql.sqlString).toEqual(newSql);

    const newPlSql = "DECLARE BEGIN NULL; END;";
    plSql.sqlString = newPlSql;
    expect(plSql.sqlString).toEqual(newPlSql);

    const newPlSql2 = "BEGIN NULL; END;";
    plSql.sqlString = "NULL";
    expect(plSql.sqlString).toEqual(newPlSql2);

    ["COMMIT", "ROLLBACK", "FETCH", "END_CLIENT_SESSION"].forEach(el => {
        plSql.sqlString = el;
        expect(plSql.sqlString).toEqual(el);        
    })

});

test("PlSql starting sentence1", () => {
    expect( _PlSqlCommand.IsSelectStatement("SELECT")).toEqual(true);
    expect( _PlSqlCommand.IsSelectStatement("WITH")).toEqual(true);
    expect( _PlSqlCommand.IsSelectStatement(" select ")).toEqual(true);
    expect( _PlSqlCommand.IsSelectStatement("    with ")).toEqual(true);
    expect( _PlSqlCommand.IsSelectStatement("DECLARE")).toEqual(false);
    expect( _PlSqlCommand.IsSelectStatement("BEGIN")).toEqual(false);
    expect( _PlSqlCommand.IsSelectStatement("ELSE")).toEqual(false);

    expect( _PlSqlCommand.IsPlSqlStatement("DECLARE")).toEqual(true);
    expect( _PlSqlCommand.IsPlSqlStatement("BEGIN")).toEqual(true);
    expect( _PlSqlCommand.IsPlSqlStatement(" declare")).toEqual(true);
    expect( _PlSqlCommand.IsPlSqlStatement("    begin ")).toEqual(true);
    expect( _PlSqlCommand.IsPlSqlStatement("SELECT")).toEqual(false);
    expect( _PlSqlCommand.IsPlSqlStatement("WITH")).toEqual(false);
    expect(_PlSqlCommand.IsPlSqlStatement("ELSE")).toEqual(false);
    
})

test("PlSql starting sentence2", async () => {
    const conn = new TestIfsConnection("ifs.test.com");

    const spyExecute = jest.spyOn(_PlSqlCommand.prototype, "Execute").mockImplementation(async (): Promise<(PlSqlOneResponse | PlSqlMultiResponse)> => {
        return { ok: true, errorText: "", partialResult: false, bindings: {}, result: [], request: new _PlSqlCommand(conn, ""), connection: conn } as PlSqlOneResponse;
    });

    conn.Sql("declare").then(_r => {
        expect('error').toBe('ok');        
    }).catch(_r => {
        // OK 
    })

    conn.PlSql("select").then(_r => {
        expect('error').toBe('ok');        
    }).catch(_r => {
        // OK 
    })
    
    const cmdBlock = conn.CmdBlock();
    expect(() => cmdBlock.Sql("declare") ).toThrow(Error);
    expect(() => cmdBlock.Sql("select")).not.toThrow(Error);
    expect(() => cmdBlock.PlSql("declare") ).not.toThrow(Error);
    expect(() => cmdBlock.PlSql("select")).toThrow(Error);

    conn.Sql("select", {"par1":1}).then(_r => {
        expect('error').toBe('ok');        
    }).catch(_r => {
        // OK 
    })
    expect(() => cmdBlock.Sql("select", {"par1":1})).toThrow(Error);

    spyExecute.mockRestore();
})


class TestIfsConnection extends Connection{

    public SetDuringExecution(value: boolean) {
        this._duringExecution = value;
    }

    public SetAutoCommit(value: boolean) {
        this._autoCommit = value;
    }    
}


test("PlSql call messages", async () => {


    const emptyPlSql = "BEGIN NULL; END;";
    const conn = new TestIfsConnection("ifs.test.com");
    let status = true;
    let transactionId = "";

    const spyExecute = jest.spyOn(_PlSqlCommand.prototype, "Execute").mockImplementation(async (): Promise<(PlSqlOneResponse | PlSqlMultiResponse)> => {
        conn.transactionId = transactionId;
        return { ok: status, errorText: "", partialResult: false, bindings: {}, result: [], request: new _PlSqlCommand(conn, ""), connection: conn } as PlSqlOneResponse;
    });
    const spyCmdExecute = jest.spyOn(_CmdBlock.prototype, "Execute").mockImplementation(async (): Promise<PlSqlMultiResponse> => {
        return { ok: true, errorText: "", partialResult: false, bindings: [], result: [], request: new _PlSqlCommand(conn, ""), connection: conn } as PlSqlMultiResponse;
    });
    const spyCommit = jest.spyOn(Connection.prototype, "Commit").mockImplementation(async (): Promise<PlSqlOneResponse> => {
        return { ok: true, errorText: "", partialResult: false, bindings: {}, result: [], request: new _PlSqlCommand(conn, ""), connection: conn } as PlSqlOneResponse;
    });
    const spyRollback = jest.spyOn(Connection.prototype, "Rollback").mockImplementation(async (): Promise<PlSqlOneResponse> => {
        return { ok: true, errorText: "", partialResult: false, bindings: {}, result: [], request: new _PlSqlCommand(conn, ""), connection: conn } as PlSqlOneResponse;
    });

    const response1 = await conn.PlSql(emptyPlSql)
    expect(spyExecute.mock.calls.length).toBe(1);
    expect(spyCmdExecute.mock.calls.length).toBe(0);
    expect(spyCommit.mock.calls.length).toBe(0);
    expect(spyRollback.mock.calls.length).toBe(0);
    expect(response1.ok).toBe(true);

    conn.SetDuringExecution( true );
    conn.SetAutoCommit(false);
    await conn.PlSql(emptyPlSql)
    expect(spyExecute.mock.calls.length).toBe(1+1);
    expect(spyCmdExecute.mock.calls.length).toBe(0);
    expect(spyCommit.mock.calls.length).toBe(0);
    expect(spyRollback.mock.calls.length).toBe(0);

    conn.SetDuringExecution( true );
    conn.SetAutoCommit(true);
    await conn.PlSql(emptyPlSql)
    expect(spyExecute.mock.calls.length).toBe(2+1);
    expect(spyCmdExecute.mock.calls.length).toBe(0+1);
    expect(spyCommit.mock.calls.length).toBe(0);
    expect(spyRollback.mock.calls.length).toBe(0);

    conn.SetDuringExecution( false );
    conn.SetAutoCommit(true);
    transactionId = "_";
    await conn.PlSql(emptyPlSql)
    expect(spyExecute.mock.calls.length).toBe(3+1);
    expect(spyCmdExecute.mock.calls.length).toBe(1);
    expect(spyCommit.mock.calls.length).toBe(0+1);
    expect(spyRollback.mock.calls.length).toBe(0);

    conn.SetDuringExecution( false );
    conn.SetAutoCommit(true);
    transactionId = "_";
    status = false;
    const response9 = await conn.PlSql(emptyPlSql)
    expect(spyExecute.mock.calls.length).toBe(4+1);
    expect(spyCmdExecute.mock.calls.length).toBe(1);
    expect(spyCommit.mock.calls.length).toBe(1);
    expect(spyRollback.mock.calls.length).toBe(0+1);
    expect(response9.ok).toBe(false);



    spyExecute.mockRestore();
    spyCmdExecute.mockRestore();
    spyCommit.mockRestore();
    spyRollback.mockRestore();
});


test("CmdBlock", () => {
    const conn = new TestIfsConnection("ifs.test.com");

    const cmdBlock = conn.CmdBlock();
    cmdBlock.BeginTransaction();
    cmdBlock.Sql("SELECT");
    cmdBlock.PlSql("DECLARE;");
    cmdBlock.Commit();
    cmdBlock.Rollback();
    cmdBlock.EndSession();


    const sqlArray = cmdBlock.commands.map(x => x.sqlString);
    expect(sqlArray).toStrictEqual([ "SELECT", "DECLARE;", "COMMIT", "ROLLBACK", "END_CLIENT_SESSION" ]);
});


afterAll(() => {
    jest.restoreAllMocks();
});

