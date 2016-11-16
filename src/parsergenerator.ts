/// <reference path="../lexer/src/lexer.ts" />
/// <reference path="../typings/index.d.ts" />
module ParserGenerator{
	export interface SyntaxDefinitionSection{
		ltoken: string;
		pattern: Array<Array<string>>;
	}
	export interface SyntaxDefinitions extends Array<SyntaxDefinitionSection>{}
	export var def:SyntaxDefinitions = [
		{
			ltoken: "EXP",
			pattern: [["EXP", "ASTERISK", "TERM"], ["TERM"]]
		},
		{
			ltoken: "TERM",
			pattern: [["TERM", "ASTERISK", "DIGITS"], ["DIGITS"]]
		}
	];
	export class TerminalSymbolDiscriminator{
	}
	export class ParserGenerator{
	}
}

