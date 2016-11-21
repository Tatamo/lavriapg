/// <reference path="./parsergenerator.ts" />
declare function require(x: string): any;

//var s = require("fs").readFileSync("/dev/stdin", "utf8");

//var lexer = new Lexer.Lexer(Lexer.def);

var symbol_table = new ParserGenerator.TerminalSymbolDiscriminator(Lexer.def , ParserGenerator.def).symbol_table;

console.log(symbol_table);

new ParserGenerator.ParserGenerator(Lexer.def, ParserGenerator.def, symbol_table);
