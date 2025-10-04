document.addEventListener('DOMContentLoaded', () => {
    // Globale variabler
    let allRepresentatives = [];
    let partiesMap = {};
    let repsWithImagesAndGender = [];
    let menWithImages = [];
    let womenWithImages = [];
    let score = 0;
    let currentQuizType = null;

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
    function startMatchCommitteeQuiz() {
        const repsWithCommittee = allRepresentatives.filter(rep => rep.committee && rep.committee.trim() !== "");
        if (repsWithCommittee.length < 10) {
            quizContent.innerHTML = "<p>For få representanter med komité-tilhørighet til å starte quizen.</p>";
            return;
        }

        const selectedReps = shuffleArray([...repsWithCommittee]).slice(0, 10);
        const names = shuffleArray(selectedReps.map(rep => ({ name: rep.name, committee: rep.committee })));
        
        const uniqueCommittees = [...new Set(selectedReps.map(rep => rep.committee))];
        const committees = shuffleArray(uniqueCommittees);

        quizContent.innerHTML = `
            <div class="match-committee-container">
                <p class="match-instructions">Dra navnet på politikeren til riktig komité.</p>
                <div class="match-lists-wrapper">
                    <div class="draggable-names-list">
                        <div class="list-title">Politikere</div>
                        <div id="names-source">
                            ${names.map(p => `<div class="name-item" draggable="true" data-name="${p.name}" data-correct-committee="${p.committee}">${p.name}</div>`).join('')}
                        </div>
                    </div>
                    <div class="droppable-committees-list">
                        <div class="list-title">Komiteer</div>
                        <div id="committees-target">
                            ${committees.map(c => `<div class="committee-target" data-committee-name="${c}"><span class="committee-name">${c}</span></div>`).join('')}
                        </div>
                    </div>
                </div>
                <div class="quiz-controls">
                    <button id="submit-committee-match" class="button primary">Send inn svar</button>
                </div>
            </div>
        `;
        setupDragAndDrop();
    }

    function setupDragAndDrop() {
        const nameItems = document.querySelectorAll('.name-item');
        const committeeTargets = document.querySelectorAll('.committee-target');
        const submitBtn = document.getElementById('submit-committee-match');
        const namesSource = document.getElementById('names-source');
        let draggedItem = null;

        nameItems.forEach(item => {
            item.addEventListener('dragstart', () => {
                draggedItem = item;
                setTimeout(() => item.classList.add('dragging'), 0);
            });
            item.addEventListener('dragend', () => {
                draggedItem.classList.remove('dragging');
                draggedItem = null;
            });
        });

        const allDropZones = [...committeeTargets, namesSource];

        allDropZones.forEach(zone => {
            zone.addEventListener('dragover', e => {
                e.preventDefault();
                zone.classList.add('drag-over');
            });
            zone.addEventListener('dragenter', e => e.preventDefault());
            zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
            zone.addEventListener('drop', (e) => {
                e.preventDefault();
                zone.classList.remove('drag-over');
                
                if (zone.classList.contains('committee-target') && zone.querySelector('.name-item')) {
                    const existingItem = zone.querySelector('.name-item');
                    draggedItem.parentElement.appendChild(existingItem);
                    zone.appendChild(draggedItem);
                } else {
                    zone.appendChild(draggedItem);
                }
            });
        });

        submitBtn.addEventListener('click', checkCommitteeMatches);
    }
    
    function checkCommitteeMatches() {
        const submitBtn = document.getElementById('submit-committee-match');
        const targets = document.querySelectorAll('.committee-target');
        let correctCount = 0;
        let totalPlaced = 0;
        let allCorrect = true;

        targets.forEach(target => {
            const placedItem = target.querySelector('.name-item');
            target.classList.remove('correct', 'incorrect');
            
            if (placedItem) {
                totalPlaced++;
                const isCorrect = placedItem.dataset.correctCommittee === target.dataset.committeeName;
                if (isCorrect) {
                    target.classList.add('correct');
                    placedItem.draggable = false;
                    correctCount++;
                } else {
                    target.classList.add('incorrect');
                    placedItem.draggable = true;
                    allCorrect = false;
                }
            } else {
                allCorrect = false;
            }
        });

        const unplacedItems = document.querySelectorAll('#names-source .name-item');
        if (unplacedItems.length > 0) {
            allCorrect = false;
        }

        const oldFeedback = document.querySelector('.feedback-message');
        if(oldFeedback) oldFeedback.remove();

        const feedback = document.createElement('div');
        feedback.className = 'feedback-message';
        
        if (allCorrect && totalPlaced === 10) {
            feedback.classList.add('correct');
            feedback.textContent = `Gratulerer, alt er riktig! (${correctCount}/10)`;
            submitBtn.style.display = 'none';
        } else {
            feedback.classList.add('incorrect');
            feedback.textContent = `Du har ${correctCount} av ${totalPlaced} plasserte riktig. Prøv å rette feilene!`;
            submitBtn.textContent = "Sjekk på nytt";
        }
        submitBtn.parentElement.prepend(feedback);
    }
});
