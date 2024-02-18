// explosion constructor function
function Explosion(row, col, dir, center, grid, context) {
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

// bomb constructor function
export function Bomb(row, col, size, owner, gameData) {
  this.row = row;
  this.col = col;
  this.radius = gameData.canvas.grid * 0.2;
  this.size = size; // the size of the explosion
  this.owner = owner; // which player placed this bomb
  this.alive = true;
  this.type = 2;

  // bomb blows up after 3 seconds
  this.timer = 3000;

  // update the bomb each frame
  this.update = function (dt) {
    this.timer -= dt;

    // blow up bomb if timer is done
    if (this.timer <= 0) {
      return this.blowUpBomb();
    }

    // change the size of the bomb every half second. we can determine the size
    // by dividing by 500 (half a second) and taking the ceiling of the result.
    // then we can check if the result is even or odd and change the size
    const interval = Math.ceil(this.timer / 500);
    if (interval % 2 === 0) {
      this.radius = gameData.canvas.grid * 0.4;
    } else {
      this.radius = gameData.canvas.grid * 0.5;
    }
  };

  // render the bomb each frame
  this.render = function () {
    const x = (this.col + 0.5) * gameData.canvas.grid;
    const y = (this.row + 0.5) * gameData.canvas.grid;

    // draw bomb
    gameData.canvas.context.fillStyle = "black";
    gameData.canvas.context.beginPath();
    gameData.canvas.context.arc(x, y, this.radius * 0.7, 0, 2 * Math.PI);
    gameData.canvas.context.fill();

    // draw bomb fuse moving up and down with the bomb size
    const fuseY =
      this.radius === gameData.canvas.grid * 0.5
        ? gameData.canvas.grid * 0.15
        : 0;
    gameData.canvas.context.strokeStyle = "white";
    gameData.canvas.context.lineWidth = 5;
    gameData.canvas.context.beginPath();
    gameData.canvas.context.arc(
      (this.col + 0.75) * gameData.canvas.grid,
      (this.row + 0.3) * gameData.canvas.grid - fuseY,
      10,
      Math.PI,
      -Math.PI / 2
    );
    gameData.canvas.context.stroke();
  };
  this.blowUpBomb = function () {
    // bomb has already exploded so don't blow up again
    if (!this.alive) return;
    this.alive = false;
    // remove bomb from grid
    gameData.canvas.cells[this.row][this.col] = null;
    // explode bomb outward by size
    const dirs = [
      { row: -1, col: 0 }, // up
      { row: 1, col: 0 }, // down
      { row: 0, col: -1 }, // left
      { row: 0, col: 1 }, // right
    ];
    dirs.forEach((dir) => {
      for (let i = 0; i < this.size; i++) {
        const row = this.row + dir.row * i;
        const col = this.col + dir.col * i;
        const cell = gameData.canvas.cells[row][col];

        // stop the explosion if it hit a wall
        if (cell === gameData.canvas.tileTypes.wall) {
          return;
        }

        // center of the explosion is the first iteration of the loop
        gameData.entities.push(
          new Explosion(
            row,
            col,
            dir,
            i === 0 ? true : false,
            gameData.canvas.grid,
            gameData.canvas.context
          )
        );
        gameData.canvas.cells[row][col] = null;

        // bomb hit another bomb so blow that one up too
        if (cell === gameData.canvas.tileTypes.bomb) {
          // find the bomb that was hit by comparing positions
          const nextBomb = gameData.entities.find((entity) => {
            return (
              entity.type === gameData.canvas.tileTypes.bomb &&
              entity.row === row &&
              entity.col === col
            );
          });
          nextBomb.blowUpBomb();
        }
        // stop the explosion if hit anything
        if (cell) {
          return;
        }
      }
    });
    this.owner.bombsPlaced--;
  };
}
