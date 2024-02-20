export const drawSoftWall = (grid) => {
  // create a new canvas and draw the soft wall image. then we can use this
  // canvas to draw the images later on
  const softWallCanvas = document.createElement("canvas");
  const softWallCtx = softWallCanvas.getContext("2d");
  softWallCanvas.width = softWallCanvas.height = grid;

  softWallCtx.fillStyle = "black";
  softWallCtx.fillRect(0, 0, grid, grid);
  softWallCtx.fillStyle = "#c16c45";

  // 1st row brick
  softWallCtx.fillRect(1, 0, grid * 0.4 - 1, grid * 0.33);
  softWallCtx.fillRect(grid * 0.4 + 1, 0, grid * 0.6 - 1, grid * 0.33);

  // 2nd row bricks
  softWallCtx.fillRect(1, grid * 0.33 + 1, grid * 0.2 - 1, grid * 0.33);
  softWallCtx.fillRect(
    grid * 0.2 + 1,
    grid * 0.33 + 1,
    grid * 0.6,
    grid * 0.33
  );
  softWallCtx.fillRect(
    grid * 0.8 + 2,
    grid * 0.33 + 1,
    grid * 0.2 - 2,
    grid * 0.33
  );

  // 3rd row bricks
  softWallCtx.fillRect(1, grid * 0.66 + 2, grid * 0.6 - 1, grid * 0.33 - 3);
  softWallCtx.fillRect(
    grid * 0.6 + 1,
    grid * 0.66 + 2,
    grid * 0.4 - 1,
    grid * 0.33 - 3
  );
  console.log(softWallCanvas);
  return softWallCanvas;
};

export const drawWall = (grid) => {
  // create a new canvas and draw the soft wall image. then we can use this
  // canvas to draw the images later on
  const wallCanvas = document.createElement("canvas");
  const wallCtx = wallCanvas.getContext("2d");
  wallCanvas.width = wallCanvas.height = grid;

  wallCtx.fillStyle = "black";
  wallCtx.fillRect(0, 0, grid, grid);
  wallCtx.fillStyle = "white";
  wallCtx.fillRect(0, 0, grid - 0.5, grid - 2);
  wallCtx.fillStyle = "#a9a9a9";
  wallCtx.fillRect(2, 2, grid - 2, grid - 4);
  console.log(grid);
  return wallCanvas;
};

export const drawBombPlus = (grid) => {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  canvas.width = canvas.height = grid;
  context.fillStyle = "black";
  context.beginPath();
  context.arc(grid * 0.5, grid * 0.5, grid * 0.3, 0, 2 * Math.PI);
  context.fill();

  // draw bomb fuse moving up and down with the bomb size
  context.strokeStyle = "white";
  context.lineWidth = 5;
  context.beginPath();
  context.arc(0.75 * grid, 0.3 * grid, 10, Math.PI, -Math.PI / 2);
  context.stroke();

  // draw bomb fuse moving up and down with the bomb size
  context.strokeStyle = "yellow";
  context.lineWidth = 5;
  context.beginPath();
  context.moveTo(grid * 0.3, grid * 0.5);
  context.lineTo(grid * 0.7, grid * 0.5);
  context.moveTo(grid * 0.5, grid * 0.3);
  context.lineTo(grid * 0.5, grid * 0.7);

  context.stroke();

  return canvas;
};
