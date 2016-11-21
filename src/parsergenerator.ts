/// <reference path="../lexer/src/lexer.ts" />
/// <reference path="../typings/index.d.ts" />
module ParserGenerator{
	export interface SyntaxDefinitionSection{
		ltoken: string;
		pattern: Array<Array<string>>;
	}
	export type SyntaxDefinitions = Array<SyntaxDefinitionSection>;
	export var def:SyntaxDefinitions = [
		{
			ltoken: "EXP",
			pattern: [["EXP", "PLUS", "TERM"], ["TERM"]]
		},
		{
			ltoken: "TERM",
			pattern: [["TERM", "ASTERISK", "ATOM"], ["ATOM"]]
		},
		{
			ltoken: "ATOM",
			pattern:[["DIGITS"], ["LPAREN", "EXP", "RPAREN"]]
		}
	];
	export class TerminalSymbolDiscriminator{
		token_table: Array<{type:string, is_terminal:boolean}>;
		constructor(lexdef:Lexer.LexDefinitions, syntaxdef:SyntaxDefinitions){
			this.token_table = [];
			for(var i=0; i<lexdef.length; i++){
				if(lexdef[i].type == null){
					continue;
				}
				var flg_push = true;
				for(var ii=0; ii<this.token_table.length; ii++){
					if(this.token_table[ii].type == lexdef[i].type){
						flg_push = false;
						break;
					}
				}
				if(flg_push){
					this.token_table.push({type : lexdef[i].type, is_terminal : true});
				}
			}
			for(var i=0; i<syntaxdef.length; i++){
				var flg_token_not_found = true;
				for(var ii=0; ii<this.token_table.length; ii++){
					if(syntaxdef[i].ltoken == this.token_table[ii].type){
						this.token_table[ii].is_terminal = false;
						flg_token_not_found = false;
						break;
					}
				}
				if(flg_token_not_found){
					this.token_table.push({type : syntaxdef[i].ltoken, is_terminal : false});
				}
			}
		}
	}
	export class ParserGenerator{
	}
}

