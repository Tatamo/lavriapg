import {FirstSet} from "./firstset";
import {SymbolDiscriminator} from "./symboldiscriminator";
import {Token, SYMBOL_SYNTAX, SYMBOL_EOF} from "../def/token";
import {GrammarDefinition, SyntaxDefinitions, SyntaxDefinitionSection} from "../def/grammar";

export class SyntaxDB{
	private syntax: SyntaxDefinitions;
	private _start_symbol: Token;
	private _first: FirstSet;
	private _symbols: SymbolDiscriminator;
	private tokenmap: Map<Token, number>;
	private tokenid_counter: number;
	private defmap: Map<Token, Array<{id: number, def: SyntaxDefinitionSection}>>;
	constructor(grammar:GrammarDefinition){
		this.syntax = grammar.syntax;
		this._start_symbol = grammar.start_symbol;
		this._symbols = new SymbolDiscriminator(this.syntax);
		this._first = new FirstSet(this.syntax, this.symbols);

		this.tokenid_counter = 0;
		this.tokenmap = new Map<Token, number>();

		this.initDefMap();
	}
	// Token->numberの対応を生成
	private initDefMap(){
		this.defmap = new Map<Token, Array<{id:number, def: SyntaxDefinitionSection}>>();
		for(let i=0; i<this.syntax.length; i++){
			let tmp:Array<{id:number, def:SyntaxDefinitionSection}>;
			if(this.defmap.has(this.syntax[i].ltoken)){
				tmp = this.defmap.get(this.syntax[i].ltoken)!;
			}
			else {
				tmp = [];
			}
			tmp.push({id: i, def: this.syntax[i]});
			this.defmap.set(this.syntax[i].ltoken, tmp);
		}
	}
	get start_symbol(): Token{
		return this._start_symbol;
	}
	get first(): FirstSet{
		return this._first;
	}
	get symbols(): SymbolDiscriminator{
		return this._symbols;
	}
	// 非終端記号xに対し、それが左辺として対応する定義を返す
	public findDef(x: Token): Array<{id:number, def:SyntaxDefinitionSection}>{
		if(this.defmap.has(x)){
			return this.defmap.get(x)!;
		}
		return [];
	}
	// Tokenを与えると一意なidを返す
	public getTokenId(token: Token): number{
		if(!this.tokenmap.has(token)) this.tokenmap.set(token, this.tokenid_counter++);
		return this.tokenmap.get(token)!;
	}
	// -1が与えられた時は S' -> S $の規則を返す
	public get(id: number): SyntaxDefinitionSection{
		if(id == -1){
			return {ltoken: SYMBOL_SYNTAX, pattern: [this.start_symbol]};
			//return {ltoken: SYMBOL_SYNTAX, pattern: [this.start_symbol, SYMBOL_EOF]};
		}
		return this.syntax[id];
	}
}

