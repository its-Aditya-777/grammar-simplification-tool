const isNonTerminal = s => /^[A-Z]$/.test(s);
const uniq = arr => [...new Set(arr)];
function clone(obj){ return JSON.parse(JSON.stringify(obj)); }

function formatGrammar(g){
  return Object.keys(g).map(k => `${k} → ${g[k].join(' | ')}`).join('<br>');
}

function display(title, grammar){
  const div = document.createElement('div');
  div.className = 'step';
  div.innerHTML = `<h3>${title}</h3><p>${formatGrammar(grammar)}</p>`;
  document.getElementById('output').appendChild(div);
}

function parseGrammar(input){
  const lines = input.split('\n').map(l=>l.trim()).filter(Boolean);
  const g = {};
  lines.forEach(line => {
    const [lhs, rhs] = line.split('->').map(x=>x.trim());
    const alts = rhs.split('|').map(r=>r.trim());
    g[lhs] = uniq((g[lhs]||[]).concat(alts));
  });
  return g;
}

function computeNullable(g){
  const nullable = new Set();
  let changed = true;
  while(changed){
    changed = false;
    for(const A in g){
      for(const rhs of g[A]){
        if(rhs === 'ε' || rhs.split('').every(ch => nullable.has(ch))){
          if(!nullable.has(A)){ nullable.add(A); changed = true; }
        }
      }
    }
  }
  return nullable;
}

function removeNullProductions(g, start){
  const nullable = computeNullable(g);
  const newG = {};

  for(const A in g){
    const results = new Set();
    for(const rhs of g[A]){
      if(rhs === 'ε') continue;
      const chars = rhs.split('');
      const pos = [];
      chars.forEach((ch,i)=>{ if(nullable.has(ch)) pos.push(i); });

      const total = 1 << pos.length;
      for(let mask=0; mask<total; mask++){
        const temp = chars.slice();
        for(let j=0;j<pos.length;j++){
          if(mask & (1<<j)) temp[pos[j]] = '';
        }
        const candidate = temp.join('') || 'ε';
        results.add(candidate);
      }
    }
    newG[A] = uniq([...results].filter(r => r !== 'ε'));
  }

  if(nullable.has(start)){
    newG[start].push('ε');
  }
  return newG;
}

function removeUnitProductions(g){
  const newG = {};
  const nts = Object.keys(g);

  const closure = {};
  nts.forEach(A => {
    closure[A] = new Set([A]);
    const stack = [A];
    while(stack.length){
      const X = stack.pop();
      (g[X]||[]).forEach(rhs => {
        if(rhs.length === 1 && isNonTerminal(rhs)){
          if(!closure[A].has(rhs)){
            closure[A].add(rhs);
            stack.push(rhs);
          }
        }
      });
    }
  });

  nts.forEach(A => {
    const set = new Set();
    closure[A].forEach(B => {
      (g[B]||[]).forEach(rhs => {
        if(!(rhs.length === 1 && isNonTerminal(rhs))){
          set.add(rhs);
        }
      });
    });
    newG[A] = uniq([...set]);
  });

  return newG;
}

function removeUselessSymbols(g, start){
  const generating = new Set();
  let changed = true;
  while(changed){
    changed = false;
    for(const A in g){
      for(const rhs of g[A]){
        if(rhs === 'ε' || rhs.split('').every(ch => !isNonTerminal(ch) || generating.has(ch))){
          if(!generating.has(A)){ generating.add(A); changed = true; }
        }
      }
    }
  }

  const g1 = {};
  for(const A in g){
    if(!generating.has(A)) continue;
    g1[A] = g[A].filter(rhs => rhs.split('').every(ch => !isNonTerminal(ch) || generating.has(ch)));
  }

  const reachable = new Set([start]);
  const stack = [start];
  while(stack.length){
    const A = stack.pop();
    (g1[A]||[]).forEach(rhs => {
      rhs.split('').forEach(ch => {
        if(isNonTerminal(ch) && !reachable.has(ch)){
          reachable.add(ch);
          stack.push(ch);
        }
      });
    });
  }

  const g2 = {};
  for(const A in g1){
    if(reachable.has(A)){
      g2[A] = g1[A];
    }
  }
  return g2;
}

function simplify(){
  document.getElementById('output').innerHTML = '';

  const input = document.getElementById('grammarInput').value;
  let g = parseGrammar(input);
  const start = Object.keys(g)[0];

  display('Original Grammar', clone(g));
  g = removeNullProductions(g, start);
  display('After Removing Null Productions', clone(g));
  g = removeUnitProductions(g);
  display('After Removing Unit Productions', clone(g));
  g = removeUselessSymbols(g, start);
  display('Final Simplified Grammar', clone(g));
}
