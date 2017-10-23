import {Token} from "./token";
import {ILexer} from "../lexer/lexer";

export interface LexRule {
	token: Token | null;
	pattern: string | RegExp;
	priority?: number;
	callback?: (lexer: ILexer, token: string | null, value: string, index: number) => any;
}

export type LexDefinition = Array<LexRule>;

export interface GrammarRule {
	ltoken: Token;
	pattern: Array<Token>;
	callback?: (lexer: ILexer, token: string, pattern: Array<string>) => any; // TODO: 引数をましにする
}

export type GrammarDefinition = Array<GrammarRule>;

export interface Language {
	lex: LexDefinition;
	grammar: GrammarDefinition;
	start_symbol: Token;
}
