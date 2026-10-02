import { useState, useEffect, useRef } from 'react';

// Exact menu from Sarbath Club
const DRINKS = [
  { pre: '', word: 'BADAM', post: ' MILK SARBATH', hint: 'Badam, Milk, Nannari Syrup, Basil Seeds' },
  { pre: '', word: 'GRAPE', post: ' MILK SARBATH', hint: 'Grape, Milk, Nannari Syrup, Basil Seeds' },
  { pre: '', word: 'GRAPE', post: ' SODA SARBATH', hint: 'Grape, Soda, Nannari Syrup, Basil Seeds' },
  { pre: '', word: 'BOOST', post: ' MILK SARBATH', hint: 'Boost, Milk, Nannari Syrup, Basil Seeds' },
  { pre: '', word: 'MILK', post: ' SARBATH SP', hint: 'Full Cream Milk, Nannari Syrup, Basil Seeds' },
  { pre: '', word: 'MILK', post: ' SARBATH', hint: 'Milk, Nannari Syrup' },
  { pre: '', word: 'SODA', post: ' SARBATH', hint: 'Soda, Lemon, Nannari Syrup' },
  { pre: '', word: 'SARBATH', post: '', hint: 'Water, Lemon, Nannari Syrup' },
  { pre: '', word: 'LEMON', post: ' SODA', hint: 'Soda, Lemon, Salt' }
];

