const playerImage = new Image();
playerImage.src = "./static/images/player-sprites.png";
const numFrames = 4; // Número total de quadros na imagem sprite
const frameWidth = 20; // Largura de cada quadro
let currentFrame = 0; // Quadro atual exibido
let animationFrameDelay = 40;

function Player(gameData) {
  this.looking = "down";
  this.row = 1;
  this.col = 1;
  this.numBombs = 1;
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
}

export default Player;
