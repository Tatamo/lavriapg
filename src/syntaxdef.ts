// 構文規則の定義など
module ParserGenerator{
	export interface SyntaxDefinitionSection{
		ltoken: string;
		pattern: Array<Array<string>>;
	}
	// ltokenは重複しないことを前提とする
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
}