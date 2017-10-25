import {Token} from "./token";
import {ILexer} from "../lexer/lexer";

export type LexCallback = (value: string, index: number, token: string | null, lexer: ILexer) => any;

export interface LexRule {
	token: Token | null;
	pattern: string | RegExp;
	priority?: number;
	callback?: LexCallback;
}

export type LexDefinition = Array<LexRule>;

export type GrammarCallback = (children: Array<any>, token: string, lexer: ILexer) => any;

export interface GrammarRule {
	ltoken: Token;
	pattern: Array<Token>;
	callback?: GrammarCallback; // TODO: 引数をましにする
}

export type GrammarDefinition = Array<GrammarRule>;

export interface Language {
	lex: LexDefinition;
	grammar: GrammarDefinition;
	start_symbol: Token;
}
