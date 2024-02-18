// player character (just a simple circle)
const playerImage = new Image();
playerImage.src = "./pixilart-sprite.png";
const numFrames = 6; // Número total de quadros na imagem sprite
const frameWidth = 20; // Largura de cada quadro
let currentFrame = 0; // Quadro atual exibido
let animationFrameDelay = 40;

function Player(gameData) {
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
    gameData.canvas.context.save();
    gameData.canvas.context.drawImage(
      playerImage,
      currentFrame * frameWidth,
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
