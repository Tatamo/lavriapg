import {Token} from "./token";

export interface LexDefinitionSection {
	token: Token | null;
	pattern: string | RegExp;
	priority?: number;
}

export type LexDefinitions = Array<LexDefinitionSection>;

export interface SyntaxDefinitionSection {
	ltoken: Token;
	pattern: Array<Token>;
}

export type SyntaxDefinitions = Array<SyntaxDefinitionSection>;

export interface GrammarDefinition {
	lex: LexDefinitions;
	syntax: SyntaxDefinitions;
	start_symbol: Token;
}
