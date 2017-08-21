export type Token = string | symbol;
export const SYMBOL_EOF: Token = Symbol("EOF");
export const SYMBOL_SYNTAX: Token = Symbol("S'");

export type TokenList = Array<{ token: Token, value: string }>;
