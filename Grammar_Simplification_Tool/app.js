document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const themeToggle = document.getElementById('theme-toggle');
    const moonIcon = document.getElementById('moon-icon');
    const sunIcon = document.getElementById('sun-icon');
    
    const btnSimplify = document.getElementById('btn-simplify');
    const btnExample = document.getElementById('btn-example');
    const btnClear = document.getElementById('btn-clear');
    
    const grammarInput = document.getElementById('grammar-input');
    const errorMsg = document.getElementById('error-message');
    const resultsSection = document.getElementById('results-section');
    
    const btnText = document.querySelector('.btn-text');
    const loader = document.querySelector('.loader');
    // Theme Toggle
    themeToggle.addEventListener('click', () => {
        const root = document.documentElement;
        if (root.getAttribute('data-theme') === 'dark') {
            root.setAttribute('data-theme', 'light');
            moonIcon.style.display = 'block';
            sunIcon.style.display = 'none';
        } else {
            root.setAttribute('data-theme', 'dark');
            moonIcon.style.display = 'none';
            sunIcon.style.display = 'block';
        }
    });
    // Copy to Clipboard Buttons
    document.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const card = e.currentTarget.closest('.glass-card');
            const display = card.querySelector('.grammar-display');
            const textToCopy = display.innerText;
            navigator.clipboard.writeText(textToCopy).then(() => {
                const originalSvg = btn.innerHTML;
                btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--terminal-color);"><polyline points="20 6 9 17 4 12"></polyline></svg>';
                setTimeout(() => { btn.innerHTML = originalSvg; }, 2000);
            });
        });
    });
    // Default Example setup
    const exampleText = `S -> AB | aC
A -> aA | e
B -> Bb | e
C -> c
D -> d`;
    btnExample.addEventListener('click', () => {
        grammarInput.value = exampleText;
        clearErrors();
        simulateInputFeedback();
    });
    btnClear.addEventListener('click', () => {
        grammarInput.value = '';
        clearErrors();
        resultsSection.style.display = 'none';
        document.querySelectorAll('.stage-card').forEach(c => c.classList.remove('show'));
    });
    
    function simulateInputFeedback() {
        grammarInput.style.backgroundColor = 'rgba(79, 70, 229, 0.1)';
        setTimeout(() => { grammarInput.style.backgroundColor = ''; }, 300);
    }
    function clearErrors() {
        errorMsg.style.display = 'none';
        errorMsg.innerText = '';
        grammarInput.style.borderColor = '';
    }
    function showError(msg) {
        errorMsg.style.display = 'block';
        errorMsg.innerText = msg;
        grammarInput.style.borderColor = 'var(--error-text)';
        resultsSection.style.display = 'none';
        document.querySelectorAll('.stage-card').forEach(c => c.classList.remove('show'));
    }
    // Simplification Process
    btnSimplify.addEventListener('click', () => {
        const inputText = grammarInput.value;
        if (!inputText.trim()) {
            showError("Please enter a valid CFG.");
            return;
        }
        clearErrors();
        
        // Start Loading state
        btnSimplify.disabled = true;
        btnText.style.display = 'none';
        loader.style.display = 'block';
        // Simulate short calculation delay for UI UX feeling
        setTimeout(() => {
            try {
                // Parse
                let currentGrammar = parseGrammar(inputText);
                
                // Card 1: Original
                const stageOriginalList = document.querySelector('#stage-original .grammar-display');
                stageOriginalList.innerHTML = formatGrammarHTML(currentGrammar);
                // Step 1: Null removal
                const nullResult = removeNullProductions(currentGrammar);
                currentGrammar = { grammar: nullResult.grammar, startSymbol: nullResult.startSymbol };
                document.querySelector('#stage-null .explanation-panel').innerHTML = nullResult.explanation;
                document.querySelector('#stage-null .grammar-display').innerHTML = formatGrammarHTML(currentGrammar);
                // Step 2: Unit removal
                const unitResult = removeUnitProductions(currentGrammar);
                currentGrammar = { grammar: unitResult.grammar, startSymbol: unitResult.startSymbol };
                document.querySelector('#stage-unit .explanation-panel').innerHTML = unitResult.explanation;
                document.querySelector('#stage-unit .grammar-display').innerHTML = formatGrammarHTML(currentGrammar);
                // Step 3: Useless removal
                const uselessResult = removeUselessSymbols(currentGrammar);
                currentGrammar = { grammar: uselessResult.grammar, startSymbol: uselessResult.startSymbol };
                document.querySelector('#stage-useless .explanation-panel').innerHTML = uselessResult.explanation;
                document.querySelector('#stage-useless .grammar-display').innerHTML = formatGrammarHTML(currentGrammar);
                // Reveal Results Sequentially
                resultsSection.style.display = 'flex';
                
                const cards = document.querySelectorAll('.stage-card');
                cards.forEach((card, index) => {
                    card.classList.remove('show');
                    setTimeout(() => {
                        card.classList.add('show');
                    }, index * 200 + 100);
                });
            } catch (err) {
                showError(err.message);
            } finally {
                btnSimplify.disabled = false;
                btnText.style.display = 'inline-block';
                loader.style.display = 'none';
            }
        }, 600);
    });
});
