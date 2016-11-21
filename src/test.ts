/// <reference path="./parsergenerator.ts" />
declare function require(x: string): any;

//var s = require("fs").readFileSync("/dev/stdin", "utf8");

//var lexer = new Lexer.Lexer(Lexer.def);

var token_table = new ParserGenerator.TerminalSymbolDiscriminator(Lexer.def , ParserGenerator.def).token_table;

console.log(token_table);
