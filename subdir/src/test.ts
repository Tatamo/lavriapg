import * as Lexer from "./lexer";

declare function require(x: string): any;

var s = require("fs").readFileSync("/dev/stdin", "utf8");
console.log(s);
var lexer = new Lexer.Lexer(Lexer.def);
console.log(lexer.exec(s));

