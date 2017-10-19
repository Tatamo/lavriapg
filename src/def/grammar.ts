import {Token} from "./token";
import {ILexer} from "../lexer/lexer";

export interface LexDefinitionSection {
	token: Token | null;
	pattern: string | RegExp;
	priority?: number;
	callback?: (lexer: ILexer, token: string | null, value: string, index: number) => any;
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
