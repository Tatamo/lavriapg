import {Language, GrammarDefinition, GrammarRule} from "../def/language";
import {SYMBOL_EOF, SYMBOL_SYNTAX, Token} from "../def/token";
import {FirstSet} from "./firstset";
import {SymbolDiscriminator} from "./symboldiscriminator";

/**
 * 言語定義から得られる、構文規則に関する情報を管理するクラス
 */
export class GrammarDB {
	private grammar: GrammarDefinition;
	private _start_symbol: Token;
	private _first: FirstSet;
	private _symbols: SymbolDiscriminator;
	private tokenmap: Map<Token, number>;
	private tokenid_counter: number;
	private rulemap: Map<Token, Array<{ id: number, rule: GrammarRule }>>;

	constructor(language: Language) {
		this.grammar = language.grammar;
		this._start_symbol = language.grammar.start_symbol;
		this._symbols = new SymbolDiscriminator(this.grammar);
		this._first = new FirstSet(this.grammar, this.symbols);

		this.initTokenMap();
		this.initDefMap();
	}

	/**
	 * それぞれの記号にidを割り振り、Token->numberの対応を生成
	 */
	private initTokenMap() {
		this.tokenid_counter = 0;
		this.tokenmap = new Map<Token, number>();

		// 入力の終端$の登録
		this.tokenmap.set(SYMBOL_EOF, this.tokenid_counter++);
		// 仮の開始記号S'の登録
		this.tokenmap.set(SYMBOL_SYNTAX, this.tokenid_counter++);

		// 左辺値の登録
		for (const rule of this.grammar.rules) {
			const ltoken = rule.ltoken;
			// 構文規則の左辺に現れる記号は非終端記号
			if (!this.tokenmap.has(ltoken)) {
				this.tokenmap.set(ltoken, this.tokenid_counter++);
			}
		}
		// 右辺値の登録
		for (const rule of this.grammar.rules) {
			for (const symbol of rule.pattern) {
				if (!this.tokenmap.has(symbol)) {
					// 非終端記号でない(=左辺値に現れない)場合、終端記号である
					this.tokenmap.set(symbol, this.tokenid_counter++);
				}
			}
		}
	}

	/**
	 * ある記号を左辺とするような構文ルールとそのidの対応を生成
	 */
	private initDefMap() {
		this.rulemap = new Map<Token, Array<{ id: number, rule: GrammarRule }>>();
		for (let i = 0; i < this.grammar.rules.length; i++) {
			let tmp: Array<{ id: number, rule: GrammarRule }>;
			if (this.rulemap.has(this.grammar.rules[i].ltoken)) {
				tmp = this.rulemap.get(this.grammar.rules[i].ltoken)!;
			}
			else {
				tmp = [];
			}
			tmp.push({id: i, rule: this.grammar.rules[i]});
			this.rulemap.set(this.grammar.rules[i].ltoken, tmp);
		}
	}

	/**
	 * 開始記号を得る
	 */
	get start_symbol(): Token {
		return this._start_symbol;
	}
	/**
	 * First集合を得る
	 * @returns {FirstSet}
	 */
	get first(): FirstSet {
		return this._first;
	}
	/**
	 * 終端/非終端記号分類器を得る
	 * @returns {SymbolDiscriminator}
	 */
	get symbols(): SymbolDiscriminator {
		return this._symbols;
	}
	/**
	 * 構文規則がいくつあるかを返す ただし-1番の規則は含めない
	 */
	get rule_size(): number {
		return this.grammar.rules.length;
	}

	/**
	 * 与えられたidの規則が存在するかどうかを調べる
	 * @param {number} id
	 * @returns {boolean}
	 */
	public hasRuleId(id: number): boolean {
		return id >= -1 && id < this.rule_size;
	}
	/**
	 * 非終端記号xに対し、それが左辺として対応する定義を得る
	 *
	 * 対応する定義が存在しない場合は空の配列を返す
	 * @param x
	 */
	public findRules(x: Token): Array<{ id: number, rule: GrammarRule }> {
		if (this.rulemap.has(x)) {
			return this.rulemap.get(x)!;
		}
		return [];
	}
	/**
	 * 規則idに対応した規則を返す
	 *
	 * -1が与えられた時は S' -> S $の規則を返す
	 * @param id
	 */
	public getRuleById(id: number): GrammarRule {
		if (id == -1) {
			return {ltoken: SYMBOL_SYNTAX, pattern: [this.start_symbol]};
			// return {ltoken: SYMBOL_SYNTAX, pattern: [this.start_symbol, SYMBOL_EOF]};
		}
		else if (id >= 0 && id < this.grammar.rules.length) return this.grammar.rules[id];
		throw new Error("grammar id out of range");
	}
	/**
	 * [[Token]]を与えると一意なidを返す
	 * @param {Token} token
	 * @returns {number}
	 */
	public getTokenId(token: Token): number {
		if (!this.tokenmap.has(token)) {
			// this.tokenmap.set(token, this.tokenid_counter++);
			// return -1;
			throw new Error(`invalid token ${token}`);
		}
		return this.tokenmap.get(token)!;
	}
}
