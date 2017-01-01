[
new Map<Token,ParsingOperation>([
	['GRAMMAR' => { type: 'goto', to: 1 }],
	['LEX' => { type: 'goto', to: 2 }],
	['LEXSECT' => { type: 'goto', to: 3 }],
	['LABEL' => { type: 'shift', to: 4 }],
	['EXCLAMATION' => { type: 'shift', to: 5 }] ]),
new Map<Token,ParsingOperation>([ [ SYMBOL_EOF => { type: 'accept' }] ]),
new Map<Token,ParsingOperation>([
	['SYNTAX' => { type: 'goto', to: 6 }],
	['LEXSECT' => { type: 'goto', to: 7 }],
	['SECT' => { type: 'goto', to: 8 }],
	['LABEL' => { type: 'shift', to: 9 }],
	['EXCLAMATION' => { type: 'shift', to: 5 }],
	['STARTSECT' => { type: 'goto', to: 10 }],
	['NORMALSECT' => { type: 'goto', to: 11 }],
	['DOLLAR' => { type: 'shift', to: 12 }] ]),
new Map<Token,ParsingOperation>([
	['DOLLAR' => { type: 'reduce', syntax: 3 }],
	['LABEL' => { type: 'reduce', syntax: 3 }],
	['EXCLAMATION' => { type: 'reduce', syntax: 3 }] ]),
new Map<Token,ParsingOperation>([
	['LEXDEF' => { type: 'goto', to: 13 }],
	['STRING' => { type: 'shift', to: 14 }],
	['REGEXP' => { type: 'shift', to: 15 }] ]),
new Map<Token,ParsingOperation>([
	['LEXDEF' => { type: 'goto', to: 16 }],
	['LABEL' => { type: 'shift', to: 17 }],
	['STRING' => { type: 'shift', to: 14 }],
	['REGEXP' => { type: 'shift', to: 15 }] ]),
new Map<Token,ParsingOperation>([
	['SECT' => { type: 'goto', to: 18 }],
	['STARTSECT' => { type: 'goto', to: 10 }],
	['NORMALSECT' => { type: 'goto', to: 11 }],
	['DOLLAR' => { type: 'shift', to: 12 }],
	['LABEL' => { type: 'shift', to: 19 }],
	[SYMBOL_EOF => { type: 'reduce', syntax: 1 }] ]),
new Map<Token,ParsingOperation>([
	['DOLLAR' => { type: 'reduce', syntax: 2 }],
	['LABEL' => { type: 'reduce', syntax: 2 }],
	['EXCLAMATION' => { type: 'reduce', syntax: 2 }] ]),
new Map<Token,ParsingOperation>([
	[SYMBOL_EOF => { type: 'reduce', syntax: 10 }],
	['DOLLAR' => { type: 'reduce', syntax: 10 }],
	['LABEL' => { type: 'reduce', syntax: 10 }] ]),
new Map<Token,ParsingOperation>([
	['LEXDEF' => { type: 'goto', to: 13 }],
	['COLON' => { type: 'shift', to: 20 }],
	['STRING' => { type: 'shift', to: 14 }],
	['REGEXP' => { type: 'shift', to: 15 }] ]),
new Map<Token,ParsingOperation>([
	[SYMBOL_EOF => { type: 'reduce', syntax: 11 }],
	['DOLLAR' => { type: 'reduce', syntax: 11 }],
	['LABEL' => { type: 'reduce', syntax: 11 }] ]),
new Map<Token,ParsingOperation>([
	[SYMBOL_EOF => { type: 'reduce', syntax: 12 }],
	['DOLLAR' => { type: 'reduce', syntax: 12 }],
	['LABEL' => { type: 'reduce', syntax: 12 }] ]),
new Map<Token,ParsingOperation>([ [ 'LABEL' => { type: 'shift', to: 21 }] ]),
new Map<Token,ParsingOperation>([
	['DOLLAR' => { type: 'reduce', syntax: 4 }],
	['LABEL' => { type: 'reduce', syntax: 4 }],
	['EXCLAMATION' => { type: 'reduce', syntax: 4 }] ]),
new Map<Token,ParsingOperation>([
	['DOLLAR' => { type: 'reduce', syntax: 7 }],
	['LABEL' => { type: 'reduce', syntax: 7 }],
	['EXCLAMATION' => { type: 'reduce', syntax: 7 }] ]),
new Map<Token,ParsingOperation>([
	['DOLLAR' => { type: 'reduce', syntax: 8 }],
	['LABEL' => { type: 'reduce', syntax: 8 }],
	['EXCLAMATION' => { type: 'reduce', syntax: 8 }] ]),
new Map<Token,ParsingOperation>([
	['DOLLAR' => { type: 'reduce', syntax: 5 }],
	['LABEL' => { type: 'reduce', syntax: 5 }],
	['EXCLAMATION' => { type: 'reduce', syntax: 5 }] ]),
new Map<Token,ParsingOperation>([
	['LEXDEF' => { type: 'goto', to: 22 }],
	['STRING' => { type: 'shift', to: 14 }],
	['REGEXP' => { type: 'shift', to: 15 }] ]),
new Map<Token,ParsingOperation>([
	[SYMBOL_EOF => { type: 'reduce', syntax: 9 }],
	['DOLLAR' => { type: 'reduce', syntax: 9 }],
	['LABEL' => { type: 'reduce', syntax: 9 }] ]),
new Map<Token,ParsingOperation>([ [ 'COLON' => { type: 'shift', to: 20 }] ]),
new Map<Token,ParsingOperation>([
	['DEF' => { type: 'goto', to: 23 }],
	['PATTERN' => { type: 'goto', to: 24 }],
	['LABEL' => { type: 'shift', to: 25 }] ]),
new Map<Token,ParsingOperation>([ [ 'COLON' => { type: 'shift', to: 26 }] ]),
new Map<Token,ParsingOperation>([
	['DOLLAR' => { type: 'reduce', syntax: 6 }],
	['LABEL' => { type: 'reduce', syntax: 6 }],
	['EXCLAMATION' => { type: 'reduce', syntax: 6 }] ]),
new Map<Token,ParsingOperation>([ [ 'SEMICOLON' => { type: 'shift', to: 27 }] ]),
new Map<Token,ParsingOperation>([
	['VBAR' => { type: 'shift', to: 28 }],
	['SEMICOLON' => { type: 'reduce', syntax: 16 }] ]),
new Map<Token,ParsingOperation>([
	['PATTERN' => { type: 'goto', to: 29 }],
	['LABEL' => { type: 'shift', to: 25 }],
	['VBAR' => { type: 'reduce', syntax: 18 }],
	['SEMICOLON' => { type: 'reduce', syntax: 18 }] ]),
new Map<Token,ParsingOperation>([
	['DEF' => { type: 'goto', to: 30 }],
	['PATTERN' => { type: 'goto', to: 24 }],
	['LABEL' => { type: 'shift', to: 25 }] ]),
new Map<Token,ParsingOperation>([
	[SYMBOL_EOF => { type: 'reduce', syntax: 14 }],
	['DOLLAR' => { type: 'reduce', syntax: 14 }],
	['LABEL' => { type: 'reduce', syntax: 14 }] ]),
new Map<Token,ParsingOperation>([
	['DEF' => { type: 'goto', to: 31 }],
	['PATTERN' => { type: 'goto', to: 24 }],
	['LABEL' => { type: 'shift', to: 25 }] ]),
new Map<Token,ParsingOperation>([
	['VBAR' => { type: 'reduce', syntax: 17 }],
	['SEMICOLON' => { type: 'reduce', syntax: 17 }] ]),
new Map<Token,ParsingOperation>([ [ 'SEMICOLON' => { type: 'shift', to: 32 }] ]),
new Map<Token,ParsingOperation>([ [ 'SEMICOLON' => { type: 'reduce', syntax: 15 }] ]),
new Map<Token,ParsingOperation>([
	[SYMBOL_EOF => { type: 'reduce', syntax: 13 }],
	['DOLLAR' => { type: 'reduce', syntax: 13 }],
	['LABEL' => { type: 'reduce', syntax: 13 }] ])
]

