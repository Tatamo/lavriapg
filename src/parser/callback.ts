import {ILexer} from "../lexer/lexer";
import {Language} from "../def/language";
import {ASTNode} from "./ast";

/**
 * 字句解析・構文解析時に呼び出されるコールバックを管理するコントローラー
 * いわゆるStrategyパターン
 */
export interface CallbackController {
	readonly language: Language;
	init(): void;
	callLex(id: number, value: any, lexer: ILexer): any;
	callGrammar(id: number, children: Array<any>, lexer: ILexer): any;
}

/**
 * コールバックコントローラーの抽象クラス
 * 以下のメソッドをオーバーライドして使用する
 * * [[init]] (定義しなくてもよい)
 * * [[callLex]]
 * * [[callGrammar]]
 */
export abstract class AbstractCallbackController implements CallbackController {
	get language(): Language {
		return this._language;
	}
	constructor(private _language: Language) {
	}

	/**
	 * 解析を開始する際、初期化のために呼び出される
	 * デフォルトでは何もしない
	 */
	init(): void {
		/* do nothing */
	}

	/**
	 * 字句規則にマッチした際に呼び出される
	 * @param {number} id
	 * @param value
	 * @param {ILexer} lexer
	 * @returns {any}
	 */
	abstract callLex(id: number, value: any, lexer: ILexer): any;
	abstract callGrammar(id: number, children: Array<any>, lexer: ILexer): any;
}

/**
 * 言語情報に付随するコールバックを呼び出すコントローラ
 */
export class DefaultCallbackController extends AbstractCallbackController {
	callLex(id: number, value: any, lexer: ILexer): any {
		const rule = this.language.lex.rules[id];
		if (rule.callback !== undefined) {
			return rule.callback(value, rule.token as string, lexer);
		}
		else {
			return value;
		}
	}
	callGrammar(id: number, children: Array<any>, lexer: ILexer): any {
		const rule = this.language.grammar.rules[id];
		if (rule.callback !== undefined) {
			return rule.callback(children, rule.ltoken as string, lexer);
		}
		else {
			return children[0];
		}
	}
}

/**
 * ASTを構築するコントローラ
 */
export class ASTConstructor extends AbstractCallbackController {
	callLex(id: number, value: any, lexer: ILexer): ASTNode {
		return {
			type: this.language.lex.rules[id].token!,
			value,
			children: []
		};
	}
	callGrammar(id: number, children: Array<any>, lexer: ILexer): ASTNode {
		return {
			type: this.language.grammar.rules[id].ltoken,
			value: null,
			children: children
		};
	}
}
