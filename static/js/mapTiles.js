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

export const drawFire = (grid) => {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  canvas.width = canvas.height = grid;

  // base glow
  const grad = ctx.createRadialGradient(
    grid * 0.5,
    grid * 0.6,
    grid * 0.1,
    grid * 0.5,
    grid * 0.6,
    grid * 0.45
  );
  grad.addColorStop(0, "#FFE5A8");
  grad.addColorStop(0.6, "#F39642");
  grad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, grid, grid);

  // flame shape
  ctx.fillStyle = "#D72B16";
  ctx.beginPath();
  ctx.moveTo(grid * 0.5, grid * 0.15);
  ctx.bezierCurveTo(
    grid * 0.8,
    grid * 0.25,
    grid * 0.75,
    grid * 0.65,
    grid * 0.5,
    grid * 0.85
  );
  ctx.bezierCurveTo(
    grid * 0.25,
    grid * 0.65,
    grid * 0.2,
    grid * 0.25,
    grid * 0.5,
    grid * 0.15
  );
  ctx.fill();

  return canvas;
};

export const drawWheels = (grid) => {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  canvas.width = canvas.height = grid;

  // wheel body
  ctx.fillStyle = "#333";
  ctx.beginPath();
  ctx.arc(grid * 0.5, grid * 0.5, grid * 0.32, 0, Math.PI * 2);
  ctx.fill();

  // spokes
  ctx.strokeStyle = "#ddd";
  ctx.lineWidth = Math.max(2, grid * 0.05);
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI * 2) / 6;
    ctx.beginPath();
    ctx.moveTo(grid * 0.5, grid * 0.5);
    ctx.lineTo(
      grid * 0.5 + Math.cos(angle) * grid * 0.28,
      grid * 0.5 + Math.sin(angle) * grid * 0.28
    );
    ctx.stroke();
  }

  // rim
  ctx.strokeStyle = "#888";
  ctx.lineWidth = Math.max(2, grid * 0.04);
  ctx.beginPath();
  ctx.arc(grid * 0.5, grid * 0.5, grid * 0.32, 0, Math.PI * 2);
  ctx.stroke();

  return canvas;
};

// removed duplicate drawFire and drawWheels definitions

