import { Bomb } from "./bomb.js";
import { drawSoftWall, drawWall } from "./mapTiles.js";
import Player from "./player.js";

// Initiate canvas
const canvas = document.getElementById("canvas");
const context = canvas.getContext("2d");
// canvas.width = window.innerWidth * 0.8 > 600 ? 600 : window.innerWidth * 0.8;
// canvas.height = window.innerWidth * 0.7;

// Set
const numRows = 13;
const numCols = 15;
let grid = canvas.width / numCols;

const player = new Player(context, grid);
const softWallCanvas = drawSoftWall(grid);
const wallCanvas = drawWall(grid);

// create a mapping of object types
const types = {
  wall: "▉",
  softWall: 1,
  bomb: 2,
};

// keep track of all entities
let entities = [];

// keep track of what is in every cell of the game using a 2d array. the
// template is used to note where walls are and where soft walls cannot spawn.
// '▉' represents a wall
// 'x' represents a cell that cannot have a soft wall (player start zone)
let cells = [];
const template = [
  ["▉", "▉", "▉", "▉", "▉", "▉", "▉", "▉", "▉", "▉", "▉", "▉", "▉", "▉", "▉"],
  ["▉", "x", "x", , , , , , , , , , "x", "x", "▉"],
  ["▉", "x", "▉", , "▉", , "▉", , "▉", , "▉", , "▉", "x", "▉"],
  ["▉", "x", , , , , , , , , , , , "x", "▉"],
  ["▉", , "▉", , "▉", , "▉", , "▉", , "▉", , "▉", , "▉"],
  ["▉", , , , , , , , , , , , , , "▉"],
  ["▉", , "▉", , "▉", , "▉", , "▉", , "▉", , "▉", , "▉"],
  ["▉", , , , , , , , , , , , , , "▉"],
  ["▉", , "▉", , "▉", , "▉", , "▉", , "▉", , "▉", , "▉"],
  ["▉", "x", , , , , , , , , , , , "x", "▉"],
  ["▉", "x", "▉", , "▉", , "▉", , "▉", , "▉", , "▉", "x", "▉"],
  ["▉", "x", "x", , , , , , , , , , "x", "x", "▉"],
  ["▉", "▉", "▉", "▉", "▉", "▉", "▉", "▉", "▉", "▉", "▉", "▉", "▉", "▉", "▉"],
];

// populate the level with walls and soft walls
function generateLevel() {
  cells = [];

  for (let row = 0; row < numRows; row++) {
    cells[row] = [];

    for (let col = 0; col < numCols; col++) {
      // 90% chance cells will contain a soft wall
      if (!template[row][col] && Math.random() < 0.9) {
        cells[row][col] = types.softWall;
      } else if (template[row][col] === types.wall) {
        cells[row][col] = types.wall;
      }
    }
  }
}

// blow up a bomb and its surrounding tiles
function blowUpBomb(bomb) {
  // bomb has already exploded so don't blow up again
  if (!bomb.alive) return;
  bomb.alive = false;
  // remove bomb from grid
  cells[bomb.row][bomb.col] = null;
  // explode bomb outward by size
  const dirs = [
    // up
    { row: -1, col: 0 },
    // down
    { row: 1, col: 0 },
    // left
    { row: 0, col: -1 },
    // right
    { row: 0, col: 1 },
  ];
  dirs.forEach((dir) => {
    for (let i = 0; i < bomb.size; i++) {
      const row = bomb.row + dir.row * i;
      const col = bomb.col + dir.col * i;
      const cell = cells[row][col];

      // stop the explosion if it hit a wall
      if (cell === types.wall) {
        return;
      }

      // center of the explosion is the first iteration of the loop
      entities.push(new Explosion(row, col, dir, i === 0 ? true : false));
      cells[row][col] = null;

      // bomb hit another bomb so blow that one up too
      if (cell === types.bomb) {
        // find the bomb that was hit by comparing positions
        const nextBomb = entities.find((entity) => {
          return (
            entity.type === types.bomb &&
            entity.row === row &&
            entity.col === col
          );
        });
        blowUpBomb(nextBomb);
      }
      // stop the explosion if hit anything
      if (cell) {
        return;
      }
    }
  });
}

// explosion constructor function
function Explosion(row, col, dir, center) {
  this.row = row;
  this.col = col;
  this.dir = dir;
  this.alive = true;

  // show explosion for 0.3 seconds
  this.timer = 300;

  // update the explosion each frame
  this.update = function (dt) {
    this.timer -= dt;

    if (this.timer <= 0) {
      this.alive = false;
    }
  };

  // render the explosion each frame
  this.render = function () {
    const x = this.col * grid;
    const y = this.row * grid;
    const horizontal = this.dir.col;
    const vertical = this.dir.row;
    const offSet = grid * 0.2;
    // create a fire effect by stacking red, orange, and yellow on top of
    // each other using progressively smaller rectangles
    context.fillStyle = "#D72B16"; // red
    context.fillRect(x, y, grid, grid);

    context.fillStyle = "#F39642"; // orange

    // determine how to draw based on if it's vertical or horizontal
    // center draws both ways
    if (center || horizontal) {
      context.fillRect(x, y + 6, grid, grid - 12);
    }
    if (center || vertical) {
      context.fillRect(x + 6, y, grid - 12, grid);
    }

    context.fillStyle = "#FFE5A8"; // yellow

    if (center || horizontal) {
      context.fillRect(x, y + 12, grid, grid - 24);
    }
    if (center || vertical) {
      context.fillRect(x + 12, y, grid - 24, grid);
    }
  };
}

// game loop
let last;
let dt;

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

  // update and render everything in the grid
  for (let row = 0; row < numRows; row++) {
    for (let col = 0; col < numCols; col++) {
      switch (cells[row][col]) {
        case types.wall:
          context.drawImage(wallCanvas, col * grid, row * grid);
          break;
        case types.softWall:
          context.drawImage(softWallCanvas, col * grid, row * grid);
          break;
      }
    }
  }

  // update and render all entities
  entities.forEach((entity) => {
    entity.update(dt);
    entity.render();
  });

  // remove dead entities
  entities = entities.filter((entity) => entity.alive);

  player.render();
}

// listen to keyboard events to move the snake
document.addEventListener("keydown", function (e) {
  let row = player.row;
  let col = player.col;
  // left arrow key
  if (e.key === "ArrowLeft" || e.code === "KeyA") {
    col--;
  }
  // up arrow key
  else if (e.key === "ArrowUp" || e.code === "KeyW") {
    row--;
  }
  // right arrow key
  else if (e.key === "ArrowRight" || e.code === "KeyD") {
    col++;
  }
  // down arrow key
  else if (e.key === "ArrowDown" || e.code === "KeyS") {
    row++;
  }
  // space key (bomb)
  else if (
    e.code === "Space" &&
    !cells[row][col] &&
    // count the number of bombs the player has placed
    entities.filter((entity) => {
      return entity.type === types.bomb && entity.owner === player;
    }).length < player.numBombs
  ) {
    // place bomb
    const bomb = new Bomb(
      row,
      col,
      player.bombSize,
      player,
      grid,
      context,
      blowUpBomb
    );
    entities.push(bomb);
    cells[row][col] = types.bomb;
  }

  // don't move the player if something is already at that position
  if (!cells[row][col]) {
    player.row = row;
    player.col = col;
  }
});

// start the game
generateLevel();
requestAnimationFrame(loop);