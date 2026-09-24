import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import vm from 'node:vm';
import {webcrypto, randomUUID} from 'node:crypto';
import ts from 'typescript';

const source=readFileSync(new URL('../worker/index.ts',import.meta.url),'utf8');
const tree=ts.createSourceFile('worker.ts',source,ts.ScriptTarget.Latest,true);
const names=['shuffledDeck','baccaratCardPoints','baccaratScore','dealBaccaratRound','baccaratPayout'];
const code=tree.statements.filter(n=>ts.isFunctionDeclaration(n)&&names.includes(n.name?.text)).map(n=>n.getText(tree)).join('\n');
const api=vm.createContext({crypto:{getRandomValues:webcrypto.getRandomValues.bind(webcrypto),randomUUID},CARD_SUITS:['♠','♥','♦','♣'],CARD_RANKS:['2','3','4','5','6','7','8','9','10','J','Q','K','A']});
vm.runInContext(ts.transpile(code,{target:ts.ScriptTarget.ES2022}),api);

test('an eight-deck baccarat shoe contains eight copies of every card',()=>{
 const shoe=api.shuffledDeck(8);
 assert.equal(shoe.length,416);
 assert.equal(new Set(shoe).size,52);
 assert.ok([...new Set(shoe)].every(card=>shoe.filter(item=>item===card).length===8));
});

test('baccarat totals use modulo ten and natural 8 or 9 stands',()=>{
 assert.equal(api.baccaratCardPoints('A♠'),1);
 assert.equal(api.baccaratCardPoints('K♥'),0);
 assert.equal(api.baccaratScore(['9♠','8♥']),7);
 const hand=api.dealBaccaratRound(['K♦','8♣','K♠','9♥']);
 assert.deepEqual(Array.from(hand.playerCards),['9♥','K♠']);
 assert.deepEqual(Array.from(hand.bankerCards),['8♣','K♦']);
 assert.equal(hand.winner,'player');
 assert.equal(hand.playerCards.length,2);
 assert.equal(hand.bankerCards.length,2);
});

test('banker follows the third-card table when player draws',()=>{
 const hand=api.dealBaccaratRound(['K♦','5♣','2♦','2♣','2♥','3♥','2♠']);
 assert.equal(hand.playerCards.length,3);
 assert.equal(hand.bankerCards.length,3);
 assert.equal(hand.playerTotal,7);
 assert.equal(hand.bankerTotal,9);
});

test('baccarat returns gross payouts at 0.95:1, 1:1 and 8:1, with banker/player pushes on a tie',()=>{
 assert.equal(api.baccaratPayout(100,'banker','banker'),195);
 assert.equal(api.baccaratPayout(100,'player','player'),200);
 assert.equal(api.baccaratPayout(100,'tie','tie'),900);
 assert.equal(api.baccaratPayout(100,'banker','tie'),100);
 assert.equal(api.baccaratPayout(100,'player','tie'),100);
 assert.equal(api.baccaratPayout(100,'tie','banker'),0);
});
