declare function require(x: string): any;

import * as Lexer from "./lexer"
import {ParserGenerator} from "./parsergenerator";
//import {bnf_lexer, bnf_parser, AST2SyntaxDef} from "./ruleparser";
import {def, syntax, constructGrammar} from "./ruleparser";

import * as Immutable from "immutable";

declare function require(x: string): any;

let input = require("fs").readFileSync("/dev/stdin", "utf8");

let lexer = new Lexer.Lexer(def);
let tokenlist = lexer.exec(input);

let pg = new ParserGenerator("GRAMMAR", syntax);
let parser = pg.getParser();

let parse_result = parser.parse(tokenlist);

console.log(JSON.stringify(parse_result));
console.log(parser.parse(tokenlist, constructGrammar));

/*parser.parse(tokenlist, constructGrammar).syntax.forEach((syntax)=>{
	console.log(syntax.ltoken, syntax.pattern);
});
*/

