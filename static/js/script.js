import PlayerAI from "./aiPlayer.js";
import { Bomb } from "./bomb.js";
import { drawMap, generateLevel } from "./mapGenerator.js";
import { drawSoftWall, drawWall } from "./mapTiles.js";
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
    }),
    numRows: 13,
    numCols: 15,
    grid: canvas.width / 15,
    tiles: {
      softWallCanvas: drawSoftWall(canvas.width / 15),
      wallCanvas: drawWall(canvas.width / 15),
    },
    tileTypes: {
      wall: "▉",
      softWall: 1,
      bomb: 2,
    },
  },
  // keep track of all entities
  entities: [],
};

const player = new Player(gameData);
const aiPlayer = new PlayerAI(gameData);

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

  // update and render all entities
  gameData.entities.forEach((entity) => {
    entity.update(dt);
    entity.render();
  });

  // remove dead entities
  gameData.entities = gameData.entities.filter((entity) => entity.alive);

  player.render();
  aiPlayer.render();
  aiMoveTimer--;
  if (aiMoveTimer <= 0) {
    aiPlayer.move();
    aiMoveTimer = 60;
  }
}

// listen to keyboard events to move the snake
document.addEventListener("keydown", function (e) {
  let row = player.row;
  let col = player.col;
  // left arrow key
  if (e.key === "ArrowLeft" || e.code === "KeyA") {
    col--;
    player.looking = "left";
  }
  // up arrow key
  else if (e.key === "ArrowUp" || e.code === "KeyW") {
    row--;
    player.looking = "up";
  }
  // right arrow key
  else if (e.key === "ArrowRight" || e.code === "KeyD") {
    col++;
    player.looking = "right";
  }
  // down arrow key
  else if (e.key === "ArrowDown" || e.code === "KeyS") {
    row++;
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

  // don't move the player if something is already at that position
  if (!gameData.canvas.cells[row][col]) {
    player.row = row;
    player.col = col;
  }
});

requestAnimationFrame(loop);
