import {FirstSet} from "./firstset";
import {SymbolDiscriminator} from "./symboldiscriminator";
import {Token} from "../def/token";
import {SyntaxDefinitions, SyntaxDefinitionSection} from "../def/grammar";

export class SyntaxDB{
	private tokenmap: Map<Token, number>;
	private tokenid_counter: number;
	private defmap: Map<Token, Array<{id: number, def: SyntaxDefinitionSection}>>;
	private _first: FirstSet;
	private _symbols: SymbolDiscriminator;
	constructor(private syntax:SyntaxDefinitions, first:FirstSet, symbols:SymbolDiscriminator){
		this._first = first;
		this._symbols = symbols;

		this.tokenid_counter = 0;
		this.tokenmap = new Map<Token, number>();

		this.initDefMap();
	}
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
	public getTokenId(token: Token): number{
		if(!this.tokenmap.has(token)) this.tokenmap.set(token, this.tokenid_counter++);
		return this.tokenmap.get(token)!;
	}
	public get(id: number): SyntaxDefinitionSection{
		return this.syntax[id];
	}
}

