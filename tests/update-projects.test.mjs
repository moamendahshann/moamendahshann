import test from 'node:test';
import assert from 'node:assert/strict';
import {renderProjects,replaceProjects,listRepositories,START,END} from '../scripts/update-projects.mjs';
const config={owner:'owner',featured:['featured'],exclude:[],projects:{featured:{title:'Featured',stack:'Python · SQLite'}}};
const repo=(name,extra={})=>({name,owner:{login:'owner'},private:false,visibility:'public',fork:false,archived:false,language:'JavaScript',description:'Project description',created_at:'2026-01-01T00:00:00Z',...extra});
test('new public projects appear automatically and featured order is preserved',()=>{
 const table=renderProjects([repo('older'),repo('brand-new',{created_at:'2026-11-01T00:00:00Z'}),repo('featured')],config);
 assert.ok(table.indexOf('Featured')<table.indexOf('brand-new'));assert.ok(table.indexOf('brand-new')<table.indexOf('older'));assert.match(table,/Python · SQLite/);
});
test('private, archived, forked, foreign and profile repositories stay out',()=>{
 const table=renderProjects([repo('featured'),repo('secret',{private:true}),repo('fork',{fork:true}),repo('archived',{archived:true}),repo('foreign',{owner:{login:'other'}}),repo('owner')],config);
 assert.equal(table.split('\n').length,3);assert.doesNotMatch(table,/secret|foreign|archived/);
});
test('metadata cannot break the table or create a javascript link',()=>{
 const table=renderProjects([repo('new',{description:'hello | [click](javascript:bad)\n<img src=x>',homepage:'javascript:alert(1)'})],config);
 assert.equal(table.split('\n').length,3);assert.match(table,/&#124;/);assert.match(table,/&lt;img/);assert.match(table,/\\\[click\\\]/);assert.match(table,/\[README\]/);
});
test('safe homepage becomes a demo; missing metadata gets a useful fallback',()=>{
 const table=renderProjects([repo('demo',{homepage:'https://example.com/a(b)'}),repo('empty',{description:null,language:null})],config);
 assert.match(table,/\*\*\[Live demo\]\(https:\/\/example.com\/a%28b%29\)/);assert.match(table,/Source code and project documentation/);
});
test('only marked content changes, and reruns are idempotent',()=>{
 const input=`before\n${START}\nold\n${END}\nafter`,table=renderProjects([repo('featured')],config);
 const next=replaceProjects(input,table);assert.ok(next.startsWith(`before\n${START}`));assert.ok(next.endsWith(`${END}\nafter`));assert.equal(replaceProjects(next,table),next);
 assert.throws(()=>replaceProjects('no markers',table));assert.throws(()=>replaceProjects(`${END}${START}`,table));assert.throws(()=>replaceProjects(`${START}${START}${END}`,table));
});
test('empty results preserve existing content by failing before replacement',()=>assert.throws(()=>renderProjects([],config)));
test('repository listing paginates and fails on incomplete API responses',async()=>{
 let count=0;const repos=await listRepositories('owner',{fetchImpl:async()=>({ok:true,json:async()=>++count===1?Array.from({length:100},(_,i)=>repo('p'+i)):[repo('last')]})});assert.equal(repos.length,101);assert.equal(count,2);
 await assert.rejects(listRepositories('owner',{fetchImpl:async()=>({ok:false,status:403})}),/HTTP 403/);
});
