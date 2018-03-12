import {Token} from "./token";
import {ILexer, LexController} from "../lexer/lexer";

/**
 * 字句解析器の状態を区別するためのラベル型
 */
export type LexStateLabel = string;

/**
 * デフォルトの字句解析器の状態
 */
export const default_lex_state = "default";

/**
 * 字句解析器に与える状態
 */
export interface LexState {
	label: LexStateLabel;
	is_exclusive?: boolean;
}

/**
 * 字句規則マッチ時に呼び出されるコールバック
 */
export type LexCallback = (token: string | null, value: string, lex: LexController) => [string | null, any] | { token: string | null, value: any } | string | null;

/**
 * 単一の字句ルール
 */
// TODO: tokenはlabelに名称変更してもよい？
export interface LexRule {
	token: Token | null;
	pattern: string | RegExp;
	state?: Array<LexStateLabel>;
	is_disabled?: boolean;
	priority?: number;
	callback?: LexCallback;
}

/**
 * 字句規則
 */
export interface LexDefinition {
	rules: Array<LexRule>;
	states?: Array<LexState>;
	default_callback?: LexCallback;
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
	default_callback?: GrammarCallback;
}

/**
 * 言語定義
 */
export interface Language {
	lex: LexDefinition;
	grammar: GrammarDefinition;
}
