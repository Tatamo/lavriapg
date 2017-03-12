declare function require(x: string): any;

import {grammar_parser} from "./precompiler/ruleparser";
import {grammar_grammar, constructGrammar} from "./precompiler/ruleparser";

import {ParserGenerator} from "./parsergenerator/parsergenerator";

import {PreCompiler} from "./precompiler/precompiler";


let input = require("fs").readFileSync("/dev/stdin", "utf8");

console.time("process");

//let parse_result = grammar_parser.parse(input);

//console.log(JSON.stringify(parse_result));
//console.log(grammar_parser.parse(input));

//console.log(new PreCompiler("./").exec(input));


console.log(new ParserGenerator(grammar_grammar).getParser(constructGrammar).parse(input));
//console.log(new ParserGenerator(grammar_grammar).getParsingTable());

console.timeEnd("process");
