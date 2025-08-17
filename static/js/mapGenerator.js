// keep track of what is in every cell of the game using a 2d array. the
// template is used to note where walls are and where soft walls cannot spawn.
// '▉' represents a wall
// 'x' represents a cell that cannot have a soft wall (player start zone)
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
export function generateLevel(numRows, numCols, types) {
  const cells = [];

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

  return cells;
}

export function drawMap(gameData) {
  // update and render everything in the grid
  for (let row = 0; row < gameData.canvas.numRows; row++) {
    for (let col = 0; col < gameData.canvas.numCols; col++) {
      switch (gameData.canvas.cells[row][col]) {
        case gameData.canvas.tileTypes.wall:
          gameData.canvas.context.drawImage(
            gameData.canvas.tiles.wallCanvas,
            col * gameData.canvas.grid,
            row * gameData.canvas.grid
          );
          break;
        case gameData.canvas.tileTypes.softWall:
          gameData.canvas.context.drawImage(
            gameData.canvas.tiles.softWallCanvas,
            col * gameData.canvas.grid,
            row * gameData.canvas.grid
          );
          break;
        case gameData.canvas.tileTypes.bombPlus:
          gameData.canvas.context.drawImage(
            gameData.canvas.tiles.bombPlus,
            col * gameData.canvas.grid,
            row * gameData.canvas.grid
          );
          break;
        case gameData.canvas.tileTypes.fire:
          gameData.canvas.context.drawImage(
            gameData.canvas.tiles.fire,
            col * gameData.canvas.grid,
            row * gameData.canvas.grid
          );
          break;
        case gameData.canvas.tileTypes.wheels:
          gameData.canvas.context.drawImage(
            gameData.canvas.tiles.wheels,
            col * gameData.canvas.grid,
            row * gameData.canvas.grid
          );
          break;
      }
    }
  }
}
