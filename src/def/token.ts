/**
 * トークン名
 */
export type Token = string | symbol;

/**
 * トークン化された入力
 * トークン名と、字句規則にマッチした元々の入力
 */
export type TokenizedInput = { token: Token, value: string };

/**
 * 入力の終端を表す終端記号名
 * @type {symbol}
 */
export const SYMBOL_EOF: Token = Symbol("EOF");

/**
 * `S' -> S $` (Sは開始記号)となるような非終端記号S'を表す非終端記号名
 * @type {symbol}
 */
export const SYMBOL_SYNTAX: Token = Symbol("S'");
