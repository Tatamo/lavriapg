import {Token} from "./token";
import {ILexer} from "../lexer/lexer";

/**
 * 字句解析器の状態を区別するためのラベル型
 */
export type LexStateLabel = string;

/**
 * 字句解析器に与える状態
 */
export interface LexState {
	label: LexStateLabel;
	exclusive?: boolean;
}

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
	state?: Array<string>;
	priority?: number;
	callback?: LexCallback;
}

/**
 * 字句規則
 */
export interface LexDefinition {
	rules: Array<LexRule>;
	states?: Array<LexState>;
}

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
export interface GrammarDefinition {
	rules: Array<GrammarRule>;
	start_symbol: Token;
}

/**
 * 言語定義
 */
export interface Language {
	lex: LexDefinition;
	grammar: GrammarDefinition;
}
