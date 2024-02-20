import { Bomb } from "./bomb.js";
// player character (just a simple circle)
const playerImage = new Image();
playerImage.src = "./static/images/player-sprites.png";
const numFrames = 4; // Número total de quadros na imagem sprite
const frameWidth = 20; // Largura de cada quadro
let currentFrame = 0; // Quadro atual exibido
let animationFrameDelay = 40;

function isValidMove(row, col, gameData) {
  // Adicione lógica aqui para verificar se a posição é válida (por exemplo, não colidir com paredes)
  return (
    row >= 0 &&
    row < gameData.canvas.numRows &&
    col >= 0 &&
    col < gameData.canvas.numCols &&
    !gameData.canvas.cells[row][col]
  );
}

function PlayerAI(gameData) {
  this.looking = "down";
  this.row = 11;
  this.col = 13;
  this.numBombs = 1;
  this.bombsPlaced = 0;
  this.bombSize = 2;
  this.radius = gameData.canvas.grid * 0.35;
  this.life = 1;
  this.scale = gameData.canvas.grid * 0.042;
  this.render = function () {
    const x = (this.col + 0.5) * gameData.canvas.grid;
    const y = (this.row + 0.5) * gameData.canvas.grid;

    // Determina o índice do sprite com base na direção do jogador
    let spriteIndex;
    switch (this.looking) {
      case "up":
        spriteIndex = numFrames + currentFrame;
        break;
      case "down":
        spriteIndex = currentFrame;
        break;
      case "left":
        spriteIndex = 3 * numFrames + currentFrame;
        break;
      case "right":
        spriteIndex = 2 * numFrames + currentFrame;
        break;
      default:
        spriteIndex = currentFrame;
    }

    gameData.canvas.context.save();
    gameData.canvas.context.drawImage(
      playerImage,
      spriteIndex * frameWidth,
      0,
      frameWidth,
      25,
      x - (frameWidth / 2) * this.scale,
      y - (25 / 2) * this.scale,
      frameWidth * this.scale,
      25 * this.scale
    );

    animationFrameDelay--;
    if (animationFrameDelay <= 0) {
      currentFrame = (currentFrame + 1) % numFrames;
      animationFrameDelay = 40;
    }

    gameData.canvas.context.restore();
  };
  this.move = function () {
    const moves = [
      { row: 0, col: -1, direction: "left" }, // Esquerda
      { row: -1, col: 0, direction: "up" }, // Cima
      { row: 0, col: 1, direction: "right" }, // Direita
      { row: 1, col: 0, direction: "down" }, // Baixo
    ];

    // Verifica se há um bloco quebrável nas proximidades
    for (const move of moves) {
      const newRow = this.row + move.row;
      const newCol = this.col + move.col;

      if (
        newRow >= 0 &&
        newRow < gameData.canvas.numRows &&
        newCol >= 0 &&
        newCol < gameData.canvas.numCols &&
        gameData.canvas.cells[newRow][newCol] ===
          gameData.canvas.tileTypes.softWall
      ) {
        // Coloca uma bomba se houver um bloco quebrável nas proximidades
        this.placeBomb();
        return;
      }
    }
    this.makeSmartMove();
  };
  this.makeRandomMove = function () {
    const moves = [
      { row: 0, col: -1, direction: "left" }, // Esquerda
      { row: -1, col: 0, direction: "up" }, // Cima
      { row: 0, col: 1, direction: "right" }, // Direita
      { row: 1, col: 0, direction: "down" }, // Baixo
    ];

    // Escolhe um movimento aleatório
    const randomMove = moves[Math.floor(Math.random() * moves.length)];

    // Verifica se o movimento é válido antes de aplicá-lo
    const newRow = this.row + randomMove.row;
    const newCol = this.col + randomMove.col;
    this.looking = randomMove.direction;
    if (isValidMove(newRow, newCol, gameData)) {
      this.row = newRow;
      this.col = newCol;
    }
  };
  this.makeSmartMove = function () {
    const nearestSoftWall = this.findNearestSoftWall();
    if (nearestSoftWall) {
      const move = this.calculateMoveTowards(
        nearestSoftWall.row,
        nearestSoftWall.col
      );
      // Verifica se é possível mover nesta direção antes de aplicar o movimento
      if (isValidMove(this.row + move.row, this.col + move.col, gameData)) {
        this.row += move.row;
        this.col += move.col;
        this.looking = move.direction;
        // Verifica se está em uma posição segura antes de colocar a bomba
        if (this.isSafePosition(this.row, this.col)) {
          this.placeBomb();
        }
      } else this.makeRandomMove();
    }
  };
  this.placeBomb = function () {
    // Adicione lógica para verificar se é possível colocar uma bomba
    // (por exemplo, se o número de bombas já colocadas é menor que o limite)
    if (this.bombsPlaced === this.numBombs) return;
    const bomb = new Bomb(this.row, this.col, this.bombSize, this, gameData);
    this.bombsPlaced++;
    gameData.entities.push(bomb);
    gameData.canvas.cells[this.row][this.col] = gameData.canvas.tileTypes.bomb;
  };

  this.findNearestSoftWall = function () {
    let nearestSoftWall = null;
    let minDistance = Infinity;

    for (let row = 0; row < gameData.canvas.numRows; row++) {
      for (let col = 0; col < gameData.canvas.numCols; col++) {
        if (
          gameData.canvas.cells[row][col] === gameData.canvas.tileTypes.softWall
        ) {
          const distance = Math.abs(this.row - row) + Math.abs(this.col - col);

          if (distance < minDistance) {
            minDistance = distance;
            nearestSoftWall = { row, col };
          }
        }
      }
    }

    return nearestSoftWall;
  };

  this.calculateMoveTowards = function (targetRow, targetCol) {
    const rowDiff = targetRow - this.row;
    const colDiff = targetCol - this.col;

    if (Math.abs(rowDiff) > Math.abs(colDiff)) {
      let direction = Math.sign(rowDiff) >= 0 ? "down" : "up";
      return { row: Math.sign(rowDiff), col: 0, direction };
    } else {
      let direction = Math.sign(colDiff) >= 0 ? "right" : "left";
      return { row: 0, col: Math.sign(colDiff), direction };
    }
  };
  this.isSafePosition = function (row, col) {
    // Verifica se a posição está dentro dos limites do grid
    if (
      row < 0 ||
      row >= gameData.canvas.numRows ||
      col < 0 ||
      col >= gameData.canvas.numCols
    ) {
      return false;
    }

    // Verifica se a posição não está em uma parede ou bloco quebrável
    if (
      gameData.canvas.cells[row][col] === gameData.canvas.tileTypes.wall ||
      gameData.canvas.cells[row][col] === gameData.canvas.tileTypes.softWall
    ) {
      return false;
    }

    // Verifica se a posição não está na rota de uma explosão
    if (this.isInExplosionPath(row, col)) {
      return false;
    }

    return true;
  };
  this.isInExplosionPath = function (row, col) {
    // Verifica se a posição está na rota de uma explosão
    // Isso pode depender da lógica específica de como você está rastreando as explosões

    // Exemplo simples: verifica se há uma explosão nas proximidades (à esquerda, acima, à direita, abaixo)
    const explosionRadius = 2; // Adapte conforme necessário
    for (
      let i = Math.max(0, row - explosionRadius);
      i <= Math.min(gameData.canvas.numRows - 1, row + explosionRadius);
      i++
    ) {
      for (
        let j = Math.max(0, col - explosionRadius);
        j <= Math.min(gameData.canvas.numCols - 1, col + explosionRadius);
        j++
      ) {
        if (gameData.canvas.cells[i][j] === gameData.canvas.tileTypes.bomb) {
          return true;
        }
      }
    }

    return false;
  };
}
export default PlayerAI;
