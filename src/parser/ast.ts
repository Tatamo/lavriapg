import {Token} from "../def/token";

// AST
export interface ASTNode {
	type: Token;
	value: string | null;
	children: Array<ASTNode>;
}
