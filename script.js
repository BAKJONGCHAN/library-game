document.addEventListener('DOMContentLoaded', () => {
    // --- Constants ---
    const MAP_WIDTH = 30;
    const MAP_HEIGHT = 15;
    const TILE_SIZE = 40;

    const KEY_GRAB = 'g';
    const KEY_OPEN = 'o';
    const KEY_DROP = 'p';
    const KEY_MOVE_UP = 'w';
    const KEY_MOVE_DOWN = 's';
    const KEY_MOVE_LEFT = 'a';
    const KEY_MOVE_RIGHT = 'd';
    const KEY_ARROW_UP = 'arrowup';
    const KEY_ARROW_DOWN = 'arrowdown';
    const KEY_ARROW_LEFT = 'arrowleft';
    const KEY_ARROW_RIGHT = 'arrowright';

    // Book Info (Added 3 more books)
    const BOOKS_INFO = {
        "백과사전": { question: "어떤 일의 한 단락이 끝나고 다음 단락이 시작될 동안", answer: "막간", score: 10, is_quiz: true },
        "사랑의 학교": { question: "남이 모르는 가운데", answer: "은연중", score: 10, is_quiz: true },
        "수용소 군도": { question: "대상을 두루 생각하는 일", answer: "사유", score: 10, is_quiz: true },
        "집 없는 천사": { question: null, answer: null, score: 5, is_quiz: false },
        "위대한 개츠비": { question: null, answer: null, score: 0, is_quiz: false },
        "데미안": { question: null, answer: null, score: 0, is_quiz: false },
        "해리포터와 마법사의 돌": { question: null, answer: null, score: 0, is_quiz: false },
        "어린 왕자": { question: null, answer: null, score: 0, is_quiz: false },
        "1984": { question: null, answer: null, score: 0, is_quiz: false },
        // --- Newly Added Books ---
        "사피엔스": { question: null, answer: null, score: 0, is_quiz: false },
        "총, 균, 쇠": { question: null, answer: null, score: 0, is_quiz: false },
        "코스모스": { question: null, answer: null, score: 0, is_quiz: false },
    };
    const QUIZ_BOOKS = ["백과사전", "사랑의 학교", "수용소 군도"];

    // --- DOM Elements (unchanged) ---
    const library = document.getElementById('library');
    const characterElement = document.getElementById('character');
    // ... (rest of DOM elements are unchanged) ...
    const scoreElement = document.getElementById('score');
    const timerElement = document.getElementById('timer');
    const heldItemElement = document.getElementById('held-item');
    const messageElement = document.getElementById('message');
    const quizModal = document.getElementById('quiz-modal');
    const quizTitle = document.getElementById('quiz-title');
    const quizQuestion = document.getElementById('quiz-question');
    const quizAnswerInput = document.getElementById('quiz-answer');
    const quizSubmitButton = document.getElementById('quiz-submit');
    const quizCloseButton = document.getElementById('quiz-close');

    // --- Game State (unchanged) ---
    let character = { x: 0, y: 0 };
    let books = [];
    let heldBook = null;
    let score = 0;
    let startTime = Date.now();
    let elapsedTime = 0;
    let timerInterval = null;
    let quizBooksSolvedCount = 0;
    let solvedQuizBooks = new Set();
    let gameOver = false;
    let currentQuizBook = null;

    // --- Initialization (unchanged) ---
    // The initGame function already iterates through all keys in BOOKS_INFO,
    // so it will automatically include the newly added books.
    function initGame() {
        library.style.width = `${MAP_WIDTH * TILE_SIZE}px`;
        library.style.height = `${MAP_HEIGHT * TILE_SIZE}px`;
        characterElement.style.width = `${TILE_SIZE}px`;
        characterElement.style.height = `${TILE_SIZE}px`;
        character.x = Math.floor(MAP_WIDTH / 2);
        character.y = Math.floor(MAP_HEIGHT / 2);
        updateCharacterPosition();

        const occupiedPositions = new Set([`${character.x},${character.y}`]);
        library.querySelectorAll('.book').forEach(el => el.remove());
        books = [];

        // Now includes the 3 new books automatically
        Object.keys(BOOKS_INFO).forEach(title => {
            let bookX, bookY, positionKey;
            do {
                bookX = Math.floor(Math.random() * MAP_WIDTH);
                bookY = Math.floor(Math.random() * MAP_HEIGHT);
                positionKey = `${bookX},${bookY}`;
            } while (occupiedPositions.has(positionKey));
            occupiedPositions.add(positionKey);

            const bookElement = document.createElement('div');
            bookElement.classList.add('book');
            bookElement.dataset.title = title;
            bookElement.style.width = `${TILE_SIZE}px`;
            bookElement.style.height = `${TILE_SIZE}px`;

            const bookData = {
                x: bookX, y: bookY, title: title, element: bookElement,
                info: BOOKS_INFO[title], solved: false
            };
            books.push(bookData);
            updateBookPosition(bookData);
            library.appendChild(bookElement);
        });

        score = 0;
        startTime = Date.now();
        elapsedTime = 0;
        heldBook = null;
        quizBooksSolvedCount = 0;
        solvedQuizBooks = new Set();
        gameOver = false;
        updateInfoDisplays();
        updateMessage("게임 시작! 책을 찾아보세요.");
        clearInterval(timerInterval);
        timerInterval = setInterval(updateTimer, 1000);
        document.removeEventListener('keydown', handleKeyPress);
        document.addEventListener('keydown', handleKeyPress);
        quizSubmitButton.onclick = submitQuizAnswer;
        quizCloseButton.onclick = closeQuizModal;
    }


    // --- Update Functions (unchanged) ---
    function updateCharacterPosition() {
        characterElement.style.left = `${character.x * TILE_SIZE}px`;
        characterElement.style.top = `${character.y * TILE_SIZE}px`;
        characterElement.classList.toggle('holding', !!heldBook);
    }
    function updateBookPosition(book) {
        book.element.style.left = `${book.x * TILE_SIZE}px`;
        book.element.style.top = `${book.y * TILE_SIZE}px`;
        book.element.style.display = 'flex';
    }
    function hideBookElement(book) {
        book.element.style.display = 'none';
    }
    function updateInfoDisplays() {
        scoreElement.textContent = `점수: ${score}`;
        timerElement.textContent = `시간: ${Math.floor(elapsedTime)}초`;
        heldItemElement.textContent = `들고 있는 책: ${heldBook ? heldBook.title : '없음'}`;
    }
    function updateMessage(msg) {
        messageElement.textContent = msg;
    }
    function updateTimer() {
        if (gameOver) return;
        elapsedTime = (Date.now() - startTime) / 1000;
        updateInfoDisplays();
    }

    // --- Event Handling (unchanged from previous version with arrow keys) ---
     function handleKeyPress(event) {
        if (gameOver || quizModal.style.display === 'block') return;
        const key = event.key.toLowerCase();
        let moved = false;
        let preventDefault = false;
        switch (key) {
            case KEY_MOVE_UP: case KEY_ARROW_UP:
                moved = moveCharacter(0, -1); preventDefault = (key === KEY_ARROW_UP); break;
            case KEY_MOVE_DOWN: case KEY_ARROW_DOWN:
                moved = moveCharacter(0, 1); preventDefault = (key === KEY_ARROW_DOWN); break;
            case KEY_MOVE_LEFT: case KEY_ARROW_LEFT:
                moved = moveCharacter(-1, 0); preventDefault = (key === KEY_ARROW_LEFT); break;
            case KEY_MOVE_RIGHT: case KEY_ARROW_RIGHT:
                moved = moveCharacter(1, 0); preventDefault = (key === KEY_ARROW_RIGHT); break;
            case KEY_GRAB: grabBook(); break;
            case KEY_DROP: dropBook(); break;
            case KEY_OPEN: openBook(); break;
            default: return;
        }
        if (preventDefault) event.preventDefault();
        updateInfoDisplays();
    }

    // --- Game Logic Functions ---

    // Function: submitQuizAnswer (MODIFIED)
    function submitQuizAnswer() {
        if (!currentQuizBook) return;

        const book = currentQuizBook;
        const userAnswer = quizAnswerInput.value.trim();

        if (userAnswer === "") {
            updateMessage("답을 입력해주세요.");
            return;
        }

        if (userAnswer === book.info.answer) {
            // Correct Answer Logic (unchanged)
            score += book.info.score;
            book.solved = true;
            solvedQuizBooks.add(book.title);
            quizBooksSolvedCount++;
            updateMessage(`정답! 점수 ${book.info.score}점 획득! 통과하였습니다.`);
            const tempHeld = heldBook;
            closeQuizModal();
             if(heldBook === tempHeld){
                dropBook();
             }
            checkGameEnd();
        } else {
            // Incorrect Answer Logic (MODIFIED - added updateBookPosition)
            updateMessage("오답입니다. 다음에 다시 도전하세요.");
            const tempHeld = heldBook; // Store the book before closing modal clears currentQuizBook
            closeQuizModal();

             // Check if we were holding the book related to the quiz
             if(tempHeld === book){
                // Relocate book and force drop
                const newPos = findEmptyRandomLocation();
                book.x = newPos.x;
                book.y = newPos.y;
                updateBookPosition(book); // *** ADDED: Immediately show book at new location ***
                // Force drop by clearing heldBook state
                heldBook = null;
                updateCharacterPosition(); // Update character style
                // Overwrite the "오답.." message with relocation info
                updateMessage(`오답! '${book.title}' 책이 다른 곳(${newPos.x}, ${newPos.y})으로 갔습니다.`);
             }
        }
        updateInfoDisplays(); // Update score display etc.
    }

    // Other game logic functions (moveCharacter, isOccupied, findAdjacentBook, grabBook, findEmptyAdjacentSpot, dropBook, openBook, closeQuizModal, findEmptyRandomLocation, checkGameEnd)
    // remain unchanged from the previous version. Ensure they are included here.

    function moveCharacter(dx, dy) {
        const newX = character.x + dx;
        const newY = character.y + dy;
        if (newX < 0 || newX >= MAP_WIDTH || newY < 0 || newY >= MAP_HEIGHT) {
            updateMessage("맵 가장자리입니다."); return false;
        }
        character.x = newX; character.y = newY;
        updateCharacterPosition(); updateMessage(""); return true;
    }
    function isOccupied(x, y) {
        if (character.x === x && character.y === y) return true;
        for (const book of books) { if (book !== heldBook && book.x === x && book.y === y) return true; }
        return false;
    }
    function findAdjacentBook() {
        for (const book of books) {
            if (book !== heldBook && book.element.style.display !== 'none') {
                const dx = Math.abs(character.x - book.x); const dy = Math.abs(character.y - book.y);
                if (dx + dy === 1) return book;
            }
        } return null;
    }
    function grabBook() {
        if (heldBook) { updateMessage("이미 책을 들고 있습니다."); return; }
        const targetBook = findAdjacentBook();
        if (targetBook) {
            heldBook = targetBook; hideBookElement(targetBook); updateCharacterPosition();
            updateMessage(`'${targetBook.title}' 책을 잡았습니다.`);
        } else { updateMessage("주변에 잡을 수 있는 책이 없습니다."); }
    }
    function findEmptyAdjacentSpot() {
        const checkOrder = [ { dx: -1, dy: 0 }, { dx: 1, dy: 0 }, { dx: 0, dy: -1 }, { dx: 0, dy: 1 }, { dx: -1, dy: -1 }, { dx: 1, dy: -1 }, { dx: -1, dy: 1 }, { dx: 1, dy: 1 } ];
        for (const delta of checkOrder) {
            const checkX = character.x + delta.dx; const checkY = character.y + delta.dy;
            if (checkX >= 0 && checkX < MAP_WIDTH && checkY >= 0 && checkY < MAP_HEIGHT) {
                if (!isOccupied(checkX, checkY)) return { x: checkX, y: checkY };
            }
        } return null;
    }
    function dropBook() {
        if (!heldBook) { updateMessage("내려놓을 책을 들고 있지 않습니다."); return; }
        const dropSpot = findEmptyAdjacentSpot();
        if (dropSpot) {
            const droppedBook = heldBook; heldBook = null;
            droppedBook.x = dropSpot.x; droppedBook.y = dropSpot.y;
            updateBookPosition(droppedBook); updateCharacterPosition();
            updateMessage(`'${droppedBook.title}' 책을 내려놓았습니다.`);
        } else { updateMessage("주변에 책을 내려놓을 공간이 없습니다."); }
    }
     function openBook() {
        if (!heldBook) { updateMessage("열어볼 책을 들고 있지 않습니다."); return; }
        const book = heldBook; const bookInfo = book.info;
        if (solvedQuizBooks.has(book.title)) { updateMessage(`'${book.title}' 책의 문제는 이미 해결했습니다.`); return; }
        if (bookInfo.is_quiz) {
            currentQuizBook = book; quizTitle.textContent = `'${book.title}' 퀴즈`; quizQuestion.textContent = bookInfo.question;
            quizAnswerInput.value = ""; quizModal.style.display = 'block'; quizAnswerInput.focus();
        } else if (!bookInfo.is_quiz && bookInfo.score > 0) {
            if (!book.solved) { score += bookInfo.score; book.solved = true; updateMessage(`'${book.title}' 책 발견! 점수 ${bookInfo.score}점 획득!`); }
            else { updateMessage(`'${book.title}' 책은 이미 확인했습니다.`); }
        } else { updateMessage("다른 책을 찾아보세요."); }
    }
    function closeQuizModal() { quizModal.style.display = 'none'; currentQuizBook = null; }
     function findEmptyRandomLocation() {
        let x, y, key;
        const occupied = new Set(); occupied.add(`${character.x},${character.y}`);
        books.forEach(b => { if(b !== heldBook) occupied.add(`${b.x},${b.y}`); });
        do { x = Math.floor(Math.random() * MAP_WIDTH); y = Math.floor(Math.random() * MAP_HEIGHT); key = `${x},${y}`; } while (occupied.has(key));
        return { x, y };
    }
    function checkGameEnd() {
        if (quizBooksSolvedCount >= QUIZ_BOOKS.length) {
            gameOver = true; clearInterval(timerInterval); updateMessage("");
            setTimeout(() => { alert(`*** 모든 문제를 해결했습니다! 참 잘했어요! ***\n\n최종 점수: ${score}\n총 걸린 시간: ${Math.floor(elapsedTime)}초`); }, 100);
            document.removeEventListener('keydown', handleKeyPress);
        }
    }

    // --- Start Game ---
    initGame();

}); // End DOMContentLoaded