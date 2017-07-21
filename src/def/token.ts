export type Token = string | symbol;
export const SYMBOL_EOF: Token = Symbol("EOF");
export const SYMBOL_SYNTAX: Token = Symbol("S'");
export const SYMBOL_DOT: Token = Symbol(".");

export type TokenList = Array<{ token: Token, value: string }>;
