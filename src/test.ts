declare function require(x: string): any;

import {grammar, grammar_parser} from "./ruleparser";

import {ParserGenerator} from "./parsergenerator";

let input = require("fs").readFileSync("/dev/stdin", "utf8");

let parse_result = grammar_parser.parse(input);
/*

//console.log(JSON.stringify(parse_result));
//console.log(grammar_parser.parse(input));
console.log(parse_result);
console.log();

console.log(new ParserGenerator(grammar).getParsingTable());
*/
/*
console.time();
console.log(new ParserGenerator(parse_result).getParsingTable());
//(new ParserGenerator("GRAMMAR", parse_result).getParsingTable());
console.timeEnd();
*/

