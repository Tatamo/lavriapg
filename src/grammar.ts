import {Token, SYMBOL_SYNTAX, SYMBOL_EOF} from "./token";
import {SymbolDiscriminator} from "./symboldiscriminator";

export interface LexDefinitionSection{
	token: Token|null;
	pattern: string|RegExp;
}
export type LexDefinitions = Array<LexDefinitionSection>;

export interface SyntaxDefinitionSection{
	ltoken: Token;
	pattern: Array<Token>;
}
export type SyntaxDefinitions = Array<SyntaxDefinitionSection>;

export interface GrammarDefinition{
	lex: LexDefinitions;
	syntax: SyntaxDefinitions;
	start_symbol: Token;
}

// S' -> S $ が先頭に追加される
export class Grammar{
	constructor(public lex:LexDefinitions, public syntax:SyntaxDefinitions, public start_symbol:Token){
		// 構文規則を変更するため、コピーをとっておく
		this.syntax = syntax.slice();
		// 構文規則に S' -> S $ を追加
		this.syntax =  [{ ltoken: SYMBOL_SYNTAX, pattern: [start_symbol, SYMBOL_EOF] }].concat(this.syntax);
	}
}
