/* 状態管理 */
let questions = [];
let currentQuestionIndex = 0;
let correctCount = 0;
let memberStats = {};
let selectedAnswers = [];

/* 問題読み込み */
async function loadQuestions() {
  try {
    const response = await fetch("questions.json");
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    questions = await response.json();
    console.log(`✓ questions.jsonから ${questions.length} 件の問題データを読み込みました`);
  } catch (error) {
    console.error("❌ questions.jsonの読み込みに失敗しました:", error);
    alert("問題データの読み込みに失敗しました。questions.jsonが正しく配置されているか確認してください。");
    throw error;
  }
}

/* 問題データの補助関数 */
function getQuestionMembers(question) {
  const members = question.member;
  if (Array.isArray(members)) {
    return members.filter(Boolean);
  }
  return members ? [members] : [];
}

function getCorrectAnswerIndexes(question) {
  if (Array.isArray(question.answer)) {
    return question.answer;
  }
  return question.answer !== undefined ? [question.answer] : [];
}

/* スコア集計 */
function resetMemberStats() {
  memberStats = {};

  questions.forEach((question) => {
    const members = getQuestionMembers(question);
    if (members.length === 0) {
      const fallback = "未登録";
      if (!memberStats[fallback]) {
        memberStats[fallback] = { correct: 0, total: 0 };
      }
      memberStats[fallback].total += 1;
      return;
    }

    members.forEach((member) => {
      if (!memberStats[member]) {
        memberStats[member] = { correct: 0, total: 0 };
      }
      memberStats[member].total += 1;
    });
  });
}

function getBestMember() {
  const entries = Object.entries(memberStats);

  if (entries.length === 0) {
    return { member: "未登録", rate: 0, correct: 0, total: 0 };
  }

  return entries.reduce((best, [member, stats]) => {
    const rate = stats.total > 0 ? stats.correct / stats.total : 0;

    if (rate > best.rate || (rate === best.rate && stats.correct > best.correct)) {
      return { member, rate, correct: stats.correct, total: stats.total };
    }

    return best;
  }, { member: "未登録", rate: -1, correct: -1, total: 0 });
}

function getMemberSummary() {
  const sortedMembers = Object.entries(memberStats)
    .map(([member, stats]) => ({
      member,
      correct: stats.correct,
      total: stats.total,
      rate: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0
    }))
    .sort((a, b) => {
      if (b.rate !== a.rate) return b.rate - a.rate;
      if (b.correct !== a.correct) return b.correct - a.correct;
      return a.member.localeCompare(b.member);
    });

  return `
    <table style="margin: 12px auto; border-collapse: collapse; color: #fff;">
      <thead>
        <tr>
          <th style="border: 1px solid #ff2b2b; padding: 8px;">メンバー</th>
          <th style="border: 1px solid #ff2b2b; padding: 8px;">正答数</th>
          <th style="border: 1px solid #ff2b2b; padding: 8px;">正答率</th>
        </tr>
      </thead>
      <tbody>
        ${sortedMembers
          .map(
            (item) => `
              <tr>
                <td style="border: 1px solid #ff2b2b; padding: 8px;">${item.member}</td>
                <td style="border: 1px solid #ff2b2b; padding: 8px;">${item.correct} / ${item.total}</td>
                <td style="border: 1px solid #ff2b2b; padding: 8px;">${item.rate}%</td>
              </tr>
            `
          )
          .join("")}
      </tbody>
    </table>
  `;
}

/* 画面表示 */
function renderStartScreen() {
  document.body.innerHTML = `
    <div class="start-box">
      <div class="start-title">
        <h1>S.AYUMU検定</h1>
        <p>あなたにこの検定が<br>クリアできるかな！？</p>
      </div>
      <div class="start-text">
        <p>あなたの習熟度と<br>専攻を教えてください！</p><br>
        <p>出題範囲：本編・YouTubeで公開されたビハインド映像やチッケム、本人SNS<br>（ファンブックやグッズからの出題はありません）<br></p>
        <p>※本サイトはファンが作成した<br>非公式サイトです。</p>

        <button class="start-btn" onclick="startGame()">試験スタート！</button>
      </div>
    </div>
  `;
}

