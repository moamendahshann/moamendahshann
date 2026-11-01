import {readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';

export const START='<!-- PROJECTS:START -->';
export const END='<!-- PROJECTS:END -->';

export function escapeCell(value){
 return String(value??'').replace(/\s+/g,' ').trim()
  .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
  .replace(/\|/g,'&#124;').replace(/[\\[\]*_`~]/g,'\\$&');
}
function homepage(value){
 try{const u=new URL(value);if(!['https:','http:'].includes(u.protocol)||u.username||u.password)return null;return u.href.replace(/\(/g,'%28').replace(/\)/g,'%29')}catch{return null}
}
export function renderProjects(repositories,config){
 const owner=config.owner.toLowerCase();
 const priority=new Map(config.featured.map((name,i)=>[name.toLowerCase(),i]));
 const excluded=new Set([owner,...(config.exclude||[]).map(x=>x.toLowerCase())]);
 const unique=new Map();
 for(const repo of repositories){
  if(repo.owner?.login?.toLowerCase()!==owner||repo.private!==false||repo.visibility&&repo.visibility!=='public'||repo.fork||repo.archived||repo.disabled||excluded.has(repo.name?.toLowerCase()))continue;
  if(!repo.name)continue;
  unique.set(repo.name.toLowerCase(),repo);
 }
 const sorted=[...unique.values()].sort((a,b)=>{
  const rankA=priority.get(a.name.toLowerCase())??Infinity,rankB=priority.get(b.name.toLowerCase())??Infinity;
  if(rankA!==rankB)return rankA-rankB;
  return String(b.created_at||'').localeCompare(String(a.created_at||''))||a.name.localeCompare(b.name);
 });
 const lines=['| Project | What you can explore | Stack | Start here |','| --- | --- | --- | --- |'];
 for(const repo of sorted){
  const custom=config.projects?.[repo.name]||{};
  const link=`https://github.com/${encodeURIComponent(config.owner)}/${encodeURIComponent(repo.name)}`;
  const title=escapeCell(custom.title||repo.name);
  const description=escapeCell(repo.description||'Source code and project documentation.');
  const stack=escapeCell(custom.stack||repo.language||'—');
  const demo=homepage(repo.homepage);
  const entry=demo?`**[Live demo](${demo})**`:`[${escapeCell(custom.linkLabel||'README')}](${link}${custom.anchor||'#readme'})`;
  lines.push(`| **[${title}](${link})** | ${description} | ${stack} | ${entry} |`);
 }
 if(!sorted.length)throw Error('No eligible public projects were returned; keeping the existing table.');
 return lines.join('\n');
}
export function replaceProjects(readme,table){
 const count=(token)=>readme.split(token).length-1;
 if(count(START)!==1||count(END)!==1)throw Error('README must contain exactly one start and one end marker.');
 const start=readme.indexOf(START)+START.length,end=readme.indexOf(END);
 if(start>end)throw Error('Project markers are reversed.');
 return readme.slice(0,start)+'\n\n'+table+'\n\n'+readme.slice(end);
}
export async function listRepositories(owner,{fetchImpl=fetch,token}={}){
 const all=[];
 for(let page=1;page<=100;page++){
  const headers={Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'};
  if(token)headers.Authorization=`Bearer ${token}`;
  const response=await fetchImpl(`https://api.github.com/users/${encodeURIComponent(owner)}/repos?type=owner&sort=created&direction=desc&per_page=100&page=${page}`,{headers,signal:AbortSignal.timeout(20000)});
  if(!response.ok)throw Error(`GitHub repository listing failed (HTTP ${response.status}); existing README was not changed.`);
  const repos=await response.json();
  if(!Array.isArray(repos))throw Error('Unexpected GitHub response; keeping the existing README.');
  all.push(...repos);
  if(repos.length<100)return all;
 }
 throw Error('Repository pagination exceeded its safety limit; existing README was not changed.');
}
export async function main(){
 const config=JSON.parse(await readFile(new URL('../projects.config.json',import.meta.url),'utf8'));
 const readmePath=new URL('../README.md',import.meta.url);
 const original=await readFile(readmePath,'utf8');
 const repos=await listRepositories(config.owner,{token:process.env.GITHUB_TOKEN});
 const next=replaceProjects(original,renderProjects(repos,config));
 if(next===original){console.log('Project table is already current.');return}
 await writeFile(readmePath,next,'utf8');console.log('Updated the project table from public GitHub repositories.');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){main().catch(e=>{console.error(e.message);process.exitCode=1})}
