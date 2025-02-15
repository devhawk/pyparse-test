import { CharStream, CommonTokenStream } from 'antlr4';
import Python3Lexer from './Python3Lexer';
import Python3Parser, { DecoratedContext, Import_fromContext, Import_nameContext } from './Python3Parser';
import * as fs from 'node:fs/promises';
import Python3ParserVisitor from './Python3ParserVisitor';

type AliasedName = {
    name: string;
    asName?: string;
};

function parseAliasedName(name: string): AliasedName {
    const pos = name.split('.');
    if (pos.length === 1) {
        return { name: pos[0] };
    }
    if (pos.length === 2) {
        return { name: pos[0], asName: pos[1] };
    }
    throw new Error(`Invalid AliasedName ${name}`);
}

function composeAliasedName({ name, asName }: AliasedName) : string {
    return asName ? `${name}.${asName}` : name;
}

type DecoratedFunction = {
    name: string;
    decorators: string[];
    start: number;
    stop: number;
}

class DbosPythonVisitor extends Python3ParserVisitor<void> {

    readonly nameImports = new Array<AliasedName>();
    readonly fromImports = new Map<string, Set<string>>();
    readonly decoratedFunctions = new Array<DecoratedFunction>();

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
            set.add(composeAliasedName(name));
        }
    }

    visitDecorated =(ctx: DecoratedContext) => {
        const func = ctx.funcdef() ?? ctx.async_funcdef().funcdef();
        if (func) {
            const start = ctx.start.start;
            const stop = ctx.stop?.stop ?? ctx.start.stop;
            const decorators = ctx.decorators().decorator_list().map(c => c.dotted_name().name_list().map(n => n.getText()).join('.'));
            const name = func.name().getText();
            this.decoratedFunctions.push({
                decorators,
                name,
                start,
                stop,
            })
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

    const visitor = new DbosPythonVisitor();
    visitor.visit(tree);
    
    for (const n of visitor.nameImports) {
        console.log(`import: ${asAliasedName(n)}`);
    }
    for (const [module, types] of visitor.fromImports) {
        console.log(`import from: ${module}`);
        for (const type of types) {
            console.log(`\t${asAliasedName(parseAliasedName(type))}`);
        }
    }
    for (const func of visitor.decoratedFunctions) {
        console.log(`function ${func.name}`);
        for (const dec of func.decorators) {
            console.log(`\t${dec}`);
        }

    }

    function asAliasedName({ name, asName }: AliasedName) {
        if (asName) {
            return `${name} as ${asName}`;
        }
        return name;

    }
}

main("/home/harry/pyparse-test/main.py").catch(console.log);