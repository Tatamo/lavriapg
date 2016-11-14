/// <reference path="../typings/index.d.ts" />
declare function require(x: string): any;
module Lexer{
	export var def = [
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
	export class Lexer{
		//constructor(public def: Array<Array< string | RegExp >>){
		constructor(public def: any){
				for(var i=0; i<this.def.length; i++){
					var token_pattern = this.def[i][1];
					if(typeof token_pattern == "string"){
						continue;
					}
					else if(token_pattern instanceof RegExp){
						continue;
					}
					throw new Error("invalid token definition: neither string nor RegExp object");
				}
		}
		exec(str: string){
			while(true){
				if(str.length == 0) break;
				for(var i=0; i<this.def.length; i++){
					var token_type = this.def[i][0];
					var token_pattern = this.def[i][1];
					var match:string;
					if(typeof token_pattern == "string"){
						if(str.substring(0,token_pattern.length) != token_pattern) continue;;
						match = token_pattern;
					}
					else if(token_pattern instanceof RegExp){
						if(str.search(token_pattern) != 0) continue;
						match = token_pattern.exec(str)[0];
					}
					if(token_type != null) console.log(token_type+" : "+match);
					str = str.substring(match.length);
					break;
				}
			}
		}
	}
}

var s = require("fs").readFileSync("/dev/stdin", "utf8");
console.log(s);
var lexer = new Lexer.Lexer(Lexer.def);
lexer.exec(s);
