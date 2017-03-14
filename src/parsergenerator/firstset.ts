import {NullableSet} from "./nullableset";
import {SymbolDiscriminator} from "./symboldiscriminator";
import {Token, SYMBOL_EOF} from "../def/token";
import {SyntaxDefinitions, SyntaxDefinitionSection} from "../def/grammar";

type Constraint = Array<{superset:Token, subset:Token}>;

export class FirstSet{
	private first_map: Map<Token, Set<Token>>;
	private nulls: NullableSet;
	constructor(private syntax: SyntaxDefinitions, private symbols: SymbolDiscriminator){
		this.first_map = new Map<Token, Set<Token>>();
		this.nulls = new NullableSet(this.syntax);
		this.generateFirst();
	}
	private generateFirst(){
		//Firstを導出
		let first_result: Map<Token, Set<Token>> = new Map<Token, Set<Token>>();
		// 初期化
		// FIRST($) = {$} だけ手動で追加
		first_result.set(SYMBOL_EOF, new Set<Token>([SYMBOL_EOF]));
		// 終端記号Xに対してFirst(X)=X
		let terminal_symbols = this.symbols.getTerminalSymbols();
		terminal_symbols.forEach((value:Token)=>{
			first_result.set(value, new Set<Token>([value]));
		});
		// 非終端記号はFirst(Y)=∅で初期化
		let nonterminal_symbols = this.symbols.getNonterminalSymbols();
		nonterminal_symbols.forEach((value:Token)=>{
			first_result.set(value, new Set<Token>());
		});

		// 包含についての制約を生成
		let constraint:Constraint = [];
		for(let rule of this.syntax){
			let sup:Token = rule.ltoken;
			// 右辺の左から順に、non-nullableな記号が現れるまで制約に追加
			// 最初のnon-nullableな記号は制約に含める
			for(let sub of rule.pattern){
				if(sup != sub){
					constraint.push({superset: sup, subset: sub});
				}
				if(!this.nulls.isNullable(sub)){
					break;
				}
			}
		}

		// 制約解消
		let flg_changed = true;
		while(flg_changed){
			flg_changed = false;
			for(let pair of constraint){
				let sup:Token = pair.superset;
				let sub:Token = pair.subset;
				let superset:Set<Token> = first_result.get(sup)!;
				let subset:Set<Token> = first_result.get(sub)!;
				subset.forEach((token:Token)=>{
					// subset内の要素がsupersetに含まれていない
					if(!superset.has(token)){
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
	public get(arg: Token): Set<Token>;
	public get(arg: Array<Token>): Set<Token>;
	public get(arg: Token|Array<Token>): Set<Token>{
		// 単一の記号の場合
		if(!Array.isArray(arg)){
			return this.first_map.get(arg)!;
		}
		// 記号列の場合
		let w: Array<Token> = arg;

		let result: Set<Token> = new Set<Token>();
		for(let i=0; i<w.length; i++){
			let add = this.first_map.get(w[i])!; // i文字目のFirst集合を取得
			// 追加
			add.forEach((token:Token)=>{
				if(!result.has(token)){
					result.add(token);
				}
			});
			if(!this.nulls.isNullable(w[i])){
				// w[i] ∉ Nulls ならばここでストップ
				break;
			}
		}
		return result;
	}
}
