// bomb constructor function
export function Bomb(row, col, size, owner, grid, context, blowUpBomb) {
  this.row = row;
  this.col = col;
  this.radius = grid * 0.2;
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
      return blowUpBomb(this);
    }

    // change the size of the bomb every half second. we can determine the size
    // by dividing by 500 (half a second) and taking the ceiling of the result.
    // then we can check if the result is even or odd and change the size
    const interval = Math.ceil(this.timer / 500);
    if (interval % 2 === 0) {
      this.radius = grid * 0.4;
    } else {
      this.radius = grid * 0.5;
    }
  };

  // render the bomb each frame
  this.render = function () {
    const x = (this.col + 0.5) * grid;
    const y = (this.row + 0.5) * grid;

    // draw bomb
    context.fillStyle = "black";
    context.beginPath();
    context.arc(x, y, this.radius * 0.7, 0, 2 * Math.PI);
    context.fill();

    // draw bomb fuse moving up and down with the bomb size
    const fuseY = this.radius === grid * 0.5 ? grid * 0.15 : 0;
    context.strokeStyle = "white";
    context.lineWidth = 5;
    context.beginPath();
    context.arc(
      (this.col + 0.75) * grid,
      (this.row + 0.3) * grid - fuseY,
      10,
      Math.PI,
      -Math.PI / 2
    );
    context.stroke();
  };
}
