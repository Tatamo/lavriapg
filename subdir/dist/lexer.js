/// <reference path="../typings/index.d.ts" />
var Lexer;
(function (Lexer_1) {
    Lexer_1.def = [
        [null, " "],
        [null, /\t|\r|\n/],
        ["LPAREN", "("],
        ["RPAREN", ")"],
        ["PLUS", "+"],
        ["MINUS", "-"],
        ["ASTERISK", "*"],
        ["DIGITS", /[1-9][0-9]*/],
        ["INVALID", /./]
    ];
    var Lexer = (function () {
        //constructor(public def: Array<Array< string | RegExp >>){
        function Lexer(def) {
            this.def = def;
            for (var i = 0; i < this.def.length; i++) {
                var token_pattern = this.def[i][1];
                if (typeof token_pattern == "string") {
                    continue;
                }
                else if (token_pattern instanceof RegExp) {
                    continue;
                }
                throw new Error("invalid token definition: neither string nor RegExp object");
            }
        }
        Lexer.prototype.exec = function (str) {
            while (true) {
                if (str.length == 0)
                    break;
                for (var i = 0; i < this.def.length; i++) {
                    var token_type = this.def[i][0];
                    var token_pattern = this.def[i][1];
                    var match;
                    if (typeof token_pattern == "string") {
                        if (str.substring(0, token_pattern.length) != token_pattern)
                            continue;
                        ;
                        match = token_pattern;
                    }
                    else if (token_pattern instanceof RegExp) {
                        if (str.search(token_pattern) != 0)
                            continue;
                        match = token_pattern.exec(str)[0];
                    }
                    if (token_type != null)
                        console.log(token_type + " : " + match);
                    str = str.substring(match.length);
                    break;
                }
            }
        };
        return Lexer;
    }());
    Lexer_1.Lexer = Lexer;
})(Lexer || (Lexer = {}));
var s = require("fs").readFileSync("/dev/stdin", "utf8");
console.log(s);
var lexer = new Lexer.Lexer(Lexer.def);
lexer.exec(s);
