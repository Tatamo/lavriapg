import {Token, SYMBOL_SYNTAX, SYMBOL_EOF} from "./token";

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
}

export class Grammar implements GrammarDefinition{
	constructor(public lex:LexDefinitions, public syntax:SyntaxDefinitions, public start_symbol:Token){
		this.syntax.unshift( { ltoken: SYMBOL_SYNTAX, pattern: [start_symbol, SYMBOL_EOF] } );
	}
}
