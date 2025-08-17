import PlayerAI from "./aiPlayer.js";
import { Bomb } from "./bomb.js";
import { drawMap, generateLevel } from "./mapGenerator.js";
import { drawBombPlus, drawSoftWall, drawWall, drawFire, drawWheels } from "./mapTiles.js";
import Player from "./player.js";

// Initiate canvas
const canvas = document.getElementById("canvas");
const context = canvas.getContext("2d");

const gameData = {
  canvas: {
    context: context,
    cells: generateLevel(13, 15, {
      wall: "▉",
      softWall: 1,
      bomb: 2,
      bombPlus: 3,
      fire: 4,
      wheels: 5,
    }),
    numRows: 13,
    numCols: 15,
    grid: canvas.width / 15,
    tiles: {
      softWallCanvas: drawSoftWall(canvas.width / 15),
      wallCanvas: drawWall(canvas.width / 15),
      bombPlus: drawBombPlus(canvas.width / 15),
      fire: drawFire(canvas.width / 15),
      wheels: drawWheels(canvas.width / 15),
    },
    tileTypes: {
      wall: "▉",
      softWall: 1,
      bomb: 2,
      bombPlus: 3,
      fire: 4,
      wheels: 5,
    },
  },
  // keep track of all entities
  entities: [],
  // game state
  state: "menu", // menu | running | win | gameover
};

const player = new Player(gameData);
// Expose player so AI can reference position and state
gameData.player = player;

// Multiple AI support
let aiPlayers = [];
let aiMoveTimers = new Map(); // per-AI timer

function spawnAIs(count) {
  aiPlayers = [];
  aiMoveTimers = new Map();
  // Corner positions (avoid player's corner at (1,1))
  const corners = [
    { row: 1, col: gameData.canvas.numCols - 2 }, // top-right
    { row: gameData.canvas.numRows - 2, col: 1 }, // bottom-left
    { row: gameData.canvas.numRows - 2, col: gameData.canvas.numCols - 2 }, // bottom-right
  ];
  for (let i = 0; i < Math.min(3, Math.max(0, count)); i++) {
    const pos = corners[i];
    const ai = new PlayerAI(gameData, pos);
    aiPlayers.push(ai);
    aiMoveTimers.set(ai, 60);
  }
}

// Hook HTML menu buttons
function initMenuControls() {
  const menuEl = document.getElementById("menu");
  if (!menuEl) return;
  menuEl.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-ais]");
    if (!btn) return;
    const num = parseInt(btn.getAttribute("data-ais"), 10) || 0;
    spawnAIs(num);
    gameData.state = "running";
    menuEl.style.display = "none";
  });
}
initMenuControls();

// Heads-up display: show player and AI stats
function drawHUD(ctx, gd, player, aiList) {
  const pad = 8;
  const lineH = 18;
  ctx.save();
  ctx.font = "14px monospace";
  ctx.textBaseline = "top";
  // semi-transparent panel
  const w = 260;
  const h = 4 * lineH + pad * 2;
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fillRect(pad, pad, w, h);
  ctx.fillStyle = "#fff";
  const fmt = (n) => (typeof n === "number" ? n : 0);
  let y = pad + 4;
  ctx.fillText("HUD", pad + 8, y);
  y += lineH;
  ctx.fillText(
    `Player  B:${fmt(player.numBombs)}  F:${fmt(player.bombSize)}  S:${fmt(player.speed || 1)}`,
    pad + 8,
    y
  );
  y += lineH;
  const aliveAIs = aiList.filter((a) => a.life > 0);
  const aiInfo = aliveAIs[0]
    ? `AI1 B:${fmt(aliveAIs[0].numBombs)} F:${fmt(aliveAIs[0].bombSize)} S:${fmt(
        aliveAIs[0].speed || 1
      )}`
    : "AI1 B:0 F:0 S:0";
  ctx.fillText(`AIs:${aiList.length}  ${aiInfo}`, pad + 8, y);
  y += lineH;
  ctx.fillText(
    `Pos P:(${player.row},${player.col})`,
    pad + 8,
    y
  );
  ctx.restore();
}

function drawMenu(ctx) {
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "46px sans-serif";
  ctx.fillText("Bomberman", ctx.canvas.width / 2, ctx.canvas.height / 2 - 120);
  ctx.font = "20px sans-serif";
  ctx.fillText("Selecione o número de IAs (0-3)", ctx.canvas.width / 2, ctx.canvas.height / 2 - 70);
  ctx.fillText("Pressione 0, 1, 2 ou 3", ctx.canvas.width / 2, ctx.canvas.height / 2 - 40);
  ctx.fillText("WASD/Setas para mover, Espaço para bomba", ctx.canvas.width / 2, ctx.canvas.height / 2);
  ctx.fillText("R para reiniciar após o fim", ctx.canvas.width / 2, ctx.canvas.height / 2 + 30);
  ctx.restore();
}

function drawEndOverlay(ctx, state) {
  if (state === "running") return;
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "48px sans-serif";
  const msg = state === "win" ? "You Win!" : "Game Over";
  ctx.fillText(msg, ctx.canvas.width / 2, ctx.canvas.height / 2 - 20);
  ctx.font = "20px sans-serif";
  ctx.fillText("Press R to Restart", ctx.canvas.width / 2, ctx.canvas.height / 2 + 30);
  ctx.restore();
}

