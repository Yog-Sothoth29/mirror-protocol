import assert from 'node:assert/strict';
import { mirrorSchedule, validateMirrorConfig } from './mirror-protocol.mjs';

const config = validateMirrorConfig({version:1,enabled:true,epochMs:1792075846000,seed:20261015,quietMinMs:360000,quietMaxMs:840000,redMinMs:25000,redMaxMs:70000});
let checks=0, boundary=config.epochMs;
const durations=[];
for(let cycle=0;cycle<4096;cycle++) {
  const blue=mirrorSchedule(config,boundary);
  assert.equal(blue.mode,'blue');assert.equal(blue.cycle,cycle);
  const quiet=blue.nextAt-boundary;
  assert.ok(quiet>=config.quietMinMs&&quiet<config.quietMaxMs);
  assert.equal(mirrorSchedule(config,blue.nextAt-1).mode,'blue');
  const red=mirrorSchedule(config,blue.nextAt);
  assert.equal(red.mode,'red');assert.equal(red.cycle,cycle);
  const length=red.nextAt-blue.nextAt;
  assert.ok(length>=config.redMinMs&&length<config.redMaxMs);
  assert.equal(mirrorSchedule(config,red.nextAt-1).mode,'red');
  assert.equal(mirrorSchedule(config,red.nextAt).mode,'blue');
  assert.deepEqual(mirrorSchedule(config,blue.nextAt),red);
  durations.push([quiet,length]);boundary=red.nextAt;checks+=10;
}
assert.ok(new Set(durations.map(x=>x[0])).size>4000);checks++;
assert.ok(new Set(durations.map(x=>x[1])).size>3800);checks++;
assert.notDeepEqual(mirrorSchedule({...config,seed:8},config.epochMs),mirrorSchedule(config,config.epochMs));checks++;
for(const raw of [{...config,seed:NaN},{...config,epochMs:Infinity},{...config,quietMaxMs:5000},{...config,version:2},{...config,redMaxMs:20000}]){assert.throws(()=>validateMirrorConfig(raw));checks++;}
assert.equal(validateMirrorConfig(null),null);checks++;
assert.equal(validateMirrorConfig({...config,defaultAppearance:'night'}).defaultAppearance,'night');checks++;
assert.throws(()=>validateMirrorConfig({...config,defaultAppearance:'invalid'}));checks++;
const copied=validateMirrorConfig({...config,script:'malicious',css:'arbitrary'});assert.equal(copied.script,undefined);assert.equal(copied.css,undefined);checks+=2;
console.log(JSON.stringify({pass:true,checks,cycles:durations.length,simulatedDays:((boundary-config.epochMs)/86400000).toFixed(2),quietRange:[Math.min(...durations.map(x=>x[0])),Math.max(...durations.map(x=>x[0]))],redRange:[Math.min(...durations.map(x=>x[1])),Math.max(...durations.map(x=>x[1]))]},null,2));