function shuffleArray(array) {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

export function AnagramGame({ onBack, onLeaderboard }) {
  const [gameState, setGameState] = useState('welcome'); // welcome, playing, result
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [currentDrink, setCurrentDrink] = useState(null);
  const [scrambled, setScrambled] = useState([]);
  const [selectedIndices, setSelectedIndices] = useState([]);
  const [isError, setIsError] = useState(false);
  
  const timerRef = useRef(null);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startGame = () => {
    setScore(0);
    setTimeLeft(30);
    setGameState('playing');
    loadNextDrink(null);
    
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setGameState('result');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleExit = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    onBack();
  };

  const loadNextDrink = (prevDrink) => {
    let nextDrink = DRINKS[Math.floor(Math.random() * DRINKS.length)];
    // avoid exact same drink twice in a row
    while (prevDrink && nextDrink.word === prevDrink.word && nextDrink.post === prevDrink.post) {
      nextDrink = DRINKS[Math.floor(Math.random() * DRINKS.length)];
    }
    setCurrentDrink(nextDrink);
    
    // Scramble logic for the key word only
    let letters = nextDrink.word.split('');
    let shuffled = shuffleArray(letters);
    
    // ensure it's not the same as original
    while (shuffled.join('') === nextDrink.word && nextDrink.word.length > 1) {
      shuffled = shuffleArray(letters);
    }
    
    // Create objects so duplicate letters have unique keys
    setScrambled(shuffled.map((char, i) => ({ char, id: i })));
    setSelectedIndices([]);
  };

  const handleTapLetter = (index) => {
    if (selectedIndices.includes(index)) return;
    
    const newSelected = [...selectedIndices, index];
    setSelectedIndices(newSelected);
    
    const formedWord = newSelected.map(i => scrambled[i].char).join('');
    
    if (formedWord === currentDrink.word) {
      // Correct!
      setScore(prev => prev + 1);
      setTimeout(() => {
        loadNextDrink(currentDrink);
      }, 300); // short delay for visual feedback
    } else if (formedWord.length === currentDrink.word.length) {
      // Wrong word
      setIsError(true);
      setTimeout(() => {
        setIsError(false);
        setSelectedIndices([]);
      }, 400);
    }
  };

  const handleClear = () => {
    setSelectedIndices([]);
  };

  return (
    <div className="game-layout">
      {gameState === 'welcome' && (
        <>
          <button className="back-to-games" onClick={onBack}>
            <span aria-hidden="true">&lt;</span>All games
          </button>
          <section className="intro">
            <span className="eyebrow">WORD PUZZLE</span>
            <h1>30 Second <span>Challenge</span></h1>
            <div className="game-lede">
              <p>Unscramble the Sarbath Club menu before time runs out.</p>
            </div>
          </section>
          <section className="game-card">
            <div className="game-welcome">
              <div className="game-stats">
                <strong>Score 8 to win</strong>
                <span>Instant BOGO reward</span>
              </div>
              <button className="primary game-start" onClick={startGame}>
                <span>Let’s play</span><span aria-hidden="true">→</span>
              </button>
              <div className="card-foot">Top scores hit the Leaderboard</div>
            </div>
          </section>
        </>
      )}

      {gameState === 'playing' && currentDrink && (
        <>
          <button className="back-to-games" onClick={handleExit}>
            <span aria-hidden="true">&lt;</span>Exit Game
          </button>
          <section className="anagram-board" style={{ textAlign: 'center', padding: '10px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', fontSize: '18px', fontWeight: 'bold' }}>
              <div style={{ color: timeLeft <= 5 ? '#ff4d4d' : 'inherit' }}>⏱ {timeLeft}s</div>
              <div>Score: {score}</div>
            </div>
            
            <div style={{ color: '#a7bbd4', marginBottom: '16px', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', padding: '0 20px', lineHeight: '1.4' }}>
              Ingredients: {currentDrink.hint}
            </div>

            {/* Answer Display Area */}
            <div 
              style={{ 
                fontSize: '20px', 
                fontWeight: 'bold', 
                marginBottom: '30px', 
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexWrap: 'wrap',
                gap: '6px',
                animation: isError ? 'shake 0.4s' : 'none'
              }}
            >
              {currentDrink.pre && <span>{currentDrink.pre}</span>}
              
              <span style={{ display: 'inline-flex', gap: '4px', margin: '0 4px' }}>
                {Array.from({ length: currentDrink.word.length }).map((_, i) => (
                  <div key={i} style={{ 
                    width: '32px', 
                    height: '38px', 
                    borderBottom: '2px solid #71b4ff', 
                    display: 'grid', 
                    placeItems: 'center', 
                    color: '#ffc83f',
                    fontSize: '24px'
                  }}>
                    {selectedIndices[i] !== undefined ? scrambled[selectedIndices[i]].char : ''}
                  </div>
                ))}
              </span>
              
              {currentDrink.post && <span>{currentDrink.post}</span>}
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '20px' }}>
              {/* Available Letters */}
              {scrambled.map((item, i) => (
                <button
                  key={item.id}
                  onClick={() => handleTapLetter(i)}
                  disabled={selectedIndices.includes(i)}
                  style={{
                    width: '50px',
                    height: '50px',
                    background: selectedIndices.includes(i) ? 'transparent' : '#102033',
                    border: selectedIndices.includes(i) ? '1px dashed #29415d' : '1px solid #71b4ff',
                    color: selectedIndices.includes(i) ? 'transparent' : '#fff',
                    fontSize: '24px',
                    fontWeight: 'bold',
                    borderRadius: '10px',
                    cursor: selectedIndices.includes(i) ? 'default' : 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {item.char}
                </button>
              ))}
            </div>

            <button onClick={handleClear} style={{ background: 'transparent', border: 'none', color: '#a7bbd4', padding: '10px', marginTop: '10px', cursor: 'pointer', fontSize: '14px' }}>
              Clear / Undo
            </button>
          </section>
        </>
      )}

      {gameState === 'result' && (
        <section className="game-card result-screen" style={{ textAlign: 'center' }}>
          <div className="eyebrow">TIME IS UP</div>
          <h2 className="result-title">You scored {score}</h2>
          
          <div style={{ margin: '20px 0', fontSize: '15px' }}>
            {score >= 8 
              ? '🎉 Amazing! You unlocked an instant BOGO reward!' 
              : score >= 4 
                ? 'Great job! Keep practicing to hit 8 for a free drink!' 
                : 'Nice try! Better luck next time.'}
          </div>

          <button className="primary" onClick={startGame} style={{ marginBottom: '10px' }}>
            Play again
          </button>
          
          <button className="back-to-games" onClick={onBack} style={{ margin: '10px auto', display: 'flex' }}>
            <span aria-hidden="true">&lt;</span> Back to all games
          </button>
        </section>
      )}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          50% { transform: translateX(5px); }
          75% { transform: translateX(-5px); }
        }
      `}</style>
    </div>
  );
}
