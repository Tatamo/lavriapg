/// <reference path="../typings/index.d.ts" />
module Lexer{
	export type LexToken = string|symbol;
	export interface LexDefinitionSection{
		token: LexToken;
		pattern: string|RegExp;
	}
	export type LexDefinitions = Array<LexDefinitionSection>;
	export var def:LexDefinitions = [
		{token:null, pattern:" "},
		{token:null, pattern:/\t|\r|\n/},
		{token:"LPAREN", pattern:"("},
		{token:"RPAREN", pattern:")"},
		{token:"PLUS", pattern:"+"},
		{token:"ASTERISK", pattern:"*"},
		{token:"DIGITS", pattern:/[1-9][0-9]*/},
		{token:"INVALID", pattern:/./}
	];
	export type TokenList = Array<{token_type:LexToken, value:string}>;
	export class Lexer{
		constructor(public def: LexDefinitions){
				for(var i=0; i<this.def.length; i++){
					var token_pattern = this.def[i].pattern;
					if(typeof token_pattern == "string"){
						continue;
					}
					else if(token_pattern instanceof RegExp){
						continue;
					}
					throw new Error("invalid token definition: neither string nor RegExp object");
				}
		}
		exec(str: string):TokenList{
			var result:TokenList = [];
			while(true){
				if(str.length == 0) break;
				for(var i=0; i<this.def.length; i++){
					var token_type:LexToken = this.def[i].token;
					var token_pattern = this.def[i].pattern;
					var match:string;
					if(typeof token_pattern == "string"){
						if(str.substring(0,token_pattern.length) != token_pattern) continue;;
						match = token_pattern;
					}
					else if(token_pattern instanceof RegExp){
						if(str.search(token_pattern) != 0) continue;
						match = token_pattern.exec(str)[0];
					}
					// token_typeがnullなら処理を飛ばします
					if(token_type != null) {
						console.log(token_type," : "+match);
						result.push({token_type:token_type, value:match});
					}
					str = str.substring(match.length);
					break;
				}
			}
			return result;
		}
	}
}

