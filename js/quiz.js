document.addEventListener('DOMContentLoaded', () => {
    // Globale variabler
    let allRepresentatives = [];
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
    fetch('data/representatives.json')
        .then(response => response.json())
        .then(data => {
            allRepresentatives = data.filter(rep => rep.isActive);
            // NYTT: Forbered lister for å enkelt kunne velge basert på kjønn
            repsWithImagesAndGender = allRepresentatives.filter(rep => rep.imageUrl && rep.gender);
            menWithImages = repsWithImagesAndGender.filter(rep => rep.gender === 'M');
            womenWithImages = repsWithImagesAndGender.filter(rep => rep.gender === 'K');
            
            console.log(`Quiz: Loaded ${allRepresentatives.length} active reps.`);
            console.log(`Found ${menWithImages.length} men and ${womenWithImages.length} women with images and gender info.`);
            
            setupSelectionListeners();
        })
        .catch(error => {
            console.error("Error loading representatives data:", error);
            selectionArea.innerHTML = "<h2>Kunne ikke laste quiz-data.</h2><p>Vennligst prøv å laste siden på nytt.</p>";
        });
    
    // Sett opp lyttere for quiz-valg
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

    // Start en quiz
    function startQuiz(quizType) {
        selectionArea.style.display = 'none';
        quizContainer.style.display = 'block';
        score = 0;
        updateScore();

        if (quizType === 'guess-name') {
            quizTitle.textContent = "Gjett navnet";
            scoreDisplay.style.display = 'block';
            startGuessNameQuiz();
        } else if (quizType === 'guess-face') {
            quizTitle.textContent = "Gjett ansiktet";
            scoreDisplay.style.display = 'block';
            startGuessFaceQuiz();
        } else if (quizType === 'match-committee') {
            quizTitle.textContent = "Koble politiker til komité";
            scoreDisplay.style.display = 'none';
            startMatchCommitteeQuiz();
        }
    }
    
    // --- Hjelpefunksjoner ---
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

    function showFeedback(isCorrect, nextQuestionFunction) {
        const feedbackDiv = document.createElement('div');
        feedbackDiv.className = 'feedback-message';
        if (isCorrect) {
            feedbackDiv.classList.add('correct');
            feedbackDiv.textContent = 'Riktig!';
            score++;
            updateScore();
        } else {
            feedbackDiv.classList.add('incorrect');
            feedbackDiv.textContent = 'Feil svar.';
        }
        quizContent.appendChild(feedbackDiv);

        setTimeout(() => {
            nextQuestionFunction();
        }, 1500);
    }

    // --- Quiz 1: Gjett Navnet (OPPDATERT) ---
    function startGuessNameQuiz() {
        // Sjekk om vi har nok representanter av minst ett kjønn
        if (menWithImages.length < 8 && womenWithImages.length < 8) {
            quizContent.innerHTML = "<p>For få representanter (minst 8 av ett kjønn) med bilder til å starte quizen.</p>";
            return;
        }

        // Velg en tilfeldig representant fra en gyldig kjønnsgruppe
        let correctRep;
        let potentialCorrectReps = [];
        if (menWithImages.length >= 8) potentialCorrectReps.push(...menWithImages);
        if (womenWithImages.length >= 8) potentialCorrectReps.push(...womenWithImages);
        
        correctRep = potentialCorrectReps[Math.floor(Math.random() * potentialCorrectReps.length)];
        const correctGender = correctRep.gender;

        let options = [correctRep];
        
        // Velg 7 andre alternativer FRA SAMME KJØNNSGRUPPE
        let sourceForOptions = (correctGender === 'M') ? menWithImages : womenWithImages;
        const otherReps = shuffleArray([...sourceForOptions].filter(rep => rep.name !== correctRep.name));
        options.push(...otherReps.slice(0, 7));
        options = shuffleArray(options);

        // Bygg HTML (som før)
        quizContent.innerHTML = `
            <div class="question-image-container">
                <img src="${correctRep.imageUrl}" alt="Bilde av en politiker" class="question-image">
            </div>
            <div class="answer-options-names">
                ${options.map(opt => `<button class="button secondary" data-name="${opt.name}">${opt.name}</button>`).join('')}
            </div>
        `;

        // Legg til lyttere (som før)
        quizContent.querySelectorAll('.answer-options-names button').forEach(button => {
            button.addEventListener('click', (e) => {
                const selectedName = e.target.dataset.name;
                const isCorrect = selectedName === correctRep.name;
                quizContent.querySelectorAll('button').forEach(btn => btn.disabled = true);
                showFeedback(isCorrect, startGuessNameQuiz);
            });
        });
    }

    // --- Quiz 2: Gjett Ansiktet (OPPDATERT) ---
    function startGuessFaceQuiz() {
        if (menWithImages.length < 8 && womenWithImages.length < 8) {
            quizContent.innerHTML = "<p>For få representanter (minst 8 av ett kjønn) med bilder til å starte quizen.</p>";
            return;
        }

        // Velg en tilfeldig kjønnsgruppe som har nok representanter
        let sourceForOptions;
        const canUseMen = menWithImages.length >= 8;
        const canUseWomen = womenWithImages.length >= 8;

        if (canUseMen && canUseWomen) {
            sourceForOptions = Math.random() < 0.5 ? menWithImages : womenWithImages;
        } else {
            sourceForOptions = canUseMen ? menWithImages : womenWithImages;
        }

        // Velg 8 tilfeldige alternativer fra den valgte gruppen
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
                const selectedName = e.currentTarget.dataset.name;
                const isCorrect = selectedName === correctRep.name;
                quizContent.querySelector('.answer-options-images').style.pointerEvents = 'none';
                showFeedback(isCorrect, startGuessFaceQuiz);
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
        
        // Sikrer 10 unike komiteer for å unngå forvirring
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
                
                // Tillat kun ett navn per komité-boks
                if (zone.classList.contains('committee-target') && zone.querySelector('.name-item')) {
                    // Hvis boksen er opptatt, bytt plass
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
                allCorrect = false; // Hvis en boks er tom er ikke alt riktig
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
