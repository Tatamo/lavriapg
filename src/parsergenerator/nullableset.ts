import {Token} from "../def/token";
import {GrammarDefinition} from "../def/grammar";

export class NullableSet{
	private nulls:Set<Token>;
	constructor(private grammar: GrammarDefinition){
		this.generateNulls();
	}
	// nulls初期化
	private generateNulls(){
		// 制約条件を導出するために、
		// 空列になりうる記号の集合nullsを導出
		this.nulls = new Set<Token>();
		for(let i=0; i<this.grammar.syntax.length; i++){
			let ltoken = this.grammar.syntax[i].ltoken;
			let pattern = this.grammar.syntax[i].pattern;

			// 右辺の記号の数が0の規則を持つ記号は空列になりうる
			if(pattern == []){
				this.nulls.add(ltoken);
			}
		}
		let flg_changed:boolean = true;
		// 変更が起きなくなるまでループする
		while(flg_changed){
			flg_changed = false;
			for(let i=0; i<this.grammar.syntax.length; i++){
				let ltoken = this.grammar.syntax[i].ltoken;

				// 既にnullsに含まれていればスキップ
				if(this.isNullable(ltoken)) continue;

				let pattern = this.grammar.syntax[i].pattern;
				let flg_nulls = true;
				// 右辺に含まれる記号がすべてnullableの場合はその左辺はnullable
				for(let ii=0; ii<pattern.length; ii++){
					if(!this.isNullable(pattern[ii])){
						flg_nulls = false;
						break;
					}
				}
				if(flg_nulls){
					if(this.nulls.has(ltoken)) flg_changed = true;
					else this.nulls.add(ltoken);
				}
			}
		}
	}
	public isNullable(x:Token){
		return this.nulls.has(x);
	}
}