function checkDeaths(gd, player, aiList) {
  if (gd.state !== "running") return;
  // collect active explosion tiles
  const exp = new Set();
  gd.entities.forEach((e) => {
    if (e.alive && e.type === "explosion") exp.add(`${e.row},${e.col}`);
  });
  if (player.life > 0 && exp.has(`${player.row},${player.col}`)) {
    player.life = 0;
  }
  aiList.forEach((ai) => {
    if (ai.life > 0 && exp.has(`${ai.row},${ai.col}`)) ai.life = 0;
  });
  // resolve state
  if (player.life <= 0) gd.state = "gameover";
  else if (aiList.length > 0 && aiList.every((a) => a.life <= 0)) gd.state = "win";
  else if (aiList.length === 0) gd.state = "win"; // no AI chosen
}

// game loop
let last;
let dt;

let aiMoveTimer = 60;

function loop(timestamp) {
  requestAnimationFrame(loop);
  context.clearRect(0, 0, canvas.width, canvas.height);

  // calculate the time difference since the last update. requestAnimationFrame
  // passes the current timestamp as a parameter to the loop
  if (!last) {
    last = timestamp;
  }
  dt = timestamp - last;
  last = timestamp;

  drawMap(gameData);

  if (gameData.state === "menu") {
    drawMenu(context);
    return;
  }

  // update and render all entities
  gameData.entities.forEach((entity) => {
    // freeze updates when ended, but still render existing entities
    if (gameData.state === "running") entity.update(dt);
    entity.render();
  });

  // remove dead entities
  gameData.entities = gameData.entities.filter((entity) => entity.alive);

  if (player.life > 0) player.render();
  aiPlayers.forEach((ai) => {
    if (ai.life > 0) ai.render();
  });
  // HUD
  drawHUD(context, gameData, player, aiPlayers);
  // death check and end state
  checkDeaths(gameData, player, aiPlayers);
  drawEndOverlay(context, gameData.state);
  // make AI move more often if it has speed power-ups (no multi-tile jumps)
  if (gameData.state === "running") {
    aiPlayers.forEach((ai) => {
      const t = (aiMoveTimers.get(ai) ?? 60) - Math.max(1, ai.speed || 1);
      if (t <= 0) {
        if (ai.life > 0) ai.move();
        aiMoveTimers.set(ai, 60);
      } else {
        aiMoveTimers.set(ai, t);
      }
    });
  }
}

// listen to keyboard events to move the snake
document.addEventListener("keydown", function (e) {
  if (e.code === "KeyR") {
    if (gameData.state !== "running") {
      // simple restart: reload page
      window.location.reload();
      return;
    }
  }
  if (gameData.state === "menu") {
    if (["Digit0", "Digit1", "Digit2", "Digit3", "Numpad0", "Numpad1", "Numpad2", "Numpad3"].includes(e.code)) {
      const num = Number(e.key);
      spawnAIs(num);
      gameData.state = "running";
    }
    return;
  }
  if (gameData.state !== "running") return;
  let row = player.row;
  let col = player.col;
  let dRow = 0;
  let dCol = 0;
  // left arrow key
  if (e.key === "ArrowLeft" || e.code === "KeyA") {
    dCol = -1;
    player.looking = "left";
  }
  // up arrow key
  else if (e.key === "ArrowUp" || e.code === "KeyW") {
    dRow = -1;
    player.looking = "up";
  }
  // right arrow key
  else if (e.key === "ArrowRight" || e.code === "KeyD") {
    dCol = 1;
    player.looking = "right";
  }
  // down arrow key
  else if (e.key === "ArrowDown" || e.code === "KeyS") {
    dRow = 1;
    player.looking = "down";
  }
  // space key (bomb)
  else if (
    e.code === "Space" &&
    !gameData.canvas.cells[row][col] &&
    // count the number of bombs the player has placed
    gameData.entities.filter((entity) => {
      return (
        entity.type === gameData.canvas.tileTypes.bomb &&
        entity.owner === player
      );
    }).length < player.numBombs
  ) {
    // place bomb
    const bomb = new Bomb(row, col, player.bombSize, player, gameData);
    gameData.entities.push(bomb);
    gameData.canvas.cells[row][col] = gameData.canvas.tileTypes.bomb;
  }

  // move exactly one tile; apply pickup if destination has a power-up
  const nextRow = row + dRow;
  const nextCol = col + dCol;
  const cell = gameData.canvas.cells?.[nextRow]?.[nextCol];
  if (!cell) {
    row = nextRow;
    col = nextCol;
  } else if (
    cell === gameData.canvas.tileTypes.bombPlus ||
    cell === gameData.canvas.tileTypes.fire ||
    cell === gameData.canvas.tileTypes.wheels
  ) {
    row = nextRow;
    col = nextCol;
    if (cell === gameData.canvas.tileTypes.bombPlus) player.numBombs += 1;
    if (cell === gameData.canvas.tileTypes.fire) player.bombSize += 1;
    if (cell === gameData.canvas.tileTypes.wheels)
      player.speed = Math.min(3, (player.speed || 1) + 1);
    gameData.canvas.cells[row][col] = undefined;
  }

  // commit final position
  player.row = row;
  player.col = col;
});

requestAnimationFrame(loop);
