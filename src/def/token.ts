export type Token = string | symbol;
export type TokenizedInput = { token: Token, value: string };
export const SYMBOL_EOF: Token = Symbol("EOF");
export const SYMBOL_SYNTAX: Token = Symbol("S'");
