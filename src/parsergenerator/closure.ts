import {Token} from "../def/token";
import {SyntaxDefinitions, GrammarDefinition} from "../def/grammar";
import {SymbolDiscriminator} from "./symboldiscriminator";
import {SyntaxDB} from "./syntaxdb";

export class ClosureItem{
	// インスタンス生成後に内部状態が変化することはないものとする
	/*
	private syntax_id: number;
	private dot_index: number;
	private lookahead: Token;
	*/
	private _lr0_hash: string;
	private _lr1_hash: string;
	constructor(private syntax:SyntaxDB, private _syntax_id:number, private _dot_index:number, private _lookaheads:Array<Token>){
		this.sortLA();
		this.updateHash();
	}
	// ハッシュ文字列を生成する
	private updateHash(){
		this._lr0_hash = this.syntax_id.toString() + "," + this.dot_index.toString();
		let la_hash = "[";
		for(let i=0; i<this.lookaheads.length; i++){
			la_hash += this.syntax.getTokenId(this.lookaheads[i]).toString();
			if(i != this.lookaheads.length-1) la_hash += ",";
		}
		la_hash += "]";
		this._lr1_hash = this._lr0_hash + "," + la_hash;
	}
	public getLR0Hash(){
		return this._lr0_hash;
	}
	public getLR1Hash(){
		return this._lr1_hash;
	}
	get syntax_id():number{
		return this._syntax_id;
	}
	get dot_index():number{
		return this._dot_index;
	}
	get lookaheads():Array<Token>{
		return this._lookaheads;
	}
	private sortLA(){
		this.lookaheads.sort((t1:Token, t2:Token)=>{
			return this.syntax.getTokenId(t1) - this.syntax.getTokenId(t2);
		});
	}
	public isSameLR0(c:ClosureItem): boolean{
		return this.getLR0Hash() == c.getLR0Hash();
	}
	public isSameLR1(c:ClosureItem): boolean{
		return this.getLR1Hash() == c.getLR1Hash();
	}
	public merge(c:ClosureItem): ClosureItem|null{
		// LR0部分が違っている場合はnullを返す
		if(!this.isSameLR0(c)) return null;
		// LR1部分まで同じ場合は自身を返す
		if(this.isSameLR1(c)) return this;
		// 双方のlookaheads配列はソート済みであるとする
		let i1=0;
		let i2=0;
		let new_la = [];
		// 2つのLA配列をマージして新しい配列を生成する
		while(i1 < this.lookaheads.length || i2 < c.lookaheads.length){
			if(this.lookaheads[i1] == c.lookaheads[i2]){
				new_la.push(this.lookaheads[i1]);
				i1++;
				i2++;
			}
			else if(this.syntax.getTokenId(this.lookaheads[i1]) < this.syntax.getTokenId(c.lookaheads[i2])){
				new_la.push(this.lookaheads[i1]);
				i1++;
			}
			else {
				new_la.push(c.lookaheads[i2]);
				i2++;
			}
		}
		return new ClosureItem(this.syntax, this.syntax_id, this.dot_index, new_la);
	}
}

