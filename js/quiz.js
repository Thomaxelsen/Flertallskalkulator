document.addEventListener('DOMContentLoaded', () => {
    // Globale variabler
    let allRepresentatives = [];
    let partiesMap = {};
    let repsWithImagesAndGender = [];
    let menWithImages = [];
    let womenWithImages = [];
    let score = 0;
    let currentQuizType = null;
    let allCommittees = [];

    // DOM-elementer
    const selectionArea = document.getElementById('quiz-selection-area');
    const quizContainer = document.getElementById('quiz-container');
    const quizContent = document.getElementById('quiz-content');
    const quizTitle = document.getElementById('quiz-title');
    const scoreDisplay = document.getElementById('quiz-score-display');
    const backToSelectionBtn = document.getElementById('back-to-selection-btn');

    // Hent data og initialiser
    Promise.all([
        fetch('data/representatives.json').then(res => res.json()),
        fetch('data/parties.json').then(res => res.json())
    ]).then(([repsData, partiesData]) => {
        allRepresentatives = repsData.filter(rep => rep.isActive && rep.gender);
        partiesData.forEach(p => partiesMap[p.shorthand] = p);

        repsWithImagesAndGender = allRepresentatives.filter(rep => rep.imageUrl);
        menWithImages = repsWithImagesAndGender.filter(rep => rep.gender === 'M');
        womenWithImages = repsWithImagesAndGender.filter(rep => rep.gender === 'K');

        allCommittees = [...new Set(allRepresentatives
            .filter(rep => rep.committee && rep.committee.trim() !== '')
            .map(rep => rep.committee.trim())
        )];
        
        console.log(`Quiz: Loaded ${allRepresentatives.length} active reps and ${Object.keys(partiesMap).length} parties.`);
        setupSelectionListeners();
    }).catch(error => {
        console.error("Error loading data:", error);
        selectionArea.innerHTML = "<h2>Kunne ikke laste quiz-data.</h2><p>Vennligst prøv å laste siden på nytt.</p>";
    });
    
    function setupSelectionListeners() {
        selectionArea.addEventListener('click', (e) => {
            if (e.target.matches('button[data-quiz-type]')) {
                currentQuizType = e.target.dataset.quizType;
                startQuiz(currentQuizType);
            }
        });

        backToSelectionBtn.addEventListener('click', () => {
            quizContainer.style.display = 'none';
            selectionArea.style.display = 'block';
        });
    }

    function startQuiz(quizType) {
        selectionArea.style.display = 'none';
        quizContainer.style.display = 'block';
        score = 0;
        updateScore();

        if (quizType === 'guess-name') {
            quizTitle.textContent = "Gjett navnet (1/2)";
            scoreDisplay.style.display = 'block';
            startGuessNameQuiz();
        } else if (quizType === 'guess-face') {
            quizTitle.textContent = "Gjett ansiktet (1/2)";
            scoreDisplay.style.display = 'block';
            startGuessFaceQuiz();
        } else if (quizType === 'match-committee') {
            quizTitle.textContent = "Koble politiker til komité";
            scoreDisplay.style.display = 'none';
            startMatchCommitteeQuiz();
        }
    }
    
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    function updateScore() {
        scoreDisplay.textContent = `Poeng: ${score}`;
    }

    // --- STEG 1 FEEDBACK: Håndterer svar på navn/bilde ---
    function handleIdentityAnswer(isCorrect, correctRep, clickedElement, optionsSelector) {
        if (isCorrect) {
            score++;
            updateScore();
        }

        // Visuell feedback på svaralternativene
        const allOptions = quizContent.querySelectorAll(optionsSelector);
        allOptions.forEach(opt => {
            opt.classList.add('answered');
            if (opt.dataset.name === correctRep.name) {
                opt.classList.add('correct');
            } else if (opt === clickedElement) {
                opt.classList.add('incorrect');
            } else {
                opt.classList.add('faded');
            }
            if (opt.tagName === 'BUTTON') opt.disabled = true;
        });

        // Gå videre til å gjette parti etter en pause
        setTimeout(() => {
            buildPartyQuestion(correctRep);
        }, 1500);
    }

    // --- STEG 2: Bygger spørsmålet om parti ---
    function buildPartyQuestion(correctRep) {
        if (currentQuizType === 'guess-name') quizTitle.textContent = "Gjett partiet (2/2)";
        if (currentQuizType === 'guess-face') quizTitle.textContent = "Gjett partiet (2/2)";

        const correctPartyShorthand = correctRep.partyShorthand;
        const allPartyShorthands = Object.keys(partiesMap);
        const incorrectPartyOptions = shuffleArray(allPartyShorthands.filter(p => p !== correctPartyShorthand)).slice(0, 3);
        
        let partyOptions = [correctPartyShorthand, ...incorrectPartyOptions];
        partyOptions = shuffleArray(partyOptions);

        const partyQuestionHTML = `
            <h4 class="party-selection-prompt">Hvilket parti tilhører ${correctRep.name}?</h4>
            <div class="party-options-container">
                ${partyOptions.map(shorthand => {
                    const party = partiesMap[shorthand];
                    return `
                        <div class="party-option-btn" data-shorthand="${shorthand}">
                            <img src="images/parties/${shorthand.toLowerCase()}.png" alt="${party.name}">
                            <span>${party.name}</span>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
        quizContent.innerHTML += partyQuestionHTML;

        // Legg til lyttere på de nye partiknappene
        quizContent.querySelectorAll('.party-option-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const clickedBtn = e.currentTarget;
                const selectedShorthand = clickedBtn.dataset.shorthand;
                const isCorrect = selectedShorthand === correctPartyShorthand;
                
                // Gi endelig feedback og vis "Neste"-knapp
                handlePartyAnswer(isCorrect, correctRep, clickedBtn);
            });
        });
    }

    // --- STEG 2 FEEDBACK: Håndterer svar på parti og viser "Neste"-knapp ---
    function handlePartyAnswer(isCorrect, correctRep, clickedElement) {
        const feedbackDiv = document.createElement('div');
        feedbackDiv.className = 'feedback-message';
        const correctPartyName = partiesMap[correctRep.partyShorthand].name;

        if (isCorrect) {
            feedbackDiv.classList.add('correct');
            feedbackDiv.textContent = 'Riktig!';
            score++;
            updateScore();
        } else {
            feedbackDiv.classList.add('incorrect');
            feedbackDiv.textContent = `Feil. ${correctRep.name} tilhører ${correctPartyName}.`;
        }

        const allPartyOptions = quizContent.querySelectorAll('.party-option-btn');
        allPartyOptions.forEach(opt => {
            opt.classList.add('answered');
            if (opt.dataset.shorthand === correctRep.partyShorthand) {
                opt.classList.add('correct');
            } else if (opt === clickedElement) {
                opt.classList.add('incorrect');
            } else {
                opt.classList.add('faded');
            }
        });

        const nextButton = document.createElement('button');
        nextButton.id = 'next-question-btn';
        nextButton.className = 'button primary';
        nextButton.textContent = 'Neste spørsmål';
        const nextFunction = currentQuizType === 'guess-name' ? startGuessNameQuiz : startGuessFaceQuiz;
        nextButton.addEventListener('click', nextFunction, { once: true });

        quizContent.appendChild(feedbackDiv);
        quizContent.appendChild(nextButton);
    }
    
    // --- Quiz 1: Gjett Navnet ---
    function startGuessNameQuiz() {
        if (menWithImages.length < 8 && womenWithImages.length < 8) {
            quizContent.innerHTML = "<p>For få representanter med bilder til å starte quizen.</p>";
            return;
        }
        quizTitle.textContent = "Gjett navnet (1/2)"; // Reset tittel

        let potentialCorrectReps = [];
        if (menWithImages.length >= 8) potentialCorrectReps.push(...menWithImages);
        if (womenWithImages.length >= 8) potentialCorrectReps.push(...womenWithImages);
        
        const correctRep = potentialCorrectReps[Math.floor(Math.random() * potentialCorrectReps.length)];
        const correctGender = correctRep.gender;

        let options = [correctRep];
        let sourceForOptions = (correctGender === 'M') ? menWithImages : womenWithImages;
        const otherReps = shuffleArray([...sourceForOptions].filter(rep => rep.name !== correctRep.name));
        options.push(...otherReps.slice(0, 7));
        options = shuffleArray(options);

        quizContent.innerHTML = `
            <div class="question-image-container">
                <img src="${correctRep.imageUrl}" alt="Bilde av en politiker" class="question-image">
            </div>
            <div class="answer-options-names">
                ${options.map(opt => `<button class="button secondary" data-name="${opt.name}">${opt.name}</button>`).join('')}
            </div>
        `;

        quizContent.querySelectorAll('.answer-options-names button').forEach(button => {
            button.addEventListener('click', (e) => {
                const selectedName = e.target.dataset.name;
                const isCorrect = selectedName === correctRep.name;
                handleIdentityAnswer(isCorrect, correctRep, e.target, '.answer-options-names button');
            });
        });
    }

    // --- Quiz 2: Gjett Ansiktet ---
    function startGuessFaceQuiz() {
        if (menWithImages.length < 8 && womenWithImages.length < 8) {
            quizContent.innerHTML = "<p>For få representanter med bilder til å starte quizen.</p>";
            return;
        }
        quizTitle.textContent = "Gjett ansiktet (1/2)"; // Reset tittel

        let sourceForOptions;
        const canUseMen = menWithImages.length >= 8;
        const canUseWomen = womenWithImages.length >= 8;

        if (canUseMen && canUseWomen) {
            sourceForOptions = Math.random() < 0.5 ? menWithImages : womenWithImages;
        } else {
            sourceForOptions = canUseMen ? menWithImages : womenWithImages;
        }

        let options = shuffleArray([...sourceForOptions]).slice(0, 8);
        const correctRep = options[Math.floor(Math.random() * options.length)];
        
        quizContent.innerHTML = `
            <h3 class="question-name">${correctRep.name}</h3>
            <div class="answer-options-images">
                ${options.map(opt => `
                    <div class="image-option-card" data-name="${opt.name}">
                        <img src="${opt.imageUrl}" alt="Bilde av en politiker">
                    </div>
                `).join('')}
            </div>
        `;

        quizContent.querySelectorAll('.image-option-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const clickedCard = e.currentTarget;
                const selectedName = clickedCard.dataset.name;
                const isCorrect = selectedName === correctRep.name;
                handleIdentityAnswer(isCorrect, correctRep, clickedCard, '.image-option-card');
            });
        });
    }

    // --- Quiz 3: Koble til Komité (UENDRET) ---
    function escapeHtml(text) {
        if (typeof text !== 'string') return '';
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function escapeAttribute(text) {
        return escapeHtml(text);
    }

    function createRepresentativeImageMarkup(rep) {
        if (rep.imageUrl) {
            const safeUrl = escapeAttribute(rep.imageUrl);
            const safeName = escapeAttribute(rep.name);
            return `<img src="${safeUrl}" alt="${safeName}" class="committee-rep-image">`;
        }

        const initials = rep.name
            .split(' ')
            .filter(Boolean)
            .map(part => part[0])
            .join('')
            .slice(0, 2)
            .toUpperCase();

        return `<div class="committee-rep-placeholder">${initials}</div>`;
    }

    function getCommitteeOptions(correctCommittee, optionPool) {
        const options = new Set([correctCommittee]);
        const shuffledPool = shuffleArray([...optionPool]);

        for (const committee of shuffledPool) {
            if (options.size >= Math.min(4, optionPool.length)) break;
            options.add(committee);
        }

        return shuffleArray([...options]);
    }

    function startMatchCommitteeQuiz() {
        const repsWithCommittee = allRepresentatives.filter(rep => rep.committee && rep.committee.trim() !== "");
        if (repsWithCommittee.length < 4 || allCommittees.length < 2) {
            quizContent.innerHTML = "<p>For få representanter med komité-tilhørighet til å starte quizen.</p>";
            return;
        }

        const numberOfQuestions = Math.min(8, repsWithCommittee.length);
        const selectedReps = shuffleArray([...repsWithCommittee]).slice(0, numberOfQuestions);

        const cardsHTML = selectedReps.map((rep, index) => {
            const trimmedCommittee = rep.committee.trim();
            const safeCommitteeAttr = escapeAttribute(trimmedCommittee);
            const safeName = escapeHtml(rep.name);
            const safeParty = rep.partyShorthand ? escapeHtml(rep.partyShorthand) : '';
            const committeeOptions = getCommitteeOptions(trimmedCommittee, allCommittees);
            const imageMarkup = createRepresentativeImageMarkup(rep);

            return `
                <div class="committee-card" data-correct-committee="${safeCommitteeAttr}">
                    <div class="committee-rep-info">
                        <div class="committee-rep-visual">${imageMarkup}</div>
                        <div class="committee-rep-meta">
                            <div class="committee-rep-name">${safeName}</div>
                            ${safeParty ? `<div class="committee-rep-party">${safeParty}</div>` : ''}
                        </div>
                    </div>
                    <div class="committee-options" role="radiogroup" aria-label="Komitévalg for ${safeName}">
                        ${committeeOptions.map((option, optionIndex) => `
                            <label class="committee-option" data-committee="${escapeAttribute(option)}">
                                <input type="radio" name="committee-${index}" value="${escapeAttribute(option)}">
                                <span>${escapeHtml(option)}</span>
                            </label>
                        `).join('')}
                    </div>
                </div>
            `;
        }).join('');

        quizContent.innerHTML = `
            <div class="committee-quiz-container">
                <p class="match-instructions">Marker hvilken komité du mener hver representant sitter i.</p>
                <div class="committee-card-grid">
                    ${cardsHTML}
                </div>
                <div class="quiz-controls">
                    <button id="submit-committee-answers" class="button primary">Sjekk svar</button>
                </div>
            </div>
        `;

        const submitBtn = document.getElementById('submit-committee-answers');
        submitBtn.addEventListener('click', () => {
            evaluateCommitteeQuiz();
        });
    }

    function evaluateCommitteeQuiz() {
        const submitBtn = document.getElementById('submit-committee-answers');
        const cards = quizContent.querySelectorAll('.committee-card');
        const oldFeedback = quizContent.querySelector('.feedback-message');
        if (oldFeedback) oldFeedback.remove();

        let correctCount = 0;
        let unansweredCount = 0;

        cards.forEach(card => {
            const correctCommittee = card.dataset.correctCommittee;
            const selectedInput = card.querySelector('input[type="radio"]:checked');
            const optionLabels = card.querySelectorAll('.committee-option');

            card.classList.remove('correct', 'incorrect', 'unanswered');
            optionLabels.forEach(label => {
                label.classList.remove('correct', 'incorrect', 'selected');
            });

            if (!selectedInput) {
                unansweredCount++;
                card.classList.add('unanswered');
                return;
            }

            const selectedLabel = selectedInput.closest('.committee-option');
            if (selectedLabel) {
                selectedLabel.classList.add('selected');
            }

            if (selectedInput.value === correctCommittee) {
                card.classList.add('correct');
                if (selectedLabel) {
                    selectedLabel.classList.add('correct');
                }
                correctCount++;
            } else {
                card.classList.add('incorrect');
                if (selectedLabel) {
                    selectedLabel.classList.add('incorrect');
                }
                optionLabels.forEach(label => {
                    if (label.dataset.committee === correctCommittee) {
                        label.classList.add('correct');
                    }
                });
            }
        });

        const feedback = document.createElement('div');
        feedback.className = 'feedback-message';

        if (unansweredCount > 0) {
            feedback.classList.add('incorrect');
            feedback.textContent = `Du må svare på alle spørsmålene før du kan sjekke resultatet. (${unansweredCount} uten svar)`;
        } else if (correctCount === cards.length) {
            feedback.classList.add('correct');
            feedback.textContent = `Strålende! Du traff riktig på alle ${correctCount} representantene.`;
            submitBtn.disabled = true;
            submitBtn.textContent = 'Alle svar er riktige';
            cards.forEach(card => {
                card.querySelectorAll('input[type="radio"]').forEach(input => input.disabled = true);
            });
        } else {
            feedback.classList.add('incorrect');
            feedback.textContent = `Du har ${correctCount} av ${cards.length} riktig. Gjør endringer og prøv igjen!`;
            submitBtn.textContent = 'Sjekk på nytt';
        }

        submitBtn.parentElement.prepend(feedback);
    }
});
