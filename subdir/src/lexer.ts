export type Token = string|symbol;
export const SYMBOL_EOF = Symbol("EOF");
export interface LexDefinitionSection{
	token: Token|null;
	pattern: string|RegExp;
}
export type LexDefinitions = Array<LexDefinitionSection>;
export var def:LexDefinitions = [
	{token:null, pattern:" "},
	{token:null, pattern:/\t|\r|\n/},
	{token:"LPAREN", pattern:"("},
	{token:"RPAREN", pattern:")"},
	{token:"PLUS", pattern:"+"},
	{token:"ASTERISK", pattern:"*"},
	{token:"DIGITS", pattern:/[1-9][0-9]*/},
	{token:"INVALID", pattern:/./}
];
export var lexerlexdef:LexDefinitions = [
	{token:"LABEL", pattern:/^[A-Z][A-Z0-9_]*/m},
	{token:"REGEXP", pattern:/\/.*\/[gimuy]*/},
	{token:"STRING", pattern:/"([^"]|\")*"/},
	{token:"ENDLINE", pattern:/[ \f\t\v\u00a0\u1680\u180e\u2000-\u200a\u202f\u205f\u3000\ufeff]*(\r\n|\r|\n)+/},
	{token:"WHITESPACE", pattern:/[ \f\t\v\u00a0\u1680\u180e\u2000-\u200a\u202f\u205f\u3000\ufeff]+/},
	{token:"INVALID", pattern:/./}
];
export type TokenList = Array<{token:Token, value:string}>;
export class Lexer{
	constructor(public def: LexDefinitions){
		// 正しいトークン定義が与えられているかチェック
		for(var i=0; i<this.def.length; i++){
			var token_pattern = this.def[i].pattern;
			if(typeof token_pattern == "string"){
				continue;
			}
			else if(token_pattern instanceof RegExp){
				// フラグを整形する
				let flags:string = "";
				// gフラグは邪魔なので取り除く
				// i,m,uフラグがあれば維持する
				if(token_pattern.ignoreCase){
					flags += "i";
				}
				if(token_pattern.multiline){
					flags += "m";
				}
				if(token_pattern.unicode){
					flags += "u";
				}
				// yフラグは必ずつける
				flags += "y";
				// フラグをつけなおして新しい正規表現オブジェクトにする
				this.def[i].pattern = new RegExp(token_pattern, flags);
				continue;
			}
			throw new Error("invalid token definition: neither string nor RegExp object");
		}
	}
	exec(str: string):TokenList{
		var result:TokenList = [];
		let lastindex = 0;
		while(lastindex < str.length){
			for(var i=0; i<this.def.length; i++){
				var token:Token|null = this.def[i].token;
				var token_pattern = this.def[i].pattern;
				var match:string;
				if(typeof token_pattern == "string"){
					if(str.substring(lastindex,lastindex+token_pattern.length) != token_pattern) continue;
					match = token_pattern;
					lastindex += token_pattern.length;
				}
				else{
					// token_pattern: RegExp
					token_pattern.lastIndex = lastindex;
					let m = token_pattern.exec(str);
					if(m === null) continue; // マッチ失敗
					match = m[0];
					lastindex = token_pattern.lastIndex; // lastindexを進める
				}
				// tokenがnullなら処理を飛ばします
				if(token != null) {
					result.push({token:token, value:match});
				}
				break;
			}
		}
		// 最後にEOFトークンを付与
		result.push({token:SYMBOL_EOF, value:""});
		return result;
	}
}

