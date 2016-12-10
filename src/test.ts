declare function require(x: string): any;

import * as Lexer from "lexer"
import {ParserGenerator} from "./parsergenerator";
import {def} from "./syntaxdef";

//var s = require("fs").readFileSync("/dev/stdin", "utf8");

//var lexer = new Lexer.Lexer(Lexer.def);

//var terminal_symbol_discriminator = new ParserGenerator.SymbolDiscriminator(Lexer.def , ParserGenerator.def);

//console.log("symbol table:",terminal_symbol_discriminator.getAllSymbolsMap());

new ParserGenerator.ParserGenerator("EXP", def, Lexer.def);
