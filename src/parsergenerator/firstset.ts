import {GrammarDefinition} from "../def/language";
import {SYMBOL_EOF, Token} from "../def/token";
import {NullableSet} from "./nullableset";
import {SymbolDiscriminator} from "./symboldiscriminator";

type Constraint = Array<{ superset: Token, subset: Token }>;

export class FirstSet {
	private first_map: Map<Token, Set<Token>>;
	private nulls: NullableSet;

	constructor(private grammar: GrammarDefinition, private symbols: SymbolDiscriminator) {
		this.first_map = new Map<Token, Set<Token>>();
		this.nulls = new NullableSet(this.grammar);
		this.generateFirst();
	}

	private generateFirst() {
		// Firstを導出
		const first_result: Map<Token, Set<Token>> = new Map<Token, Set<Token>>();
		// 初期化
		// FIRST($) = {$} だけ手動で追加
		first_result.set(SYMBOL_EOF, new Set<Token>([SYMBOL_EOF]));
		// 終端記号Xに対してFirst(X)=X
		const terminal_symbols = this.symbols.getTerminalSymbols();
		terminal_symbols.forEach((value: Token) => {
			first_result.set(value, new Set<Token>([value]));
		});
		// 非終端記号はFirst(Y)=∅で初期化
		const nonterminal_symbols = this.symbols.getNonterminalSymbols();
		nonterminal_symbols.forEach((value: Token) => {
			first_result.set(value, new Set<Token>());
		});

		// 包含についての制約を生成
		const constraint: Constraint = [];
		for (const rule of this.grammar) {
			const sup: Token = rule.ltoken;
			// 右辺の左から順に、non-nullableな記号が現れるまで制約に追加
			// 最初のnon-nullableな記号は制約に含める
			for (const sub of rule.pattern) {
				if (sup != sub) {
					constraint.push({superset: sup, subset: sub});
				}
				if (!this.nulls.isNullable(sub)) {
					break;
				}
			}
		}

		// 制約解消
		let flg_changed = true;
		while (flg_changed) {
			flg_changed = false;
			for (const pair of constraint) {
				const sup: Token = pair.superset;
				const sub: Token = pair.subset;
				const superset: Set<Token> = first_result.get(sup)!;
				const subset: Set<Token> = first_result.get(sub)!;
				subset.forEach((token: Token) => {
					// subset内の要素がsupersetに含まれていない
					if (!superset.has(token)) {
						// subset内の要素をsupersetに入れる
						superset.add(token);
						flg_changed = true;
					}
				});
				// First集合を更新
				first_result.set(sup, superset);
			}
		}
		this.first_map = first_result;
	}

	// 記号または記号列を与えて、その記号から最初に導かれうる非終端記号の集合を返す
	public get(arg: Token | Token[]): Set<Token> {
		// 単一の記号の場合
		if (!Array.isArray(arg)) {
			if (!this.first_map.has(arg)) {
				throw new Error(`invalid token found: ${arg}`);
			}
			return this.first_map.get(arg)!;
		}
		// 記号列の場合
		const tokens: Token[] = arg;

		// 不正な記号を発見
		for (const token of tokens) {
			if (!this.first_map.has(token)) {
				throw new Error(`invalid token found: ${token}`);
			}
		}
		const result: Set<Token> = new Set<Token>();
		for (const token of tokens) {
			const add = this.first_map.get(token)!; // トークン列の先頭から順にFirst集合を取得
			// 追加
			add.forEach((t: Token) => {
				if (!result.has(t)) {
					result.add(t);
				}
			});
			if (!this.nulls.isNullable(token)) {
				// 現在のトークン ∉ Nulls ならばここでストップ
				break;
			}
		}
		return result;
	}
}
