import {ILexer} from "../lexer/lexer";
import {Language} from "../def/language";

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

export interface CallbackController {
	readonly language: Language;
	init(): void;
	callLex(id: number, value: any, lexer: ILexer): any;
	callGrammar(id: number, children: Array<any>, lexer: ILexer): any;
}

export abstract class AbstractCallbackController implements CallbackController {
	get language(): Language {
		return this._language;
	}
	constructor(private _language: Language) {
	}
	init(): void {
		/* do nothing */
	}
	abstract callLex(id: number, value: any, lexer: ILexer): any;
	abstract callGrammar(id: number, children: Array<any>, lexer: ILexer): any;
}

export class DefaultCallbackController extends AbstractCallbackController {
	callLex(id: number, value: any, lexer: ILexer): any {
		const rule = this.language.lex[id];
		if (rule.callback !== undefined) {
			return rule.callback(value, rule.token as string, lexer);
		}
		else {
			return value;
		}
	}
	callGrammar(id: number, children: Array<any>, lexer: ILexer): any {
		const rule = this.language.grammar[id];
		if (rule.callback !== undefined) {
			return rule.callback(children, rule.ltoken as string, lexer);
		}
		else {
			return children[0];
		}
	}
}

export class ASTConstructor extends AbstractCallbackController {
	callLex(id: number, value: any, lexer: ILexer): any {
		return {
			type: this.language.lex[id].token,
			value,
			children: []
		};
	}
	callGrammar(id: number, children: Array<any>, lexer: ILexer): any {
		return {
			type: this.language.grammar[id].ltoken,
			value: null,
			children: children
		};
	}
}
