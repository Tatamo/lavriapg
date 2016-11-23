/// <reference path="./parsergenerator.ts" />
declare function require(x: string): any;

//var s = require("fs").readFileSync("/dev/stdin", "utf8");

//var lexer = new Lexer.Lexer(Lexer.def);

var terminal_symbol_discriminator = new ParserGenerator.TerminalSymbolDiscriminator(Lexer.def , ParserGenerator.def);

console.log("symbol table:",terminal_symbol_discriminator.getAllSymbolsMap());

new ParserGenerator.ParserGenerator(ParserGenerator.def, terminal_symbol_discriminator);
