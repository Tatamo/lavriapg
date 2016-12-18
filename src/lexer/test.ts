import {lexrule_lexer, lexrule_parser, AST2LexDef} from "./ruleparser";
import {Lexer} from "./lexer";

declare function require(x: string): any;

var s = require("fs").readFileSync("/dev/stdin", "utf8");
console.log("input:",s);

console.log("generate tokenlist");
var tokenlist = lexrule_lexer.exec(s);

console.log("tokenlist:", tokenlist);

let parse_result = lexrule_parser.parse(tokenlist);
console.log(JSON.stringify(parse_result));

console.log("generate lex rule");

console.log(AST2LexDef(parse_result));
