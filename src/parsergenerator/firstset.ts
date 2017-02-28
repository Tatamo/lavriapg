import * as Immutable from "immutable";
import {NullableSet} from "./nullableset";
import {SymbolDiscriminator} from "./symboldiscriminator";
import {Token, SYMBOL_EOF} from "../def/token";
import {GrammarDefinition} from "../def/grammar";

type Constraint = Array<{superset:Token, subset:Token}>;

export class FirstSet{
	private first_map: Immutable.Map<Token, Immutable.Set<Token>>;
	constructor(private grammar: GrammarDefinition, private symbols: SymbolDiscriminator, private nulls: NullableSet){
		this.generateFirst();
	}
	private generateFirst(){
		//Firstを導出
		let first_result: Immutable.Map<Token, Immutable.Set<Token>> = Immutable.Map<Token, Immutable.Set<Token>>();
		// 初期化
		// FIRST($) = {$} だけ手動で追加
		first_result = first_result.set(SYMBOL_EOF, Immutable.Set<Token>([SYMBOL_EOF]));
		let terminal_symbols = this.symbols.getTerminalSymbols();
		terminal_symbols.forEach((value:Token)=>{
			first_result = first_result.set(value, Immutable.Set<Token>([value]));
		});
		let nonterminal_symbols = this.symbols.getNonterminalSymbols();
		nonterminal_symbols.forEach((value:Token)=>{
			first_result = first_result.set(value, Immutable.Set<Token>());
		});

		// 包含についての制約を生成
		let constraint:Constraint = [];
		for(let i=0; i<this.grammar.syntax.length; i++){
			let def = this.grammar.syntax[i];
			let sup = def.ltoken;
			let pattern = def.pattern;
			for(let ii=0; ii<pattern.length; ii++){
				let sub = pattern[ii];
				if(sup != sub){
					constraint.push({superset: sup, subset: sub});
				}
				if(!this.nulls.isNullable(sub)){
					break;
				}
			}
		}

		// 制約解消
		while(!this.isConstraintFilled(constraint, first_result)){
			for(let i=0; i<constraint.length; i++){
				let sup = constraint[i].superset;
				let sub = constraint[i].subset;
				let superset = first_result.get(sup);
				let subset = first_result.get(sub);
				// 包含関係にあるべき2つの集合が包含関係にない
				if(!superset.isSuperset(subset)){
					// subset内の要素をsupersetに入れる
					superset = superset.union(subset);
					first_result = first_result.set(sup, superset);
				}
			}
		}
		this.first_map = first_result;
	}
	// 制約条件がすべて満たされたかどうかを判定する
	// 与えられたtable内の配列がソートされていることを前提とする
	private isConstraintFilled(constraint:Constraint, table:Immutable.Map<Token, Immutable.Set<Token>>): boolean{
		for(let i=0; i<constraint.length; i++){
			let superset = table.get(constraint[i].superset);
			let subset = table.get(constraint[i].subset);
			// tableのsubの要素がすべてsupに含まれていることを調べる
			if(!superset.isSuperset(subset)){
				// subの要素がすべてsupに含まれていなかった
				return false;
			}
		}
		return true;
	}
	// 記号または記号列を与えて、その記号から最初に導かれうる非終端記号の集合を返す
	public get(arg: Token):Immutable.Set<Token>;
	public get(arg: Array<Token>):Immutable.Set<Token>;
	public get(arg: Token|Array<Token>): Immutable.Set<Token>{
		if(!Array.isArray(arg)){
			return this.first_map.get(arg);
		}
		let w: Array<Token> = arg;

		let result: Immutable.Set<Token> = Immutable.Set<Token>();
		for(let i=0; i<w.length; i++){
			let add = this.first_map.get(w[i]); // i文字目のFirst集合を取得
			result = result.union(add); // 追加
			if(!this.nulls.isNullable(w[i])){
				// w[i] ∉ Nulls ならばここでストップ
				break;
			}
		}
		return result;
	}
}
