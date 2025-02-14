import { CharStream, CommonTokenStream }  from 'antlr4';
import Python3Lexer from './Python3Lexer';
import Python3Parser from './Python3Parser';
import * as fs from 'node:fs/promises';

async function main(filename: string) {
    const input = await fs.readFile(filename, 'utf8');
    const chars = new CharStream(input); // replace this with a FileStream as required
    const lexer = new Python3Lexer(chars);
    const tokens = new CommonTokenStream(lexer);
    const parser = new Python3Parser(tokens);
    const tree = parser.file_input()
    console.log(tree);
}

main("/home/harry/pyparse-test/main.py").catch(console.log);