import * as Lexer from "lexer";
import * as Immuable from "immutable";

import {SYMBOL_SYNTAX, SYMBOL_DOT, SyntaxDefinitionSection, SyntaxDefinitions} from "./syntaxdef";
import {ShiftOperation, ReduceOperation, ConflictedOperation, AcceptOperation, GotoOperation, ParsingOperation, ParsingTable} from "./parsingtable";
import {ASTNode} from "./ast";

export class Parser{
	constructor(private syntax:SyntaxDefinitions, private parsingtable:ParsingTable){
	}
	// parsingtableはconflictを含む以外は正しさが保証されているものと仮定する
	// inputsは正しくないトークンが与えられる可能性を含む
	// TODO: 詳細な例外処理、エラー検知
	public parse(inputs:Lexer.TokenList){
		let read_index: number = 0; // 次に読むべき入力記号のインデックス
		let inputs_length: number = inputs.length;
		let state_stack: Array<number> = [0]; // 現在読んでいる構文解析表の状態番号を置くスタック
		let result_stack: Array<ASTNode> = []; // 解析中のASTノードを置くスタック
		let flg_error: boolean = false;
		// 構文解析する
		while(read_index < inputs_length){
			let token: Lexer.Token = inputs[read_index].token_type;
			let state: number = state_stack[state_stack.length-1];
			if(!this.parsingtable[state].has(token)){
				// 未定義
				console.log("parse failed: undefined action");
				flg_error = true;
				break;
			}
			let action = this.parsingtable[state].get(token);
			if(action.type == "shift"){
				// shiftオペレーション
				// 次の状態をスタックに追加
				state_stack.push(action.to);
				// ASTのノードを作成
				let new_node:ASTNode = {
					type: token,
					value: inputs[read_index].value,
					children: []
				};
				result_stack.push(new_node);
				// 入力を一つ消費
				read_index += 1;
			}
			else if(action.type == "reduce"){
				// reduceオペレーション
				let syntax_item = this.syntax[action.syntax];
				let rnum = syntax_item.pattern.length;
				// 対応する規則の右辺の記号の数だけスタックからポップする
				for(let i=0; i<rnum; i++) state_stack.pop();
				let new_node:ASTNode = {
					type: syntax_item.ltoken,
					value: null,
					children: rnum==0?[]:result_stack.slice(rnum*-1)
				};
				// rnumが0でないなら、右辺の記号の数だけスタックからポップする
				if(rnum != 0) {
					result_stack = result_stack.slice(0, rnum*-1);
				}
				result_stack.push(new_node);

				// このままgotoオペレーションを行う
				state = state_stack[state_stack.length-1];
				token = syntax_item.ltoken;
				action = this.parsingtable[state].get(token);
				if(!this.parsingtable[state].has(token) || action.type != "goto"){
					// 未定義
					console.log("parse failed: undefined action");
					flg_error = true;
					break;
				}
				state_stack.push(action.to);
			}
			else if(action.type == "accept"){
				// 構文解析完了
				break;
			}
		}
		if(flg_error){
			console.log("parse failed.");
		}
		if(result_stack.length!=1){
			console.log("failed to construct tree.");
		}
		return result_stack[0];
	}
}