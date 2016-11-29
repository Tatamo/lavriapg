/// <reference path="./parsergenerator.ts" />
declare function require(x: string): any;

//var s = require("fs").readFileSync("/dev/stdin", "utf8");

//var lexer = new Lexer.Lexer(Lexer.def);

//var terminal_symbol_discriminator = new ParserGenerator.SymbolDiscriminator(Lexer.def , ParserGenerator.def);

//console.log("symbol table:",terminal_symbol_discriminator.getAllSymbolsMap());

new ParserGenerator.ParserGenerator("EXP", ParserGenerator.def, Lexer.def);
