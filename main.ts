import { CharStream, CommonTokenStream } from 'antlr4';
import Python3Lexer from './Python3Lexer';
import Python3Parser, { Import_fromContext, Import_nameContext } from './Python3Parser';
import * as fs from 'node:fs/promises';
import Python3ParserVisitor from './Python3ParserVisitor';

type AliasedName = {
    name: string;
    asName?: string;
};

class DbosPythonVisitor extends Python3ParserVisitor<void> {

    readonly nameImports = new Array<AliasedName>();
    readonly fromImports = new Map<string, Set<string>>();

    visitImport_name = (ctx: Import_nameContext) => {
        const dansCtx = ctx.dotted_as_names();
        for (const danCtx of dansCtx.dotted_as_name_list()) {
            const name = danCtx.dotted_name().name_list().map(n => n.getText()).join('.');
            const asName = danCtx.name()?.getText();
            this.nameImports.push({name, asName});
        }
    }

    visitImport_from = (ctx: Import_fromContext) => {
        const moduleName = ctx.dotted_name().name_list().map(n => n.getText()).join('.');
        const names = ctx.import_as_names().import_as_name_list().map(n => {
            const name = n.name_list()[0].getText();
            const asName = n.AS() ? n.name_list()[1].getText() : undefined;
            return { name, asName }
        })

        let set = this.fromImports.get(moduleName);
        if (!set) {
            set = new Set<string>();
            this.fromImports.set(moduleName, set);
        }
        for (const name of names) {
            const value = name.asName ? `${name.name}.${name.asName}` : name.name;
            set.add(value);
        }
    }
}


async function main(filename: string) {
    const input = await fs.readFile(filename, 'utf8');
    const chars = new CharStream(input); // replace this with a FileStream as required
    const lexer = new Python3Lexer(chars);
    const tokens = new CommonTokenStream(lexer);
    const parser = new Python3Parser(tokens);
    const tree = parser.file_input()

    const v = new DbosPythonVisitor();
    v.visit(tree);
}

main("/home/harry/pyparse-test/main.py").catch(console.log);