import {GrammarDefinition, SyntaxDefinitions, SyntaxDefinitionSection} from "../def/grammar";
import {SYMBOL_EOF, SYMBOL_SYNTAX, Token} from "../def/token";
import {FirstSet} from "./firstset";
import {SymbolDiscriminator} from "./symboldiscriminator";

export class SyntaxDB {
	private syntax: SyntaxDefinitions;
	private _start_symbol: Token;
	private _first: FirstSet;
	private _symbols: SymbolDiscriminator;
	private tokenmap: Map<Token, number>;
	private tokenid_counter: number;
	private defmap: Map<Token, Array<{ id: number, def: SyntaxDefinitionSection }>>;
	constructor(grammar: GrammarDefinition) {
		this.syntax = grammar.syntax;
		this._start_symbol = grammar.start_symbol;
		this._symbols = new SymbolDiscriminator(this.syntax);
		this._first = new FirstSet(this.syntax, this.symbols);

		this.initTokenMap();
		this.initDefMap();
	}
	// Token->numberの対応を生成
	private initTokenMap() {
		this.tokenid_counter = 0;
		this.tokenmap = new Map<Token, number>();

		// 入力の終端$の登録
		this.tokenmap.set(SYMBOL_EOF, this.tokenid_counter++);
		// 仮の開始記号S'の登録
		this.tokenmap.set(SYMBOL_SYNTAX, this.tokenid_counter++);

		// 左辺値の登録
		for (const sect of this.syntax) {
			const ltoken = sect.ltoken;
			// 構文規則の左辺に現れる記号は非終端記号
			if (!this.tokenmap.has(ltoken)) {
				this.tokenmap.set(ltoken, this.tokenid_counter++);
			}
		}
		// 右辺値の登録
		for (const sect of this.syntax) {
			for (const symbol of sect.pattern) {
				if (!this.tokenmap.has(symbol)) {
					// 非終端記号でない(=左辺値に現れない)場合、終端記号である
					this.tokenmap.set(symbol, this.tokenid_counter++);
				}
			}
		}
	}
	// Token-> [{id,syntax}]の対応を生成
	private initDefMap() {
		this.defmap = new Map<Token, Array<{ id: number, def: SyntaxDefinitionSection }>>();
		for (let i = 0; i < this.syntax.length; i++) {
			let tmp: Array<{ id: number, def: SyntaxDefinitionSection }>;
			if (this.defmap.has(this.syntax[i].ltoken)) {
				tmp = this.defmap.get(this.syntax[i].ltoken)!;
			}
			else {
				tmp = [];
			}
			tmp.push({id: i, def: this.syntax[i]});
			this.defmap.set(this.syntax[i].ltoken, tmp);
		}
	}
	get start_symbol(): Token {
		return this._start_symbol;
	}
	get first(): FirstSet {
		return this._first;
	}
	get symbols(): SymbolDiscriminator {
		return this._symbols;
	}
	// 非終端記号xに対し、それが左辺として対応する定義を返す
	public findDefinition(x: Token): Array<{ id: number, def: SyntaxDefinitionSection }> {
		if (this.defmap.has(x)) {
			return this.defmap.get(x)!;
		}
		return [];
	}
	// Tokenを与えると一意なidを返す
	public getTokenId(token: Token): number {
		if (!this.tokenmap.has(token)) {
			// this.tokenmap.set(token, this.tokenid_counter++);
			// return -1;
			throw new Error(`invalid token ${token}`);
		}
		return this.tokenmap.get(token)!;
	}
	// 規則idに対応した規則を返す
	// -1が与えられた時は S' -> S $の規則を返す
	public getDefinitionById(id: number): SyntaxDefinitionSection {
		if (id == -1) {
			return {ltoken: SYMBOL_SYNTAX, pattern: [this.start_symbol]};
			// return {ltoken: SYMBOL_SYNTAX, pattern: [this.start_symbol, SYMBOL_EOF]};
		}
		else if (id >= 0 && id < this.syntax.length) return this.syntax[id];
		throw new Error("syntax id out of range");
	}
}
