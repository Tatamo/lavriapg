declare function require(x: string): any;

import * as Lexer from "./lexer"
import {ParserGenerator} from "./parsergenerator";
//import {bnf_lexer, bnf_parser, AST2SyntaxDef} from "./ruleparser";
import {def} from "./syntaxdef";

import * as Immutable from "immutable";

declare function require(x: string): any;
/*
var s = require("fs").readFileSync("/dev/stdin", "utf8");

console.log("input:",s);

console.log("generate tokenlist");
var tokenlist = bnf_lexer.exec(s);

console.log("tokenlist:", tokenlist);

let parse_result = bnf_parser.parse(tokenlist);
console.log(JSON.stringify(parse_result));

console.log(JSON.stringify(AST2SyntaxDef(parse_result)));
*/


let input = "2 + 3 * 5";

let lexer = new Lexer.Lexer(Lexer.def);
let tokenlist = lexer.exec(input);

let pg = new ParserGenerator("EXP", def, Lexer.def);
let parser = pg.getParser();

let parse_result = parser.parse(tokenlist);
console.log(JSON.stringify(parse_result));
console.log(parser.parse(tokenlist, (token:string, value:string, children:Array<any>)=>{
	console.log(token, value, children);
	switch(token){
		case "DIGITS":
			return +value;
		case "ATOM":
			if(children.length == 1) return children[0];
			else return children[1];
		case "TERM":
			if(children.length == 1){
				return children[0];
			}
			else{
				return children[0]*children[2];
			}
		case "EXP":
			if(children.length == 1){
				return children[0];
			}
			else{
				return children[0]+children[2];
			}
		default:
			return null;
	}
}));

