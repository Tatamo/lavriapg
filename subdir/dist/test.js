/// <reference path="../typings/index.d.ts" />
var Lexer;
(function (Lexer_1) {
    Lexer_1.def = [
        { "type": null, "pattern": " " },
        { "type": null, "pattern": /\t|\r|\n/ },
        { "type": "LPAREN", "pattern": "(" },
        { "type": "RPAREN", "pattern": ")" },
        { "type": "PLUS", "pattern": "+" },
        { "type": "ASTERISK", "pattern": "*" },
        { "type": "DIGITS", "pattern": /[1-9][0-9]*/ },
        { "type": "INVALID", "pattern": /./ }
    ];
    var Lexer = (function () {
        function Lexer(def) {
            this.def = def;
            //constructor(public def: any){
            for (var i = 0; i < this.def.length; i++) {
                var token_pattern = this.def[i].pattern;
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
            var result = [];
            while (true) {
                if (str.length == 0)
                    break;
                for (var i = 0; i < this.def.length; i++) {
                    var token_type = this.def[i].type;
                    var token_pattern = this.def[i].pattern;
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
                    if (token_type != null) {
                        console.log(token_type + " : " + match);
                        result.push([token_type, match]);
                    }
                    str = str.substring(match.length);
                    break;
                }
            }
            return result;
        };
        return Lexer;
    }());
    Lexer_1.Lexer = Lexer;
})(Lexer || (Lexer = {}));
/// <reference path="./lexer.ts" />
var s = require("fs").readFileSync("/dev/stdin", "utf8");
console.log(s);
var lexer = new Lexer.Lexer(Lexer.def);
console.log(lexer.exec(s));
