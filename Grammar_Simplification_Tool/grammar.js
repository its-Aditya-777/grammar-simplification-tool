const EPSILON = 'ε';
const ARROW = '->';
/**
 * Parses multiline string into a CFG object.
 * Assumes single uppercase letters (A-Z) are variables and everything else is terminal.
 * LHS and RHS are separated by '->', '→', or '='. Multiple productions for the same variable can be separated by '|'.
 * E.g.:
 */
function parseGrammar(text) {
    const lines = text.split('\n');
    const grammar = new Map();
    let startSymbol = null;
    for (const line of lines) {
        const cleanedLine = line.trim();
        if (!cleanedLine) continue;
        let parts = cleanedLine.split(ARROW);
        if (parts.length !== 2) {
            parts = cleanedLine.split('→');
            if (parts.length !== 2) {
               parts = cleanedLine.split('=');
               if (parts.length !== 2) {
                   throw new Error(`Invalid rule format: ${line}. Expected Format: S -> A | B`);
               }
            }
        }
        const lhs = parts[0].trim();
        if (lhs.length === 0 || lhs.indexOf(' ') !== -1) {
            throw new Error(`Invalid Left-Hand Side in rule: ${line}. LHS must not contain spaces.`);
        }
        if (!startSymbol) startSymbol = lhs;
        const rhsList = parts[1].split('|').map(s => s.trim());
        
        if (!grammar.has(lhs)) {
            grammar.set(lhs, new Set());
        }
        for (const rhs of rhsList) {
            let normalizedRhs = rhs.replace(/\s+/g, ''); // Compact spacing
            if (normalizedRhs === 'e' || normalizedRhs.toLowerCase() === 'epsilon' || normalizedRhs === '') {
                normalizedRhs = EPSILON;
            }
            grammar.get(lhs).add(normalizedRhs);
        }
    }
    
    if (!startSymbol) throw new Error("Grammar is empty.");
    return { grammar, startSymbol };
}
function isVar(c) {
    return c.length === 1 && c >= 'A' && c <= 'Z';
}
function removeNullProductions(grammarObj) {
    const { grammar, startSymbol } = grammarObj;
    let nullable = new Set();
    let changed = true;
    // Step 1: Find nullable variables
    while (changed) {
        changed = false;
        for (const [lhs, rhsSet] of grammar.entries()) {
            if (!nullable.has(lhs)) {
                for (const rhs of rhsSet) {
                    if (rhs === EPSILON) {
                        nullable.add(lhs);
                        changed = true;
                        break;
                    }
                    let allNullable = true;
                    for (const char of rhs) {
                        if (!isVar(char) || !nullable.has(char)) {
                            allNullable = false;
                            break;
                        }
                    }
                    if (allNullable && rhs !== EPSILON) {
                        nullable.add(lhs);
                        changed = true;
                        break;
                    }
                }
            }
        }
    }
    let newGrammar = new Map();
    for (const [lhs, rhsSet] of grammar.entries()) {
        newGrammar.set(lhs, new Set(rhsSet));
    }
    
    let newStartSymbol = startSymbol;
    // Step 1.5: Introduce new start symbol S' -> S | ε if S is nullable
    if (nullable.has(startSymbol)) {
        newStartSymbol = startSymbol + "'";
        while(newGrammar.has(newStartSymbol)) {
             newStartSymbol += "'";
        }
        const initialSet = new Set();
        initialSet.add(startSymbol);
        initialSet.add(EPSILON);
        newGrammar.set(newStartSymbol, initialSet);
    }
    
    // Step 2: Generate combinations
    const finalGrammar = new Map();
    for (const [lhs, rhsSet] of newGrammar.entries()) {
        finalGrammar.set(lhs, new Set());
        for (const rhs of rhsSet) {
            if (rhs === EPSILON) {
                if (lhs === newStartSymbol) {
                    finalGrammar.get(lhs).add(EPSILON);
                }
                continue;
            }
            
            // Backtracking to find all combinations of removing nullable vars
            const combos = generateCombinations(rhs, nullable);
            for (const c of combos) {
                if (c !== '') {
                    finalGrammar.get(lhs).add(c);
                }
            }
        }
    }
    
    // Remove variables that ended up with empty production sets
    const emptyVars = [];
    for (const [lhs, rhsSet] of finalGrammar.entries()) {
        if (rhsSet.size === 0) {
            emptyVars.push(lhs);
            finalGrammar.delete(lhs);
        }
    }
    return { 
        grammar: finalGrammar, 
        startSymbol: newStartSymbol, 
        explanation: `Nullable variables found: { ${Array.from(nullable).join(', ') || 'None'} }.<br>New start symbol ${newStartSymbol} introduced if original was nullable.` 
    };
}
function generateCombinations(rhs, nullable) {
    let results = new Set();
    
    function backtrack(index, current) {
        if (index === rhs.length) {
            results.add(current);
            return;
        }
        
        const char = rhs[index];
        // Always include it
        backtrack(index + 1, current + char);
        // Exclude if nullable
        if (isVar(char) && nullable.has(char)) {
            backtrack(index + 1, current);
        }
    }
    
    backtrack(0, "");
    return Array.from(results);
}
function removeUnitProductions(grammarObj) {
    const { grammar, startSymbol } = grammarObj;
    
    const isUnit = (rhs) => rhs.length === 1 && isVar(rhs[0]);
    const unitPairs = new Map();
    for (const lhs of grammar.keys()) {
        unitPairs.set(lhs, new Set());
    }
    
    for (const lhs of grammar.keys()) {
        const visited = new Set();
        const stack = [lhs];
        
        while (stack.length > 0) {
            const current = stack.pop();
            visited.add(current);
            if (current !== lhs) {
                unitPairs.get(lhs).add(current);
            }
            if (grammar.has(current)) {
                for (const rhs of grammar.get(current)) {
                    if (isUnit(rhs) && !visited.has(rhs)) {
                        stack.push(rhs);
                    }
                }
            }
        }
    }
    
    let explanationPairs = [];
    for (const [lhs, pairs] of unitPairs.entries()) {
        for (const p of pairs) {
            explanationPairs.push(`${lhs} &rarr; ${p}`);
        }
    }
    const newGrammar = new Map();
    for (const lhs of grammar.keys()) {
        newGrammar.set(lhs, new Set());
    }
    for (const [lhs, rhsSet] of grammar.entries()) {
        // Add non-unit productions of self
        for (const rhs of rhsSet) {
            if (!isUnit(rhs)) {
                newGrammar.get(lhs).add(rhs);
            }
        }
        // Add non-unit productions of reachable unit variables
        const reachable = unitPairs.get(lhs);
        for (const r of reachable) {
            if (grammar.has(r)) {
                for (const rRhs of grammar.get(r)) {
                    if (!isUnit(rRhs)) {
                        newGrammar.get(lhs).add(rRhs);
                    }
                }
            }
        }
    }
    // Clean up empty rule sets
    for (const [lhs, rhsSet] of newGrammar.entries()) {
        if (rhsSet.size === 0 && lhs !== startSymbol) {
            newGrammar.delete(lhs);
        }
    }
    return { 
        grammar: newGrammar, 
        startSymbol, 
        explanation: `Unit pairs identified & collapsed: { ${explanationPairs.join(', ') || 'None'} }` 
    };
}
function removeUselessSymbols(grammarObj) {
    const { grammar, startSymbol } = grammarObj;
    
    // Step 1: Remove non-generating symbols
    let generating = new Set();
    let changed = true;
    while (changed) {
        changed = false;
        for (const [lhs, rhsSet] of grammar.entries()) {
            if (!generating.has(lhs)) {
                for (const rhs of rhsSet) {
                    let allGen = true;
                    if (rhs !== EPSILON) {
                        for (const char of rhs) {
                            if (isVar(char) && !generating.has(char)) {
                                allGen = false;
                                break;
                            }
                        }
                    }
                    if (allGen) {
                        generating.add(lhs);
                        changed = true;
                        break;
                    }
                }
            }
        }
    }
    let genGrammar = new Map();
    for (const [lhs, rhsSet] of grammar.entries()) {
        if (generating.has(lhs) || (lhs === startSymbol && rhsSet.has(EPSILON))) {
            const newSet = new Set();
            for (const rhs of rhsSet) {
                let allGen = true;
                if (rhs !== EPSILON) {
                    for (const char of rhs) {
                         if (isVar(char) && !generating.has(char)) {
                             allGen = false;
                             break;
                         }
                    }
                }
                if (allGen) newSet.add(rhs);
            }
            if (newSet.size > 0 || lhs === startSymbol) {
               genGrammar.set(lhs, newSet);
            }
        }
    }
    
    const removedGenerating = Array.from(grammar.keys()).filter(k => (!generating.has(k) && k !== startSymbol));
    // Step 2: Remove unreachable symbols
    let reachable = new Set();
    reachable.add(startSymbol);
    
    let queue = [startSymbol];
    while(queue.length > 0) {
        const current = queue.shift();
        if (genGrammar.has(current)) {
            for (const rhs of genGrammar.get(current)) {
                if (rhs !== EPSILON) {
                    for (const char of rhs) {
                        if (isVar(char) && !reachable.has(char)) {
                            reachable.add(char);
                            queue.push(char);
                        }
                    }
                }
            }
        }
    }
    let finalGrammar = new Map();
    const removedReachable = [];
    for (const [lhs, rhsSet] of genGrammar.entries()) {
        if (reachable.has(lhs)) {
            finalGrammar.set(lhs, rhsSet);
        } else {
            removedReachable.push(lhs);
        }
    }
    
    return {
        grammar: finalGrammar,
        startSymbol,
        explanation: `Non-generating variables removed: { ${removedGenerating.join(', ') || 'None'} }.<br>Unreachable variables removed: { ${removedReachable.join(', ') || 'None'} }.`
    };
}
function formatGrammarHTML(grammarObj) {
    const { grammar, startSymbol } = grammarObj;
    let outputTokens = [];
    
    const appendRule = (lhs, rhsSet) => {
        if (rhsSet.size === 0) return;
        const rhsArr = Array.from(rhsSet);
        let ruleHtml = `<span class="syn-var">${lhs}</span> <span class="syn-arrow">${ARROW}</span> `;
        let rhsHtmlArr = rhsArr.map(rhs => {
            if (rhs === EPSILON) return `<span class="syn-epsilon">${EPSILON}</span>`;
            let chars = "";
            for(let i=0; i<rhs.length; i++) {
                if(isVar(rhs[i])) {
                    chars += `<span class="syn-var">${rhs[i]}</span>`;
                } else {
                    chars += `<span class="syn-term">${rhs[i]}</span>`;
                }
            }
            return chars;
        });
        ruleHtml += rhsHtmlArr.join(`<span class="syn-pipe">|</span>`);
        outputTokens.push(ruleHtml);
    };
    if (grammar.has(startSymbol)) {
        appendRule(startSymbol, grammar.get(startSymbol));
    }
    
    for (const [lhs, rhsSet] of grammar.entries()) {
        if (lhs !== startSymbol) appendRule(lhs, rhsSet);
    }
    
    if (outputTokens.length === 0) return "<span style='color: var(--text-secondary);'>Grammar is completely empty.</span>";
    return outputTokens.join('<br>');
}