export class ClosureSet{
	// インスタンス生成後に内部状態が変化することはないものとする
	private _lr0_hash: string;
	private _lr1_hash: string;
	constructor(private syntax:SyntaxDB, private closureset:Array<ClosureItem>){
		this.expandClosure();
		this.sort();
		this.updateHash();
	}
	private updateHash(){
		let lr0_hash = "";
		let lr1_hash = "";
		for(let i=0; i<this.closureset.length; i++){
			lr0_hash += this.closureset[i].getLR0Hash();
			lr1_hash += this.closureset[i].getLR1Hash();
			if(i != this.closureset.length-1) {
				lr0_hash += "|";
				lr1_hash += "|";
			}
		}
		this._lr0_hash = lr0_hash;
		this._lr1_hash = lr1_hash;
	}
	public getLR0Hash(){
		return this._lr0_hash;
	}
	public getLR1Hash(){
		return this._lr1_hash;
	}
	private sort(){
		this.closureset.sort((i1:ClosureItem, i2:ClosureItem)=>{
			if(i1.getLR1Hash() < i2.getLR1Hash()) return -1;
			else if(i1.getLR1Hash() > i2.getLR1Hash()) return 1;
			return 0;
		});
	}
	// クロージャー展開を行う
	private expandClosure(){
		let flg_changed:boolean = true;
		// 変更がなくなるまで繰り返す
		while(flg_changed){
			flg_changed = false;
			for(let ci of this.closureset){
				let ltoken = this.syntax.get(ci.syntax_id).ltoken;
				let pattern = this.syntax.get(ci.syntax_id).pattern;
				if(ci.dot_index == pattern.length) continue; // .が末尾にある場合はスキップ
				let follow = pattern[ci.dot_index];
				// if(follow == ltoken) continue;
				if(!this.syntax.symbols.isNonterminalSymbol(follow)) continue; // .の次の記号が非終端記号でないならばスキップ

				// クロージャー展開を行う
				// 先読み記号を導出
				let lookaheads = this.syntax.first.get(pattern.slice(ci.dot_index+1)).toArray();

				let definitions = this.syntax.findDef(follow);
				for(let {id, def} of definitions){
					this.closureset.push(new ClosureItem(this.syntax, id, ci.dot_index+1, lookaheads));
					flg_changed = true;
				}
			}
		}
		/*
		let prev_size = -1;
		// 変更がなくなるまで繰り返す
		while(tmp.size != prev_size){
			prev_size = tmp.size;
			tmp.forEach((v:ImmutableClosureItem)=>{
				let ltoken = <Token>v.get("ltoken");
				let pattern = <Immutable.Seq<number, Token>>v.get("pattern");
				let lookahead = <Token>v.get("lookahead");
				let dot_index:number = pattern.findKey((v:Token)=>{return v == SYMBOL_DOT});
				if(dot_index == pattern.size-1) return; // . が末尾にある場合はスキップ
				let symbol = pattern.get(dot_index+1);
				//if(symbol == ltoken) return; // 左辺の記号と.の次にある記号が同じ場合はスキップ
				if(!this.symbols.isNonterminalSymbol(symbol)) return; // symbolが非終端記号でなければスキップ
				// クロージャー展開を行う
				// 先読み記号を導出
				let lookahead_set:Immutable.Set<Token> = this.first.get(pattern.slice(dot_index+1+1).toArray().concat(lookahead));

				let def:Array<{id:number, def:SyntaxDefinitionSection}> = findDef(symbol);
				// symbolを左辺にもつ全ての規則を、先読み記号を付与して追加
				def.forEach((syntax:{id:number, def:SyntaxDefinitionSection})=>{
					// 構文規則の右辺の一番左に.をつける
					let new_pattern = Immutable.Seq((<Array<Token>>[SYMBOL_DOT]).concat(syntax.def.pattern));
					// すべての先読み記号について追加
					lookahead_set.forEach((la:Token)=>{
						tmp = tmp.add(Immutable.Map({syntax_id: syntax.id, ltoken: symbol, pattern: new_pattern, lookahead: la}));
					});
				});
			});
		}
		let result: Immutable.OrderedSet<ClosureItem> = Immutable.OrderedSet<ClosureItem>();
		tmp.forEach((v:ImmutableClosureItem)=>{
			result = result.add(this.convertImmutableClosureItem2Object(v));
		});
		return result;
		*/
	}
	get size(){
		return this.closureset.length;
	}
	public getArray(){
		return this.closureset;
	}
	public includes(item: ClosureItem):boolean{
		for(let i of this.closureset){
			if(i.isSameLR1(item)) return true;
		}
		return false;
	}
	public isSubSet(cs: ClosureSet): boolean{
		for(let item of this.closureset){
			if(!cs.includes(item)) return false;
		}
		return true;
	}
	public isSameLR0(c:ClosureSet): boolean{
		return this.getLR0Hash() == c.getLR0Hash();
	}
	public isSameLR1(c:ClosureSet): boolean{
		return this.getLR1Hash() == c.getLR1Hash();
	}
	public mergeLA(cs: ClosureSet): ClosureSet|null{
		// LR0部分が違っている場合はnullを返す
		if(!this.isSameLR0(cs)) return null;
		// LR1部分まで同じ場合は自身を返す
		if(this.isSameLR1(cs)) return this;
		let a1 = this.getArray();
		let a2 = cs.getArray();
		let new_set:Array<ClosureItem> = [];
		// 2つの配列においてLR部分は順序を含めて等しい
		for(let i=0; i<a1.length; i++){
			let new_item = a1[i].merge(a2[i]);
			if(new_item != null) new_set.push(new_item);
		}
		return new ClosureSet(this.syntax, new_set);
	}
}
