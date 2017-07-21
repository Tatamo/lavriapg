import {SyntaxDefinitions} from "../def/grammar";
import {ParsingTable} from "../def/parsingtable";
import {Token, TokenList} from "../def/token";
import {ILexer} from "../lexer/lexer";
import {ASTNode} from "./ast";

export interface TerminalCallbackArg {
	token: string;
	value: string;
	terminal: true;
}

export interface NonterminalCallbackArg {
	token: string;
	children: Array<any>;
	pattern: Array<string>;
	terminal: false;
}

export type ParserCallbackArg = TerminalCallbackArg | NonterminalCallbackArg;

export type ParserCallback = (arg: ParserCallbackArg) => any;

export class Parser {
	private default_callback: ParserCallback | null;
	constructor(private lexer: ILexer, private syntax: SyntaxDefinitions, private parsingtable: ParsingTable, default_callback?: ParserCallback | null) {
		this.setDefaultCallback(default_callback);
	}
	public setDefaultCallback(default_callback?: ParserCallback | null) {
		if (default_callback === null || default_callback === undefined) {
			this.default_callback = null;
		}
		else {
			this.default_callback = default_callback;
		}
	}
	public parse(input: string, cb?: ParserCallback): any {
		return this._parse(this.lexer.exec(input), cb);
	}
	// parsingtableはconflictを含む以外は正しさが保証されているものと仮定する
	// inputsは正しくないトークンが与えられる可能性を含む
	// TODO: 詳細な例外処理、エラー検知
	private _parse(inputs: TokenList, cb?: ParserCallback): any {
		let read_index: number = 0; // 次に読むべき入力記号のインデックス
		const inputs_length: number = inputs.length;
		const state_stack: Array<number> = [0]; // 現在読んでいる構文解析表の状態番号を置くスタック
		const result_stack: Array<any> = []; // 解析中のASTノードを置くスタック
		let flg_error: boolean = false;

		let callback: ParserCallback;
		if (cb !== null && cb !== undefined) callback = cb;
		// コールバックが引数として与えられていない場合は設定されたデフォルトコールバックを使用
		else if (this.default_callback !== null && this.default_callback !== undefined) callback = this.default_callback;
		else {
			// デフォルトコールバックも設定されていない場合は抽象構文木を構築する
			callback = (arg: ParserCallbackArg): ASTNode => {
				if (arg.terminal == true) {
					return {
						type: arg.token,
						value: arg.value,
						children: []
					};
				}
				else {
					return {
						type: arg.token,
						value: null,
						children: arg.children
					};
				}
			};
		}

		// 構文解析する
		while (read_index < inputs_length) {
			let token: Token = inputs[read_index].token;
			let state: number = state_stack[state_stack.length - 1];
			if (!this.parsingtable[state].has(token)) {
				// 未定義
				console.log("parse failed: unexpected token:", token);
				flg_error = true;
				break;
			}
			let action = this.parsingtable[state].get(token)!;
			if (action.type == "shift") {
				// shiftオペレーション
				// 次の状態をスタックに追加
				state_stack.push(action.to);

				result_stack.push(callback({token: token as string, value: inputs[read_index].value, terminal: true}));

				// 入力を一つ消費
				read_index += 1;
			}
			else if (action.type == "reduce") {
				// reduceオペレーション
				const syntax_item = this.syntax[action.syntax];
				const rnum = syntax_item.pattern.length;
				// 対応する規則の右辺の記号の数だけスタックからポップする
				for (let i = 0; i < rnum; i++) state_stack.pop();

				// rnumが0でないなら、右辺の記号の数だけスタックからポップする
				const children = [];
				for (let i = 0; i < rnum; i++) children[rnum - 1 - i] = result_stack.pop();

				result_stack.push(callback({token: syntax_item.ltoken as string, children, pattern: syntax_item.pattern as Array<string>, terminal: false}));

				// このままgotoオペレーションを行う
				state = state_stack[state_stack.length - 1];
				token = syntax_item.ltoken;
				if (!this.parsingtable[state].has(token)) {
					// 未定義
					console.log("parse failed: unexpected token:", token);
					flg_error = true;
					break;
				}
				action = this.parsingtable[state].get(token)!;
				if (action.type != "goto") {
					// gotoアクションでなければおかしい
					console.log("parse failed: goto operation expected after reduce operation");
					flg_error = true;
					break;
				}
				state_stack.push(action.to);
			}
			else if (action.type == "accept") {
				// 構文解析完了
				break;
			}
			else if (action.type == "conflict") {
				console.log("conflict found:");
				console.log("current state " + state + ":", JSON.stringify(this.parsingtable[state]));
				console.log("shift:", action.shift_to, ",reduce:", action.reduce_syntax);
				action.shift_to.forEach((to: number) => {
					console.log("shift to " + to.toString() + ":", JSON.stringify(this.parsingtable[to]));
				});
				action.reduce_syntax.forEach((syntax: number) => {
					console.log("reduce syntax " + syntax.toString() + ":", JSON.stringify(this.parsingtable[syntax]));
				});
				console.log("parser cannot parse conflicted syntax");
				flg_error = true;
				break;
			}
		}
		if (flg_error) {
			console.log("parse failed.");
		}
		if (result_stack.length != 1) {
			console.log("failed to construct tree.");
		}
		return result_stack[0];
	}
}
