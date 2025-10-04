--- START OF FILE js/quiz.js ---
document.addEventListener('DOMContentLoaded', () => {
    // Globale variabler
    let allRepresentatives = [];
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
            allRepresentatives = data.filter(rep => rep.isActive); // Jobber kun med aktive representanter
            console.log(`Quiz: Loaded ${allRepresentatives.length} active representatives.`);
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

        // Gå til neste spørsmål etter en kort pause
        setTimeout(() => {
            nextQuestionFunction();
        }, 1500);
    }

    // --- Quiz 1: Gjett Navnet ---
    function startGuessNameQuiz() {
        const repsWithImages = allRepresentatives.filter(rep => rep.imageUrl);
        if (repsWithImages.length < 8) {
            quizContent.innerHTML = "<p>For få representanter med bilder til å starte quizen.</p>";
            return;
        }

        const correctRep = repsWithImages[Math.floor(Math.random() * repsWithImages.length)];
        let options = [correctRep];
        
        // Finn 7 unike, tilfeldige representanter som ikke er den korrekte
        const otherReps = shuffleArray([...allRepresentatives].filter(rep => rep.name !== correctRep.name));
        options.push(...otherReps.slice(0, 7));
        options = shuffleArray(options);

        // Bygg HTML for spørsmålet
        quizContent.innerHTML = `
            <div class="question-image-container">
                <img src="${correctRep.imageUrl}" alt="Bilde av en politiker" class="question-image">
            </div>
            <div class="answer-options-names">
                ${options.map(opt => `<button class="button secondary" data-name="${opt.name}">${opt.name}</button>`).join('')}
            </div>
        `;

        // Legg til lyttere på svaralternativene
        quizContent.querySelectorAll('.answer-options-names button').forEach(button => {
            button.addEventListener('click', (e) => {
                const selectedName = e.target.dataset.name;
                const isCorrect = selectedName === correctRep.name;
                quizContent.querySelectorAll('button').forEach(btn => btn.disabled = true); // Deaktiver knapper etter svar
                showFeedback(isCorrect, startGuessNameQuiz);
            });
        });
    }

    // --- Quiz 2: Gjett Ansiktet ---
    function startGuessFaceQuiz() {
        const repsWithImages = allRepresentatives.filter(rep => rep.imageUrl);
        if (repsWithImages.length < 8) {
            quizContent.innerHTML = "<p>For få representanter med bilder til å starte quizen.</p>";
            return;
        }

        let options = shuffleArray([...repsWithImages]).slice(0, 8);
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
                // Deaktiver videre klikk
                quizContent.querySelector('.answer-options-images').style.pointerEvents = 'none';
                showFeedback(isCorrect, startGuessFaceQuiz);
            });
        });
    }

    // --- Quiz 3: Koble til Komité ---
    function startMatchCommitteeQuiz() {
        const repsWithCommittee = allRepresentatives.filter(rep => rep.committee);
        if (repsWithCommittee.length < 10) {
            quizContent.innerHTML = "<p>For få representanter med komité-tilhørighet til å starte quizen.</p>";
            return;
        }

        const selectedReps = shuffleArray([...repsWithCommittee]).slice(0, 10);
        const names = shuffleArray(selectedReps.map(rep => ({ name: rep.name, committee: rep.committee })));
        const committees = shuffleArray(selectedReps.map(rep => rep.committee));

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

        committeeTargets.forEach(target => {
            target.addEventListener('dragover', e => {
                e.preventDefault();
                target.classList.add('drag-over');
            });
            target.addEventListener('dragenter', e => e.preventDefault());
            target.addEventListener('dragleave', () => target.classList.remove('drag-over'));
            target.addEventListener('drop', () => {
                target.classList.remove('drag-over');
                // Tillat kun ett navn per boks. Flytt tilbake hvis boksen er opptatt.
                if (target.querySelector('.name-item')) {
                    document.getElementById('names-source').appendChild(target.querySelector('.name-item'));
                }
                target.appendChild(draggedItem);
            });
        });

        submitBtn.addEventListener('click', checkCommitteeMatches);
    }
    
    function checkCommitteeMatches() {
        const submitBtn = document.getElementById('submit-committee-match');
        const targets = document.querySelectorAll('.committee-target');
        let correctCount = 0;
        let totalAnswered = 0;

        targets.forEach(target => {
            const placedItem = target.querySelector('.name-item');
            target.classList.remove('correct', 'incorrect'); // Nullstill farger
            
            if (placedItem) {
                totalAnswered++;
                const isCorrect = placedItem.dataset.correctCommittee === target.dataset.committeeName;
                if (isCorrect) {
                    target.classList.add('correct');
                    placedItem.draggable = false; // Lås korrekte svar
                    correctCount++;
                } else {
                    target.classList.add('incorrect');
                    placedItem.draggable = true; // Gjør feil svar flyttbare igjen
                }
            }
        });

        // Fjern gammel feedback
        const oldFeedback = document.querySelector('.feedback-message');
        if(oldFeedback) oldFeedback.remove();

        const feedback = document.createElement('div');
        feedback.className = 'feedback-message';
        feedback.textContent = `Du svarte riktig på ${correctCount} av ${totalAnswered}.`;
        
        if (correctCount === 10) {
            feedback.classList.add('correct');
            feedback.textContent += " Gratulerer, alt er riktig!";
            submitBtn.style.display = 'none'; // Skjul knappen
        } else {
            feedback.classList.add('incorrect');
            feedback.textContent += " Prøv å rette feilene!";
            submitBtn.textContent = "Sjekk på nytt";
        }
        submitBtn.parentElement.prepend(feedback);
    }
});
