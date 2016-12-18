declare function require(x: string): any;

import * as Lexer from "lexer"
import {ParserGenerator} from "./parsergenerator";
import {def} from "./syntaxdef";

import * as Immutable from "immutable";

let input = "2 + 3 + 5";

let lexer = new Lexer.Lexer(Lexer.def);
let tokenlist = lexer.exec(input);

let pg = new ParserGenerator("S", def, Lexer.def);
let parser = pg.getParser();

console.log(JSON.stringify(parser.parse(tokenlist)));
