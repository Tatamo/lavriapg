import {Token} from "./definition";

// AST
export interface ASTNode{
	type: Token;
	value: string;
	children: Array<ASTNode>;
}
