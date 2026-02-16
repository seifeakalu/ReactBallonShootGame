import React, { useEffect, useRef, useState } from "react";

export default function App() {
  const canvasRef = useRef(null);
  const arrowsRef = useRef([]);
  const balloonsRef = useRef([]);
  const poppedRef = useRef(0);

  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [lives, setLives] = useState(10);
  const [gameOver, setGameOver] = useState(false);

  const MAX_ARROWS = 3;
  const MAX_BALLOONS = 10;

  useEffect(() => {
    const storedBest = parseInt(localStorage.getItem("bestScore") || "0", 10);
    setBestScore(storedBest);
  }, []);

  useEffect(() => {
    if (gameOver) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    function resizeCanvas() {
      if (window.innerWidth <= 768) {
        canvas.width = window.innerWidth * 0.95;
      } else {
        canvas.width = window.innerWidth / 2;
      }
      canvas.height = window.innerHeight * 0.6;
    }
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    let animationFrameId;

    function createBalloon() {
      const balloonsThisLevel = Math.min(level + 1, MAX_BALLOONS);
      if (balloonsRef.current.length >= balloonsThisLevel) return;

      const arrowSafeZone = 50;
      let x;
      let tries = 0;
      do {
        x = Math.random() * (canvas.width - 50) + 50;
        tries++;
      } while (x < arrowSafeZone && tries < 20);

      if (tries >= 20 && x < arrowSafeZone) {
        x = arrowSafeZone + 20;
      }

      const hue = Math.random() * 360;
      balloonsRef.current.push({
        x,
        y: canvas.height + 40,
        radius: 25,
        speed: 2 + (level - 1) * 0.3,
        colorHue: hue,
        sway: Math.random() * 1.5 + 0.5,
        swayDir: Math.random() < 0.5 ? 1 : -1,
      });
    }

    function shootArrow() {
      if (arrowsRef.current.length >= MAX_ARROWS) return;
      arrowsRef.current.push({
        x: -60, // start outside
        y: canvas.height / 2,
        width: 50,
        height: 6,
        speed: 10,
      });
    }

    const handleClick = () => shootArrow();
    window.addEventListener("click", handleClick);

    function drawArrow(arrow) {
      ctx.fillStyle = "brown";
      ctx.fillRect(arrow.x, arrow.y, arrow.width, arrow.height);

      ctx.beginPath();
      ctx.moveTo(arrow.x + arrow.width, arrow.y - 8);
      ctx.lineTo(arrow.x + arrow.width + 15, arrow.y + 3);
      ctx.lineTo(arrow.x + arrow.width, arrow.y + 14);
      ctx.fillStyle = "black";
      ctx.fill();
    }

    function drawBalloon(balloon) {
      const leftBound = balloon.radius;
      const rightBound = canvas.width - balloon.radius;
      balloon.x += balloon.sway * balloon.swayDir;
      if (balloon.x < leftBound || balloon.x > rightBound) {
        balloon.swayDir *= -1;
        balloon.x = Math.max(leftBound, Math.min(rightBound, balloon.x));
      }

      const gradient = ctx.createRadialGradient(
        balloon.x - balloon.radius / 3,
        balloon.y - balloon.radius / 3,
        5,
        balloon.x,
        balloon.y,
        balloon.radius
      );
      gradient.addColorStop(0, `hsl(${balloon.colorHue}, 100%, 80%)`);
      gradient.addColorStop(1, `hsl(${balloon.colorHue}, 70%, 40%)`);

      ctx.beginPath();
      ctx.arc(balloon.x, balloon.y, balloon.radius, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(balloon.x, balloon.y + balloon.radius);
      ctx.lineTo(balloon.x, balloon.y + balloon.radius + 20);
      ctx.strokeStyle = "#555";
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    function drawBackground() {
      const skyGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      skyGradient.addColorStop(0, "#a0e9ff");
      skyGradient.addColorStop(1, "#ffffff");
      ctx.fillStyle = skyGradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < 5; i++) {
        const cloudX = (i * 200 + Date.now() / 50) % canvas.width;
        const cloudY = 50 + i * 30;
        ctx.beginPath();
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        ctx.ellipse(cloudX, cloudY, 40, 20, 0, 0, Math.PI * 2);
        ctx.ellipse(cloudX + 30, cloudY + 5, 35, 18, 0, 0, Math.PI * 2);
        ctx.ellipse(cloudX - 30, cloudY + 5, 35, 18, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function gameLoop() {
      drawBackground();

      arrowsRef.current.forEach((arrow, aIndex) => {
        arrow.x += arrow.speed;
        drawArrow(arrow);
        if (arrow.x > canvas.width) arrowsRef.current.splice(aIndex, 1);
      });

      balloonsRef.current.forEach((balloon, bIndex) => {
        balloon.y -= balloon.speed;
        drawBalloon(balloon);

        if (balloon.y + balloon.radius < 0) {
          balloonsRef.current.splice(bIndex, 1);
          setLives((prevLives) => {
            if (prevLives - 1 <= 0) {
              if (score > bestScore) {
                setBestScore(score);
                localStorage.setItem("bestScore", score);
              }
              setGameOver(true);
              return 0;
            }
            return prevLives - 1;
          });
        }

        // Collision detection, arrow continues after hitting
        arrowsRef.current.forEach((arrow) => {
          const dx = balloon.x - (arrow.x + arrow.width);
          const dy = balloon.y - (arrow.y + arrow.height / 2);
          if (Math.sqrt(dx * dx + dy * dy) < balloon.radius) {
            balloonsRef.current.splice(bIndex, 1);
            setScore((prevScore) => {
              const newScore = prevScore + 1;
              if (newScore > bestScore) {
                setBestScore(newScore);
                localStorage.setItem("bestScore", newScore);
              }
              return newScore;
            });
            poppedRef.current += 1;
            if (poppedRef.current % 5 === 0) setLevel((prevLevel) => prevLevel + 1);
          }
        });
      });

      animationFrameId = requestAnimationFrame(gameLoop);
    }

    const balloonInterval = setInterval(createBalloon, 1000);
    gameLoop();

    return () => {
      cancelAnimationFrame(animationFrameId);
      clearInterval(balloonInterval);
      window.removeEventListener("click", handleClick);
      window.removeEventListener("resize", resizeCanvas);
    };
  }, [level, gameOver, bestScore, score]);

  const restartGame = () => {
    arrowsRef.current = [];
    balloonsRef.current = [];
    poppedRef.current = 0;
    setScore(0);
    setLevel(1);
    setLives(10);
    setGameOver(false);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(to top, #4facfe, #00f2fe)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        overflow: "hidden",
        fontFamily: "Arial",
        cursor: "crosshair",
        padding: 10,
      }}
    >
      <h1 style={{ color: "white", marginTop: 10, textAlign: "center" }}>
        🏹 Balloon Shooter
      </h1>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          width: "100%",
        }}
      >
        <h2 style={{ color: "white" }}>Score: {score}</h2>
        <h2 style={{ color: "white" }}>Level: {level}</h2>
        <h2 style={{ color: "white" }}>Lives left: {lives}</h2>
      </div>

      <canvas
        ref={canvasRef}
        style={{
          border: "4px solid white",
          borderRadius: 12,
          boxShadow: "0 0 20px rgba(0,0,0,0.3)",
          marginTop: 10,
        }}
      />

      <h2 style={{ color: "white", marginTop: 10 }}>Best Score: {bestScore}</h2>

      {gameOver && (
        <div
          style={{
            position: "absolute",
            top: "40%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            backgroundColor: "rgba(0,0,0,0.7)",
            padding: "30px",
            borderRadius: "15px",
            color: "white",
            textAlign: "center",
          }}
        >
          <h1>💀 Game Over</h1>
          <h2>Score: {score}</h2>
          <h2>Best Score: {bestScore}</h2>
          <button
            onClick={restartGame}
            style={{
              marginTop: "15px",
              padding: "10px 20px",
              fontSize: "18px",
              borderRadius: "10px",
              border: "none",
              cursor: "pointer",
              background: "#00c9ff",
              color: "white",
            }}
          >
            Restart Game
          </button>
        </div>
      )}
    </div>
  );
}
