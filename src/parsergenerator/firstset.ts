import * as Immutable from "immutable";
import {NullableSet} from "./nullableset";
import {SymbolDiscriminator} from "./symboldiscriminator";
import {Token, SYMBOL_EOF} from "../def/token";
import {GrammarDefinition, SyntaxDefinitionSection} from "../def/grammar";

type Constraint = Array<{superset:Token, subset:Token}>;

export class FirstSet{
	private first_map: Map<Token, Set<Token>>;
	constructor(private grammar: GrammarDefinition, private symbols: SymbolDiscriminator, private nulls: NullableSet){
		this.first_map = new Map<Token, Set<Token>>();
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
		for(let i=0; i<this.grammar.syntax.length; i++){
			let def:SyntaxDefinitionSection = this.grammar.syntax[i];
			let sup:Token = def.ltoken;
			let pattern:Array<Token> = def.pattern;
			for(let ii=0; ii<pattern.length; ii++){
				let sub:Token = pattern[ii];
				if(sup != sub){
					constraint.push({superset: sup, subset: sub});
				}
				if(!this.nulls.isNullable(sub)){
					break;
				}
			}
		}

		// 制約解消
		let flg_done = false;
		while(!flg_done){
			flg_done = true;
			for(let i=0; i<constraint.length; i++){
				let sup:Token = constraint[i].superset;
				let sub:Token = constraint[i].subset;
				let superset:Set<Token> = first_result.get(sup)!;
				let subset:Set<Token> = first_result.get(sub)!;
				subset.forEach((token:Token)=>{
					// subset内の要素がsupersetに含まれていない
					if(!superset.has(token)){
						// subset内の要素をsupersetに入れる
						superset.add(token);
						flg_done = false;
					}
				});
				first_result.set(sup, superset);
				/*
				if(!superset.isSuperset(subset)){
					// subset内の要素をsupersetに入れる
					superset = superset.union(subset);
					first_result = first_result.set(sup, superset);
				}
				*/
			}
		}
		this.first_map = first_result;
	}
	// 制約条件がすべて満たされたかどうかを判定する
	private isConstraintFilled(constraint:Constraint, table:Map<Token, Set<Token>>): boolean{
		for(let i=0; i<constraint.length; i++){
			let superset = table.get(constraint[i].superset)!;
			let subset = table.get(constraint[i].subset)!;
			// tableのsubの要素がすべてsupに含まれていることを調べる
			let flg_includes = true;
			subset.forEach((token:Token)=>{
				if(!superset.has(token)){
				// subの要素がすべてsupに含まれていなかった
					flg_includes = false;
				}
			});
			/*
			if(!superset.isSuperset(subset)){
				// subの要素がすべてsupに含まれていなかった
				return false;
			}
			*/
			if(!flg_includes) return false;
		}
		return true;
	}
	// 記号または記号列を与えて、その記号から最初に導かれうる非終端記号の集合を返す
	public get(arg: Token):Immutable.Set<Token>;
	public get(arg: Array<Token>):Immutable.Set<Token>;
	public get(arg: Token|Array<Token>): Immutable.Set<Token>{
		if(!Array.isArray(arg)){
			//return this.first_map.get(arg)!;
			let r = Immutable.Set<Token>();
			(this.first_map.get(arg)!).forEach((token:Token)=>{
				r = r.add(token);
			});
			return r;
		}
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
		//return result;
		let immutableset = Immutable.Set<Token>();
		result.forEach((token:Token)=>{
			immutableset = immutableset.add(token);
		});
		return immutableset;
	}
}
