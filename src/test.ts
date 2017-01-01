declare function require(x: string): any;

import {grammar_parser} from "./ruleparser";

let input = require("fs").readFileSync("/dev/stdin", "utf8");

let parse_result = grammar_parser.parse(input);

console.log(JSON.stringify(parse_result));
//console.log(grammar_parser.parse(input));
console.log(parse_result);

