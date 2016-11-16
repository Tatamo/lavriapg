/// <reference path="../typings/index.d.ts" />
module Lexer{
	export interface LexDefinitionSection{
		type: string;
		pattern: string|RegExp;
	}
	export interface LexDefinitions extends Array<LexDefinitionSection>{}
	export var def:LexDefinitions = [
		{"type":null, "pattern":" "},
		{"type":null, "pattern":/\t|\r|\n/},
		{"type":"LPAREN", "pattern":"("},
		{"type":"RPAREN", "pattern":")"},
		{"type":"PLUS", "pattern":"+"},
		{"type":"ASTERISK", "pattern":"*"},
		{"type":"DIGITS", "pattern":/[1-9][0-9]*/},
		{"type":"INVALID", "pattern":/./}
	];
	export interface TokenList extends Array<{token_type:string, value:string}>{}
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
					var token_type:string = this.def[i].type;
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
					if(token_type != null) {
						console.log(token_type+" : "+match);
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

