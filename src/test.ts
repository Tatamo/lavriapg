declare function require(x: string): any;

import * as Lexer from "./lexer"
import {ParserGenerator} from "./parsergenerator";
import {bnf_lexer, bnf_parser, AST2SyntaxDef} from "./ruleparser";

import * as Immutable from "immutable";

declare function require(x: string): any;

var s = require("fs").readFileSync("/dev/stdin", "utf8");

/*
let input = "2 + 3 + 5";

let lexer = new Lexer.Lexer(Lexer.def);
let tokenlist = lexer.exec(input);

let pg = new ParserGenerator("S", def, Lexer.def);
let parser = pg.getParser();

console.log(JSON.stringify(parser.parse(tokenlist)));
*/

console.log("input:",s);

console.log("generate tokenlist");
var tokenlist = bnf_lexer.exec(s);

console.log("tokenlist:", tokenlist);

let parse_result = bnf_parser.parse(tokenlist);
console.log(JSON.stringify(parse_result));

console.log(JSON.stringify(AST2SyntaxDef(parse_result)));
