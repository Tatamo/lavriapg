import {Token} from "./token";
import {ILexer} from "../lexer/lexer";

/**
 * 字句規則マッチ時に呼び出されるコールバック
 */
export type LexCallback = (value: string, token: string | null, lexer: ILexer) => any;

/**
 * 単一の字句ルール
 */
export interface LexRule {
	token: Token | null;
	pattern: string | RegExp;
	priority?: number;
	callback?: LexCallback;
}

/**
 * 字句規則
 */
export type LexDefinition = Array<LexRule>;

/**
 * 構文のreduce時に呼び出されるコールバック
 */
export type GrammarCallback = (children: Array<any>, token: string, lexer: ILexer) => any;

/**
 * 単一の構文ルール
 */
export interface GrammarRule {
	ltoken: Token;
	pattern: Array<Token>;
	callback?: GrammarCallback;
}

/**
 * 構文規則
 */
export type GrammarDefinition = Array<GrammarRule>;

/**
 * 言語定義
 */
export interface Language {
	lex: LexDefinition;
	grammar: GrammarDefinition;
	start_symbol: Token;
}
