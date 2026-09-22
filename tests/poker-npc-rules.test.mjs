import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import vm from 'node:vm';
import {webcrypto, randomUUID} from 'node:crypto';
import ts from 'typescript';
const source=readFileSync(new URL('../worker/index.ts',import.meta.url),'utf8');
const tree=ts.createSourceFile('worker.ts',source,ts.ScriptTarget.Latest,true);
const names=['pokerNpcCanRaise','pokerNpcFee','pokerNpcNextSeat','pokerNpcApplyAction','pokerNpcRoundDone','settlePokerNpc','evaluateFive','bestPokerHand','comparePokerScores'];
const code=tree.statements.filter(n=>ts.isFunctionDeclaration(n)&&names.includes(n.name?.text)).map(n=>n.getText(tree)).join('\n');
const api=vm.createContext({crypto:{getRandomValues:webcrypto.getRandomValues.bind(webcrypto),randomUUID},POKER_HAND_NAMES:['高牌','一對','兩對','三條','順子','同花','葫蘆','四條','同花順']});vm.runInContext(ts.transpile(code,{target:ts.ScriptTarget.ES2022}),api);
const seat=(seatNo,stack=3000)=>({seatNo,id:String(seatNo),displayName:String(seatNo),stack,bet:0,streetBet:0,status:'playing',acted:false});
test('fees only apply to positive profit, never unused capital',()=>{
 assert.equal(api.pokerNpcFee(2950,3000,300),0);
 assert.equal(api.pokerNpcFee(3000,3000,300),0);
 assert.equal(api.pokerNpcFee(3200,3000,300),6);
 assert.equal(api.pokerNpcFee(0,3000,300),0);
});
test('full raise sets minimum; short all-in does not reopen action',()=>{
 const g={seats:[seat(1),seat(2),seat(3,550)],pot:0,currentBet:100,minRaise:100,turnSeat:1,street:'preflop'};
 assert.equal(api.pokerNpcApplyAction(g,1,'raise',400,100).ok,true);
 assert.equal(g.currentBet,500);assert.equal(g.minRaise,400);
 assert.equal(api.pokerNpcApplyAction(g,2,'raise',100,100).ok,false);
 assert.equal(api.pokerNpcApplyAction(g,2,'call',0,100).ok,true);
 assert.equal(api.pokerNpcApplyAction(g,3,'all_in',0,100).ok,true);
 assert.equal(g.currentBet,550);assert.equal(api.pokerNpcCanRaise(g,g.seats[0],100),false);
 assert.equal(api.pokerNpcApplyAction(g,1,'raise',400,100).ok,false);
 assert.equal(api.pokerNpcApplyAction(g,1,'call',0,100).ok,true);
 assert.equal(g.seats[0].streetBet,550);
});
test('short stack can call all-in without negative balance; invalid action rejected',()=>{
 const g={seats:[seat(1,30),seat(2)],pot:100,currentBet:100,turnSeat:1,street:'flop'};
 assert.equal(api.pokerNpcApplyAction(g,1,'fake',0,100).ok,false);
 assert.equal(api.pokerNpcApplyAction(g,1,'call',0,100).ok,true);
 assert.equal(g.seats[0].stack,0);assert.equal(g.seats[0].bet,30);assert.equal(g.seats[0].status,'all_in');
});
test('next seat wraps from dealer while skipping folded players',()=>{
 const g={seats:[seat(1),{...seat(2),status:'folded'},seat(3)]};
 assert.equal(api.pokerNpcNextSeat(g,1),3);assert.equal(api.pokerNpcNextSeat(g,3),1);
});
test('actual settlement keeps folded capital and charges only winning profit',async()=>{
 for(const won of [false,true]){
  const human={...seat(1),isNpc:false,cards:['K♠','K♥'],stack:won?0:2950,bet:won?3000:50,status:won?'all_in':'folded'};
  const npc={...seat(2),isNpc:true,cards:['Q♠','Q♥'],stack:won?0:2900,bet:won?3000:100,status:'all_in'};
  const game={seats:[human,npc],communityCards:won?['K♦','2♣','7♠','8♥','3♦']:[],pot:won?6000:150};
  const session={id:'test',buy_in:3000,fee_rate_bp:300};let batch;
  const db={prepare:sql=>({bind:(...args)=>({sql,args,first:async()=>session})}),batch:async statements=>{batch=statements;}};
  await api.settlePokerNpc(db,session,game);
  assert.equal(batch[0].args[0],won?5910:2950);
  assert.equal(batch[1].args[3],won?90:0);
  assert.match(batch[1].args[1],won?/淨贏 NT\$2910/:/已棄牌.*淨輸 NT\$50/);
 }
});