function renderQuestionScreen() {
  const question = questions[currentQuestionIndex];
  const answerChoices = question.choices || [];
  const isMultiple = question.type === "multiple" || Array.isArray(question.answer);

  document.body.innerHTML = `
    <h1>S.AYUMU検定</h1>
        
    <div class="quiz-box">
      <h2>問題 ${currentQuestionIndex + 1} / ${questions.length}</h2>
      <h3 class="question">${question.question || question.text}</h3>
      ${answerChoices
        .map((choice, index) => {
          if (isMultiple) {
            const isSelected = selectedAnswers.includes(index);
            return `
              <label class="choice-label">
                <input type="checkbox" ${isSelected ? "checked" : ""} onclick="toggleAnswer(${index})">
                <span>${choice}</span>
              </label>
            `;
          }
          return `<button class="choice-btn" onclick="checkAnswer(${index})">${choice}</button>`;
        })
        .join("")}
      ${isMultiple ? '<button class="next-btn" onclick="submitMultipleAnswer()">回答する</button>' : ""}
      <button class="reset-btn" onclick="startQuiz()">最初に戻る</button>
    </div>
  `;
}

function renderResultScreen(resultText) {
  document.body.innerHTML = `
    <div class="result-box">
      <h1>RESULT</h1>
      <h2>${resultText}</h2>
      <div class="result-actions">
        <button class="next-btn" onclick="startGame()">次の問題へ</button>
      </div>
    </div>
  `;
}

function renderFinalResultScreen(resultText) {
  const percentage = Math.round((correctCount / questions.length) * 100);
  const bestMember = getBestMember();
  const bestMemberLabel = `${bestMember.member}（${Math.round(bestMember.rate * 100)}% / ${bestMember.correct}回正解）`;
  const degree = percentage >= 80 ? "頭脳派Ayumoon" : percentage >= 60 ? "バランス型Ayumoon" : percentage >= 50 ? "感覚派Ayumoon" : "ベーシックAyumoon";

  document.body.innerHTML = `
    <div class="result-box">
      <h1>試験終了！</h1>
      <h2>あなたの結果は...</h2>
      <p>${resultText}</p>
      <p>正答数: ${correctCount} / ${questions.length}</p>
      <p>正答率: ${percentage}%</p>
      <p>あなたは...</p>
      <p>${degree}</p>
      <div class="result-actions">
        <button class="twitter-btn" onclick="shareToTwitter('${degree}', '${percentage}', '${bestMember.member}')">🐦 結果をポストする！</button>
        <button class="reset-btn" onclick="startQuiz()">最初に戻る</button>
      </div>
    </div>
  `;
}

/* Twitter共有機能 */
function shareToTwitter(degree, percentage, member) {
  const text = `S.AYUMU検定 受験完了！
正答率: ${percentage}%
あなたのタイプ: ${degree}
専攻: ${member}

あなたも試験を受けてみよう！`;

  const siteUrl = "https://github.com/s-724/shinogayakentei.git";

  const twitterUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(siteUrl)}&hashtags=BEPloud,組み分け試験`;

  window.open(twitterUrl, "_blank", "width=550,height=420");
}

/* ゲームの流れ */
async function startQuiz() {
  await loadQuestions();
  currentQuestionIndex = 0;
  correctCount = 0;
  selectedAnswers = [];
  resetMemberStats();
  renderStartScreen();
}

function startGame() {
  selectedAnswers = [];
  renderQuestionScreen();
}

function toggleAnswer(index) {
  if (selectedAnswers.includes(index)) {
    selectedAnswers = selectedAnswers.filter((item) => item !== index);
  } else {
    selectedAnswers = [...selectedAnswers, index];
  }
  renderQuestionScreen();
}

function submitMultipleAnswer() {
  checkAnswer(selectedAnswers);
}

function checkAnswer(choice) {
  const question = questions[currentQuestionIndex];
  const correctAnswerIndexes = getCorrectAnswerIndexes(question);
  const selectedIndexes = Array.isArray(choice)
    ? choice.map((value) => Number(value))
    : [Number(choice)];
  const normalizedSelection = selectedIndexes.filter((value) => Number.isInteger(value));
  const isCorrect =
    normalizedSelection.length > 0 &&
    normalizedSelection.every((index) => correctAnswerIndexes.includes(index)) &&
    correctAnswerIndexes.every((index) => normalizedSelection.includes(index));
  const resultText = isCorrect ? "正解🎉" : "不正解😭";
  const members = getQuestionMembers(question);

  if (isCorrect) {
    correctCount += 1;
    if (members.length > 0) {
      members.forEach((member) => {
        if (memberStats[member]) {
          memberStats[member].correct += 1;
        }
      });
    } else {
      const fallback = "未登録";
      if (memberStats[fallback]) {
        memberStats[fallback].correct += 1;
      }
    }
  }

  selectedAnswers = [];

  if (currentQuestionIndex < questions.length - 1) {
    currentQuestionIndex += 1;
    renderResultScreen(resultText);
  } else {
    renderFinalResultScreen(resultText);
  }
}



