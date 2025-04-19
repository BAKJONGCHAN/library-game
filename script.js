// 스크립트 시작 시 엄격 모드 사용 (오류 방지)
"use strict";

document.addEventListener('DOMContentLoaded', () => {
    // --- 상수 정의 ---
    const MAP_WIDTH = 30; // 맵 가로 크기 (칸 수)
    const MAP_HEIGHT = 15; // 맵 세로 크기 (칸 수)
    const TILE_SIZE = 40; // 각 칸의 픽셀 크기

    // 키보드 입력 키 이름 (소문자)
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

    // 책 정보 (퀴즈, 점수 등) - 총 12권
    const BOOKS_INFO = {
        "백과사전": { question: "어떤 일의 한 단락이 끝나고 다음 단락이 시작될 동안", answer: "막간", score: 10, is_quiz: true },
        "사랑의 학교": { question: "남이 모르는 가운데", answer: "은연중", score: 10, is_quiz: true }, // 정답 수정됨
        "수용소 군도": { question: "대상을 두루 생각하는 일", answer: "사유", score: 10, is_quiz: true },
        "집 없는 천사": { question: null, answer: null, score: 5, is_quiz: false }, // 열기만 해도 점수
        "위대한 개츠비": { question: null, answer: null, score: 0, is_quiz: false },
        "데미안": { question: null, answer: null, score: 0, is_quiz: false },
        "해리포터와 마법사의 돌": { question: null, answer: null, score: 0, is_quiz: false },
        "어린 왕자": { question: null, answer: null, score: 0, is_quiz: false },
        "1984": { question: null, answer: null, score: 0, is_quiz: false },
        "사피엔스": { question: null, answer: null, score: 0, is_quiz: false }, // 추가됨
        "총, 균, 쇠": { question: null, answer: null, score: 0, is_quiz: false }, // 추가됨
        "코스모스": { question: null, answer: null, score: 0, is_quiz: false }, // 추가됨
    };
    // 퀴즈를 풀어야 하는 책 목록 (게임 종료 조건)
    const QUIZ_BOOKS = ["백과사전", "사랑의 학교", "수용소 군도"];

    // --- HTML 요소 가져오기 ---
    const library = document.getElementById('library');
    const characterElement = document.getElementById('character');
    const scoreElement = document.getElementById('score');
    const timerElement = document.getElementById('timer');
    const heldItemElement = document.getElementById('held-item');
    const messageElement = document.getElementById('message');
    // 퀴즈 모달 관련 요소
    const quizModal = document.getElementById('quiz-modal');
    const quizTitle = document.getElementById('quiz-title');
    const quizQuestion = document.getElementById('quiz-question');
    const quizAnswerInput = document.getElementById('quiz-answer');
    const quizSubmitButton = document.getElementById('quiz-submit');
    const quizCloseButton = document.getElementById('quiz-close');
    // 화면 터치 버튼 요소
    const btnUp = document.getElementById('btn-up');
    const btnDown = document.getElementById('btn-down');
    const btnLeft = document.getElementById('btn-left');
    const btnRight = document.getElementById('btn-right');
    const btnGrab = document.getElementById('btn-grab');
    const btnOpen = document.getElementById('btn-open');
    const btnDrop = document.getElementById('btn-drop');
    // 모든 컨트롤 버튼 (활성화/비활성화용)
    const allControlButtons = document.querySelectorAll('.control-button');

    // --- 게임 상태 변수 ---
    let character = { x: 0, y: 0 }; // 캐릭터 위치 (격자 좌표)
    let books = []; // 맵에 있는 책들의 정보 배열
    let heldBook = null; // 현재 들고 있는 책 객체
    let score = 0; // 현재 점수
    let startTime = Date.now(); // 게임 시작 시간
    let elapsedTime = 0; // 게임 경과 시간 (초)
    let timerInterval = null; // 타이머 반복 실행 ID
    let quizBooksSolvedCount = 0; // 해결한 퀴즈 책 수
    let solvedQuizBooks = new Set(); // 해결한 퀴즈 책 제목 저장
    let gameOver = false; // 게임 종료 여부
    let currentQuizBook = null; // 현재 열려있는 퀴즈 책

    // --- 게임 초기화 함수 ---
    function initGame() {
        // 도서관 크기 설정
        library.style.width = `${MAP_WIDTH * TILE_SIZE}px`;
        library.style.height = `${MAP_HEIGHT * TILE_SIZE}px`;

        // 캐릭터 크기 설정
        characterElement.style.width = `${TILE_SIZE}px`;
        characterElement.style.height = `${TILE_SIZE}px`;

        // 캐릭터 초기 위치 설정 (맵 중앙)
        character.x = Math.floor(MAP_WIDTH / 2);
        character.y = Math.floor(MAP_HEIGHT / 2);
        updateCharacterPosition(); // 화면에 캐릭터 위치 반영

        // 책 생성 및 배치
        const occupiedPositions = new Set([`${character.x},${character.y}`]); // 캐릭터 위치는 점유됨
        library.querySelectorAll('.book').forEach(el => el.remove()); // 기존 책 요소 제거
        books = []; // 책 배열 초기화

        Object.keys(BOOKS_INFO).forEach(title => { // 모든 책 정보에 대해 반복
            let bookX, bookY, positionKey;
            // 빈 위치 찾을 때까지 무작위 좌표 생성
            do {
                bookX = Math.floor(Math.random() * MAP_WIDTH);
                bookY = Math.floor(Math.random() * MAP_HEIGHT);
                positionKey = `${bookX},${bookY}`;
            } while (occupiedPositions.has(positionKey)); // 이미 점유된 위치면 다시 뽑기
            occupiedPositions.add(positionKey); // 새 위치 점유 처리

            // 책 HTML 요소 생성
            const bookElement = document.createElement('div');
            bookElement.classList.add('book'); // CSS 클래스 적용
            bookElement.dataset.title = title; // 데이터 속성에 책 제목 저장 (CSS 선택용)
            bookElement.style.width = `${TILE_SIZE}px`; // 크기 설정
            bookElement.style.height = `${TILE_SIZE}px`;

            // 책 데이터 객체 생성
            const bookData = {
                x: bookX, y: bookY, // 위치
                title: title, // 제목
                element: bookElement, // HTML 요소 참조
                info: BOOKS_INFO[title], // 문제, 정답, 점수 등 정보
                solved: false // 해결 여부
            };
            books.push(bookData); // 책 배열에 추가
            updateBookPosition(bookData); // 화면에 책 위치 반영
            library.appendChild(bookElement); // 도서관 영역에 책 요소 추가
        });

        // 게임 상태 초기화
        score = 0;
        startTime = Date.now();
        elapsedTime = 0;
        heldBook = null;
        quizBooksSolvedCount = 0;
        solvedQuizBooks.clear(); // Set 초기화
        gameOver = false;

        updateInfoDisplays(); // 정보 패널 업데이트
        updateMessage("게임 시작! 책을 찾아보세요."); // 초기 메시지 설정

        // 타이머 시작
        clearInterval(timerInterval); // 이전 타이머 제거
        timerInterval = setInterval(updateTimer, 1000); // 1초마다 updateTimer 함수 실행

        // 이벤트 리스너 설정
        setupEventListeners();

        // 컨트롤러 활성화
        enableControls();
    }

    // --- 화면 업데이트 함수 ---
    // 캐릭터 위치 및 모양 업데이트
    function updateCharacterPosition() {
        characterElement.style.left = `${character.x * TILE_SIZE}px`;
        characterElement.style.top = `${character.y * TILE_SIZE}px`;
        // heldBook 유무에 따라 'holding' 클래스 추가/제거 (CSS에서 스타일 변경)
        characterElement.classList.toggle('holding', !!heldBook);
    }

    // 책 위치 업데이트
    function updateBookPosition(book) {
        book.element.style.left = `${book.x * TILE_SIZE}px`;
        book.element.style.top = `${book.y * TILE_SIZE}px`;
        book.element.style.display = 'flex'; // 보이도록 설정 (숨겨졌을 수 있으므로)
    }

    // 책 숨기기
    function hideBookElement(book) {
        book.element.style.display = 'none';
    }

    // 정보 패널 (점수, 시간, 들고 있는 책) 업데이트
    function updateInfoDisplays() {
        scoreElement.textContent = `점수: ${score}`;
        timerElement.textContent = `시간: ${Math.floor(elapsedTime)}초`;
        heldItemElement.textContent = `들고 있는 책: ${heldBook ? heldBook.title : '없음'}`;
    }

    // 하단 메시지 업데이트
    function updateMessage(msg) {
        messageElement.textContent = msg;
    }

    // 타이머 업데이트
    function updateTimer() {
        if (gameOver) return; // 게임 종료 시 중지
        elapsedTime = (Date.now() - startTime) / 1000; // 경과 시간 계산 (초)
        updateInfoDisplays(); // 시간 표시 업데이트
    }

    // --- 컨트롤 활성화/비활성화 ---
    function enableControls() {
        allControlButtons.forEach(btn => btn.disabled = false); // 모든 버튼 활성화
        // 키보드 이벤트 리스너 다시 추가 (혹시 제거되었을 경우 대비)
        document.removeEventListener('keydown', handleKeyPress); // 중복 방지
        document.addEventListener('keydown', handleKeyPress);
    }

    function disableControls() {
        allControlButtons.forEach(btn => btn.disabled = true); // 모든 버튼 비활성화
        // 키보드 이벤트 리스너 제거 (모달 중 또는 게임 종료 시)
        document.removeEventListener('keydown', handleKeyPress);
    }

    // --- 이벤트 리스너 설정 함수 ---
    function setupEventListeners() {
        // 키보드 이벤트 리스너 (기존 리스너 제거 후 새로 추가)
        document.removeEventListener('keydown', handleKeyPress);
        document.addEventListener('keydown', handleKeyPress);

        // 퀴즈 모달 버튼 이벤트 리스너
        quizSubmitButton.onclick = submitQuizAnswer;
        quizCloseButton.onclick = closeQuizModal;

        // 화면 터치 버튼 이벤트 리스너 ('click' 사용 - 터치/마우스 모두 작동)
        btnUp.onclick = () => handleOnScreenButton('up');
        btnDown.onclick = () => handleOnScreenButton('down');
        btnLeft.onclick = () => handleOnScreenButton('left');
        btnRight.onclick = () => handleOnScreenButton('right');
        btnGrab.onclick = () => handleOnScreenButton('g');
        btnOpen.onclick = () => handleOnScreenButton('o');
        btnDrop.onclick = () => handleOnScreenButton('p');
    }

    // --- 이벤트 처리 함수 ---
    // 키보드 입력 처리
    function handleKeyPress(event) {
        // 게임 종료 또는 모달 창 열려 있으면 입력 무시
        if (gameOver || quizModal.style.display === 'block') return;

        const key = event.key.toLowerCase(); // 키 이름 소문자로 변환
        let moved = false;
        let preventDefault = false; // 기본 동작(스크롤 등) 방지 여부

        // 키에 따른 동작 실행
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
            default: return; // 다른 키는 무시
        }

        // 방향키 입력 시 페이지 스크롤 방지
        if (preventDefault) {
           event.preventDefault();
        }

        updateInfoDisplays(); // 행동 후 정보 패널 업데이트
    }

    // 화면 터치 버튼 입력 처리
    function handleOnScreenButton(action) {
        // 게임 종료 또는 모달 창 열려 있으면 입력 무시 (버튼 비활성화로 처리되지만 안전장치)
        if (gameOver || quizModal.style.display === 'block') return;

        // 버튼 종류에 따른 동작 실행
        switch (action) {
            case 'up': moveCharacter(0, -1); break;
            case 'down': moveCharacter(0, 1); break;
            case 'left': moveCharacter(-1, 0); break;
            case 'right': moveCharacter(1, 0); break;
            case 'g': grabBook(); break;
            case 'o': openBook(); break;
            case 'p': dropBook(); break;
        }
        updateInfoDisplays(); // 행동 후 정보 패널 업데이트
    }

    // --- 게임 핵심 로직 함수 ---
    // 캐릭터 이동
    function moveCharacter(dx, dy) {
        const newX = character.x + dx;
        const newY = character.y + dy;

        // 맵 경계 체크
        if (newX < 0 || newX >= MAP_WIDTH || newY < 0 || newY >= MAP_HEIGHT) {
            updateMessage("맵 가장자리입니다.");
            return false; // 이동 실패
        }

        // 이동하려는 위치가 막혀있는지 체크 (선택적 - 현재는 비활성화)
        // if (isOccupied(newX, newY)) {
        //     updateMessage("그곳으로 이동할 수 없습니다.");
        //     return false;
        // }

        // 이동 실행
        character.x = newX;
        character.y = newY;
        updateCharacterPosition(); // 화면 위치 업데이트
        updateMessage(""); // 이동 성공 시 메시지 초기화
        return true; // 이동 성공
    }

    // 특정 좌표가 점유되었는지 확인 (캐릭터 또는 다른 책)
    function isOccupied(x, y) {
        // 캐릭터 위치 확인
        if (character.x === x && character.y === y) return true;
        // 다른 책 위치 확인 (들고 있는 책 제외)
        for (const book of books) {
            if (book !== heldBook && book.x === x && book.y === y) {
                return true;
            }
        }
        return false; // 비어 있음
    }

    // 캐릭터 주변(상하좌우)에 있는 책 찾기
     function findAdjacentBook() {
        for (const book of books) {
            // 현재 들고 있지 않고, 화면에 보이는 책만 대상
            if (book !== heldBook && book.element.style.display !== 'none') {
                 const dx = Math.abs(character.x - book.x); // x좌표 차이
                 const dy = Math.abs(character.y - book.y); // y좌표 차이
                 // 상하좌우 인접 확인 (맨해튼 거리 = 1)
                 if (dx + dy === 1) {
                     return book; // 인접한 책 반환
                 }
             }
         }
         return null; // 인접한 책 없음
     }

    // 책 잡기
    function grabBook() {
        if (heldBook) { // 이미 책을 들고 있으면
            updateMessage("이미 책을 들고 있습니다. 먼저 내려놓으세요.");
            return;
        }
        const targetBook = findAdjacentBook(); // 주변 책 탐색
        if (targetBook) { // 잡을 책을 찾았으면
            heldBook = targetBook; // 상태 변경: 책 들기
            hideBookElement(targetBook); // 화면에서 책 숨기기
            updateCharacterPosition(); // 캐릭터 모양 변경
            updateMessage(`'${targetBook.title}' 책을 잡았습니다.`);
        } else { // 주변에 책이 없으면
            updateMessage("주변에 잡을 수 있는 책이 없습니다.");
        }
    }

    // 캐릭터 주변의 빈 공간(내려놓을 위치) 찾기
     function findEmptyAdjacentSpot() {
         // 주변 8방향 + 현재 위치 탐색 순서 (가까운 곳 우선)
         const checkOrder = [
             { dx: -1, dy: 0 }, { dx: 1, dy: 0 }, { dx: 0, dy: -1 }, { dx: 0, dy: 1 }, // 상하좌우
             { dx: -1, dy: -1 }, { dx: 1, dy: -1 }, { dx: -1, dy: 1 }, { dx: 1, dy: 1 }  // 대각선
         ];
         for (const delta of checkOrder) {
             const checkX = character.x + delta.dx;
             const checkY = character.y + delta.dy;
             // 맵 경계 안이고, 점유되지 않았으면
             if (checkX >= 0 && checkX < MAP_WIDTH && checkY >= 0 && checkY < MAP_HEIGHT) {
                 if (!isOccupied(checkX, checkY)) {
                     return { x: checkX, y: checkY }; // 빈 위치 반환
                 }
             }
         }
         return null; // 빈 공간 없음
     }

    // 책 내려놓기
    function dropBook() {
        if (!heldBook) { // 들고 있는 책이 없으면
            updateMessage("내려놓을 책을 들고 있지 않습니다.");
            return;
        }
        const dropSpot = findEmptyAdjacentSpot(); // 내려놓을 위치 탐색
        if (dropSpot) { // 위치를 찾았으면
            const droppedBook = heldBook; // 내려놓을 책 임시 저장
            heldBook = null; // 상태 변경: 책 없음
            droppedBook.x = dropSpot.x; // 책 위치 업데이트
            droppedBook.y = dropSpot.y;
            updateBookPosition(droppedBook); // 화면에 책 표시 및 이동
            updateCharacterPosition(); // 캐릭터 모양 원래대로
            updateMessage(`'${droppedBook.title}' 책을 내려놓았습니다.`);
        } else { // 주변에 공간이 없으면
            updateMessage("주변에 책을 내려놓을 공간이 없습니다.");
        }
    }

    // 책 열기
    function openBook() {
        if (!heldBook) { // 들고 있는 책 없으면
            updateMessage("열어볼 책을 들고 있지 않습니다.");
            return;
        }

        const book = heldBook;
        const bookInfo = book.info;

        // 이미 해결한 퀴즈 책인지 확인
        if (solvedQuizBooks.has(book.title)) {
             updateMessage(`'${book.title}' 책의 문제는 이미 해결했습니다.`);
             return;
         }

        // 퀴즈가 있는 책이면
        if (bookInfo.is_quiz) {
            currentQuizBook = book; // 현재 퀴즈 책 설정
            quizTitle.textContent = `'${book.title}' 퀴즈`; // 모달 제목 설정
            quizQuestion.textContent = bookInfo.question; // 모달 질문 설정
            quizAnswerInput.value = ""; // 이전 답 지우기
            quizModal.style.display = 'block'; // 모달 창 보이기
            disableControls(); // 모달 열리면 컨트롤 비활성화
            quizAnswerInput.focus(); // 답 입력창에 포커스
        }
        // 퀴즈 없고 점수만 있는 책 ('집 없는 천사')
        else if (!bookInfo.is_quiz && bookInfo.score > 0) {
            // 아직 점수를 얻지 않았으면
            if (!book.solved) {
                score += bookInfo.score; // 점수 추가
                book.solved = true; // 처리 완료 표시
                updateMessage(`'${book.title}' 책 발견! 점수 ${bookInfo.score}점 획득!`);
                updateInfoDisplays(); // 점수판 업데이트
            } else { // 이미 점수 얻었으면
                 updateMessage(`'${book.title}' 책은 이미 확인했습니다.`);
            }
        }
        // 그 외 일반 책
        else {
            updateMessage("다른 책을 찾아보세요.");
        }
    }

    // 퀴즈 모달 닫기
    function closeQuizModal() {
        quizModal.style.display = 'none'; // 모달 숨기기
        currentQuizBook = null; // 현재 퀴즈 책 해제
        enableControls(); // 컨트롤 다시 활성화
    }

    // 퀴즈 정답 제출 처리
    function submitQuizAnswer() {
        if (!currentQuizBook) return; // 열린 퀴즈 없으면 무시

        const book = currentQuizBook;
        const userAnswer = quizAnswerInput.value.trim(); // 입력값 앞뒤 공백 제거

        if (userAnswer === "") { // 입력값이 없으면
            updateMessage("답을 입력해주세요.");
            return;
        }

        // 정답 확인
        if (userAnswer === book.info.answer) {
            // --- 정답 처리 ---
            score += book.info.score; // 점수 추가
            book.solved = true; // 해결됨 표시
            solvedQuizBooks.add(book.title); // 해결 목록에 추가
            quizBooksSolvedCount++; // 해결 카운트 증가
            updateMessage(`정답! 점수 ${book.info.score}점 획득! 통과하였습니다.`);

            const tempHeld = heldBook; // 현재 들고 있는 책 임시 저장
            closeQuizModal(); // 모달 닫기 (컨트롤 활성화됨)

            // 모달 닫기 전후로 들고 있는 책이 같으면 자동으로 내려놓기 시도
             if(heldBook === tempHeld){
                dropBook(); // dropBook 함수 내에서 메시지 처리
             }

            checkGameEnd(); // 게임 종료 조건 확인
        } else {
            // --- 오답 처리 ---
            updateMessage("오답입니다. 다음에 다시 도전하세요."); // 임시 메시지

            const tempHeld = heldBook; // 현재 들고 있는 책 임시 저장
            closeQuizModal(); // 모달 닫기 (컨트롤 활성화됨)

            // 모달 닫기 전후로 들고 있는 책이 오답 처리 대상 책과 같으면
             if(tempHeld === book){
                const newPos = findEmptyRandomLocation(); // 무작위 빈 위치 찾기
                book.x = newPos.x; // 책 위치 상태 업데이트
                book.y = newPos.y;
                updateBookPosition(book); // *** 화면에 책 즉시 표시 및 이동 ***
                heldBook = null; // 상태 변경: 책 강제 놓기
                updateCharacterPosition(); // 캐릭터 모양 업데이트
                // 최종 메시지 업데이트
                updateMessage(`오답! '${book.title}' 책이 다른 곳(${newPos.x}, ${newPos.y})으로 갔습니다.`);
             }
        }
        updateInfoDisplays(); // 정보 패널 업데이트 (점수 등)
    }

    // 맵 안의 무작위 빈 공간 좌표 찾기
     function findEmptyRandomLocation() {
        let x, y, key;
        const occupied = new Set(); // 점유된 위치 저장 Set
        occupied.add(`${character.x},${character.y}`); // 캐릭터 위치 추가
        // 현재 맵에 있는 책들 위치 추가 (들고 있는 책 제외)
        books.forEach(b => {
            if(b !== heldBook) { // 들고 있는 책은 새 위치에 놓을 수 있으므로 제외
                occupied.add(`${b.x},${b.y}`);
            }
        });

        // 빈 칸 찾을 때까지 반복
        do {
            x = Math.floor(Math.random() * MAP_WIDTH);
            y = Math.floor(Math.random() * MAP_HEIGHT);
            key = `${x},${y}`;
        } while (occupied.has(key)); // 점유된 위치면 다시 찾기
        return { x, y }; // 찾은 빈 좌표 반환
    }

    // 게임 종료 조건 확인 및 처리
    function checkGameEnd() {
        // 해결한 퀴즈 책 수가 목표 수 이상이면
        if (quizBooksSolvedCount >= QUIZ_BOOKS.length) {
            gameOver = true; // 게임 종료 상태로 변경
            clearInterval(timerInterval); // 타이머 정지
            updateMessage(""); // 메시지 초기화
            disableControls(); // 모든 컨트롤 비활성화

            // 약간의 딜레이 후 종료 메시지 표시 (메시지 업데이트 반영 시간 확보)
            setTimeout(() => {
                 alert(`*** 모든 문제를 해결했습니다! 참 잘했어요! ***\n\n최종 점수: ${score}\n총 걸린 시간: ${Math.floor(elapsedTime)}초`);
            }, 100);
        }
    }

    // --- 게임 시작 ---
    initGame(); // 게임 초기화 함수 실행

}); // End DOMContentLoaded