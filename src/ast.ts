import * as Lexer from "./lexer";

export interface ASTNode{
	type: Lexer.Token;
	value: string;
	children: Array<ASTNode>;
}

