import {Token} from "./token";

// AST
export interface ASTNode{
	type: Token;
	value: string;
	children: Array<ASTNode>;
}
