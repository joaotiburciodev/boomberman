import { Bomb } from "./bomb.js";
// player character (just a simple circle)
const playerImage = new Image();
playerImage.src = "./static/images/player-sprites.png";
const numFrames = 4; // Número total de quadros na imagem sprite
const frameWidth = 20; // Largura de cada quadro
let currentFrame = 0; // Quadro atual exibido
let animationFrameDelay = 40;
const moves = [
  { row: 0, col: -1, direction: "left" }, // Esquerda
  { row: -1, col: 0, direction: "up" }, // Cima
  { row: 0, col: 1, direction: "right" }, // Direita
  { row: 1, col: 0, direction: "down" }, // Baixo
];

function isValidMove(row, col, gameData) {
  // posição válida se dentro dos limites e célula vazia ou power-up coletável
  if (
    row < 0 ||
    row >= gameData.canvas.numRows ||
    col < 0 ||
    col >= gameData.canvas.numCols
  )
    return false;
  const cell = gameData.canvas.cells[row][col];
  return (
    !cell ||
    cell === gameData.canvas.tileTypes.bombPlus ||
    cell === gameData.canvas.tileTypes.fire ||
    cell === gameData.canvas.tileTypes.wheels
  );
}

function PlayerAI(gameData, opts = {}) {
  this.looking = "down";
  this.row = Number.isInteger(opts.row) ? opts.row : 11;
  this.col = Number.isInteger(opts.col) ? opts.col : 13;
  this.numBombs = 1;
  this.bombsPlaced = 0;
  this.bombSize = 2;
  this.radius = gameData.canvas.grid * 0.35;
  this.life = 1;
  this.scale = gameData.canvas.grid * 0.042;
  this.speed = 1; // tiles per AI tick step
  // Internal state
  this._path = []; // queued path of grid steps {row,col}
  this._evading = false; // whether we're currently escaping danger
  this._lastTarget = null; // target soft wall selected
  this._dangerCache = null; // cached danger map for current tick
  this._plantCooldown = 0; // small cooldown to avoid spamming placeBomb logic
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

  this._safeOk = function (gd, row, col, minSafeMs) {
    const t = (this._dangerCache || this._computeDangerMap(gd)).times.get(`${row},${col}`);
    return t === undefined || t > minSafeMs;
  };

  this._playerEscapeDegree = function (gd, minSafeMs) {
    if (!gd.player) return 0;
    const pr = gd.player.row;
    const pc = gd.player.col;
    let count = 0;
    for (const m of moves) {
      const r = pr + m.row;
      const c = pc + m.col;
      if (this._isCellPassable(r, c, gd) && this._safeOk(gd, r, c, minSafeMs)) count++;
    }
    return count;
  };

  this._findPowerUpPath = function (gd, minSafeMs) {
    // Find nearest safe path to any visible power-up tile
    const candidates = [];
    for (let r = 0; r < gd.canvas.numRows; r++) {
      for (let c = 0; c < gd.canvas.numCols; c++) {
        const cell = gd.canvas.cells[r][c];
        if (
          cell === gd.canvas.tileTypes.bombPlus ||
          cell === gd.canvas.tileTypes.fire ||
          cell === gd.canvas.tileTypes.wheels
        ) {
          candidates.push({ row: r, col: c });
        }
      }
    }
    if (candidates.length === 0) return null;
    let best = null;
    let bestLen = Infinity;
    // prefer destinations with higher degree (less likely dead-ends)
    let bestDeg = -1;
    for (const dest of candidates) {
      const path = this._safeBfsTo(gd, { row: this.row, col: this.col }, dest, minSafeMs);
      if (!path) continue;
      const deg = this._degree(dest.row, dest.col, gd);
      if (deg > bestDeg || (deg === bestDeg && path.length < bestLen)) {
        bestDeg = deg;
        bestLen = path.length;
        best = path;
      }
    }
    return best;
  };

  this._safeBfsTo = function (gd, start, goal, minSafeMs) {
    const danger = this._dangerCache || this._computeDangerMap(gd);
    const q = [];
    const key = (p) => `${p.row},${p.col}`;
    const came = new Map();
    const seen = new Set();
    const ok = (r, c) => {
      const t = danger.times.get(`${r},${c}`);
      return t === undefined || t > minSafeMs;
    };
    if (!ok(start.row, start.col)) return null;
    q.push(start);
    seen.add(key(start));
    while (q.length) {
      const cur = q.shift();
      if (cur.row === goal.row && cur.col === goal.col) {
        const path = [];
        let k = key(cur);
        let node = cur;
        while (k) {
          path.push(node);
          k = came.get(k);
          if (!k) break;
          const [r, c] = k.split(",").map(Number);
          node = { row: r, col: c };
        }
        return path.reverse();
      }
      for (const nb of this._neighbors(cur.row, cur.col, gd)) {
        if (!ok(nb.row, nb.col)) continue;
        const nk = key(nb);
        if (seen.has(nk)) continue;
        seen.add(nk);
        came.set(nk, key(cur));
        q.push(nb);
      }
    }
    return null;
  };
  this.move = function () {
    // Decrement small internal cooldowns
    if (this._plantCooldown > 0) this._plantCooldown--;
    // rebuild danger map each AI tick
    this._dangerCache = this._computeDangerMap(gameData);

    // If standing on a power-up, collect it
    const here = gameData.canvas.cells[this.row][this.col];
    if (here === gameData.canvas.tileTypes.bombPlus) {
      this.numBombs += 1;
      gameData.canvas.cells[this.row][this.col] = undefined;
    } else if (here === gameData.canvas.tileTypes.fire) {
      this.bombSize += 1;
      gameData.canvas.cells[this.row][this.col] = undefined;
    } else if (here === gameData.canvas.tileTypes.wheels) {
      this.speed = Math.min(3, (this.speed || 1) + 1);
      gameData.canvas.cells[this.row][this.col] = undefined;
    }

    // 1) Evade if in danger or a bomb will soon explode here
    const hereKey = `${this.row},${this.col}`;
    const dangerHere = this._dangerCache.times.get(hereKey);
    if (dangerHere !== undefined && dangerHere <= 1200) {
      this._evading = true;
      const safePath = this._findSafeSpot(gameData, 0);
      if (safePath && safePath.length > 1) {
        this._path = safePath.slice(1); // skip current
        this._stepAlongPath(gameData);
        return;
      }
      // fallback random jitter if no safe path found
      this.makeRandomMove();
      return;
    }

    // 1.5) Power-up prioritization: if a safe path to a visible power-up exists, go for it
    const powerUpPath = this._findPowerUpPath(gameData, 800);
    if (powerUpPath && powerUpPath.length > 1) {
      this._path = powerUpPath.slice(1);
      this._stepAlongPath(gameData);
      return;
    }

    // 2) Chase player if reachable safely; attempt trap
    const player = gameData.player;
    if (player) {
      // If adjacent to player, try to plant a bomb with escape
      const adjToPlayer = Math.abs(this.row - player.row) + Math.abs(this.col - player.col) === 1;
      if (adjToPlayer && this._canEscapeAfterPlant(gameData) && this._plantCooldown === 0) {
        this.placeBomb();
        this._plantCooldown = 10;
        const escapePath = this._findSafeSpot(gameData, 1);
        if (escapePath && escapePath.length > 1) {
          this._path = escapePath.slice(1);
          this._evading = true;
        }
        return;
      }

      // Otherwise move toward a tile adjacent to the player (avoid imminent danger)
      const adjTargetsAll = moves
        .map((m) => ({ row: player.row + m.row, col: player.col + m.col }))
        .filter((p) => this._isCellPassable(p.row, p.col, gameData));
      // Prefer tiles with multiple exits (avoid dead-ends), fallback to any
      const adjTargets = adjTargetsAll.filter((p) => this._degree(p.row, p.col, gameData) >= 2);
      const adjList = adjTargets.length ? adjTargets : adjTargetsAll;
      let bestPathToPlayer = null;
      let bestLenToPlayer = Infinity;
      let bestCornerScore = Infinity;
      for (const p of adjList) {
        const path = this._safeBfsTo(gameData, { row: this.row, col: this.col }, p, 800);
        if (!path) continue;
        // Cornering heuristic: number of safe exits the player has if we occupy p (reduce by 1 if p is an exit)
        const playerDeg = this._playerEscapeDegree(gameData, 800);
        const pIsExit = (Math.abs(player.row - p.row) + Math.abs(player.col - p.col)) === 1;
        const cornerScore = playerDeg - (pIsExit ? 1 : 0);
        if (
          cornerScore < bestCornerScore ||
          (cornerScore === bestCornerScore && path.length < bestLenToPlayer)
        ) {
          bestCornerScore = cornerScore;
          bestLenToPlayer = path.length;
          bestPathToPlayer = path;
        }
      }
      if (bestPathToPlayer && bestPathToPlayer.length > 1) {
        this._path = bestPathToPlayer.slice(1);
        this._stepAlongPath(gameData);
        return;
      }
    }

    // 3) If we have an escape path after planting, and near a target (soft wall), plant a bomb
    // Refresh target if none or not reachable
    if (!this._lastTarget || !this._isReachable(gameData, this._lastTarget)) {
      this._lastTarget = this._selectSoftWallTarget(gameData);
      this._path = [];
    }

    // If next to soft wall and can escape, plant
    if (this._lastTarget && this._isAdjacentTo(this._lastTarget)) {
      if (this._canEscapeAfterPlant(gameData) && this._plantCooldown === 0) {
        this.placeBomb();
        this._plantCooldown = 10; // avoid immediate re-check spam
        // Immediately set escape route
        const escapePath = this._findSafeSpot(gameData, 1);
        if (escapePath && escapePath.length > 1) {
          this._path = escapePath.slice(1);
          this._evading = true;
        }
        return;
      }
    }

    // 4) Navigate towards target
    if (this._path.length === 0) {
      // compute new path either to target or to a soft-wall-adjacent tile
      let dest = null;
      if (this._lastTarget) {
        // choose an adjacent passable tile next to the soft wall
        const adjAll = moves
          .map((m) => ({ row: this._lastTarget.row + m.row, col: this._lastTarget.col + m.col }))
          .filter((p) => this._isCellPassable(p.row, p.col, gameData));
        const adj = adjAll.filter((p) => this._degree(p.row, p.col, gameData) >= 2);
        const adjList = adj.length ? adj : adjAll;
        // pick nearest by BFS path length
        let best = null;
        let bestLen = Infinity;
        adjList.forEach((p) => {
          const path = this._bfsPath(gameData, { row: this.row, col: this.col }, p);
          if (path && path.length < bestLen) {
            best = path;
            bestLen = path.length;
          }
        });
        if (best) this._path = best.slice(1); // skip current
        else this._path = [];
      }
    }
    if (this._path.length > 0) {
      this._stepAlongPath(gameData);
      return;
    }
    // 5) Fallback behavior
    this.makeSmartMove();
  };
  this.makeRandomMove = function () {
    // Escolhe um movimento aleatório
    const randomMove = moves[Math.floor(Math.random() * moves.length)];

    // Verifica se o movimento é válido antes de aplicá-lo
    const newRow = this.row + randomMove.row;
    const newCol = this.col + randomMove.col;
    if (isValidMove(newRow, newCol, gameData)) {
      this.row = newRow;
      this.col = newCol;
      this.looking = randomMove.direction;
    }
  };
  this.makeSmartMove = function () {
    // Minimal fallback: bias towards nearest soft wall while respecting passability
    const nearestSoftWall = this.findNearestSoftWall();
    if (!nearestSoftWall) return;
    const step = this.calculateMoveTowards(nearestSoftWall.row, nearestSoftWall.col);
    if (isValidMove(this.row + step.row, this.col + step.col, gameData)) {
      this.row += step.row;
      this.col += step.col;
      this.looking = step.direction;
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

    // Verifica se a posição não está na rota de uma explosão (perigo imediato)
    const danger = this._dangerCache || this._computeDangerMap(gameData);
    const key = `${row},${col}`;
    const t = danger.times.get(key);
    if (t !== undefined && t <= 1200) return false;

    return true;
  };
  this.isInExplosionPath = function (row, col) {
    // Backward-compat shim; uses computed danger map
    const danger = this._dangerCache || this._computeDangerMap(gameData);
    return danger.times.has(`${row},${col}`);
  };

  // --- AI helpers ---
  this._isCellPassable = function (row, col, gd) {
    if (
      row < 0 || row >= gd.canvas.numRows || col < 0 || col >= gd.canvas.numCols
    )
      return false;
    const cell = gd.canvas.cells[row][col];
    // passable if empty or power-up
    return (
      !cell ||
      cell === gd.canvas.tileTypes.bombPlus ||
      cell === gd.canvas.tileTypes.fire ||
      cell === gd.canvas.tileTypes.wheels
    );
  };

  this._neighbors = function (row, col, gd) {
    const out = [];
    for (const m of moves) {
      const r = row + m.row;
      const c = col + m.col;
      if (this._isCellPassable(r, c, gd)) out.push({ row: r, col: c });
    }
    return out;
  };

  this._degree = function (row, col, gd) {
    // Number of passable neighbors (used to avoid dead-ends)
    let count = 0;
    for (const m of moves) {
      const r = row + m.row;
      const c = col + m.col;
      if (this._isCellPassable(r, c, gd)) count++;
    }
    return count;
  };

  this._bfsPath = function (gd, start, goal) {
    const q = [];
    const key = (p) => `${p.row},${p.col}`;
    const came = new Map();
    const seen = new Set();
    q.push(start);
    seen.add(key(start));
    while (q.length) {
      const cur = q.shift();
      if (cur.row === goal.row && cur.col === goal.col) {
        // reconstruct
        const path = [];
        let k = key(cur);
        let node = cur;
        while (k) {
          path.push(node);
          k = came.get(k);
          if (!k) break;
          const [r, c] = k.split(",").map(Number);
          node = { row: r, col: c };
        }
        return path.reverse();
      }
      for (const nb of this._neighbors(cur.row, cur.col, gd)) {
        const nk = key(nb);
        if (seen.has(nk)) continue;
        seen.add(nk);
        came.set(nk, key(cur));
        q.push(nb);
      }
    }
    return null;
  };

  this._computeDangerMap = function (gd) {
    // Compute earliest detonation time for each bomb including chain reactions.
    const bombs = gd.entities.filter((e) => e.type === gd.canvas.tileTypes.bomb);
    const effTime = new Map(); // bomb -> time
    bombs.forEach((b) => effTime.set(b, Math.max(0, b.timer)));
    let changed = true;
    while (changed) {
      changed = false;
      for (const a of bombs) {
        for (const b of bombs) {
          if (a === b) continue;
          const ta = effTime.get(a);
          const tb = effTime.get(b);
          // a can trigger b if b is in a's blast line and unobstructed, and ta < tb
          if (ta < tb && this._canBombAHitB(gd, a, b)) {
            effTime.set(b, ta);
            changed = true;
          }
        }
      }
    }

    // Build tile danger times from effective bomb times
    const times = new Map(); // key => ms until explosion (min over bombs)
    const dirs = [
      { row: -1, col: 0 },
      { row: 1, col: 0 },
      { row: 0, col: -1 },
      { row: 0, col: 1 },
    ];
    for (const b of bombs) {
      const t = effTime.get(b);
      const centerKey = `${b.row},${b.col}`;
      const prev = times.get(centerKey);
      times.set(centerKey, prev === undefined ? t : Math.min(prev, t));
      dirs.forEach((d) => {
        for (let i = 1; i <= b.size - 1; i++) {
          const r = b.row + d.row * i;
          const c = b.col + d.col * i;
          if (
            r < 0 ||
            r >= gd.canvas.numRows ||
            c < 0 ||
            c >= gd.canvas.numCols
          )
            break;
          const cell = gd.canvas.cells[r][c];
          if (cell === gd.canvas.tileTypes.wall) break;
          const k = `${r},${c}`;
          const pv = times.get(k);
          times.set(k, pv === undefined ? t : Math.min(pv, t));
          if (cell === gd.canvas.tileTypes.softWall) break; // soft walls stop
        }
      });
    }
    return { times };
  };

  this._canBombAHitB = function (gd, a, b) {
    if (a.row === b.row) {
      const dc = b.col - a.col;
      const dir = Math.sign(dc);
      if (dir === 0) return true; // same cell
      if (Math.abs(dc) >= a.size) return false;
      // check path clear until b
      for (let c = a.col + dir; c !== b.col + dir; c += dir) {
        const cell = gd.canvas.cells[a.row][c];
        if (cell === gd.canvas.tileTypes.wall) return false;
        if (cell === gd.canvas.tileTypes.softWall && c !== b.col) return false;
        if (c === b.col) return true;
      }
    } else if (a.col === b.col) {
      const dr = b.row - a.row;
      const dir = Math.sign(dr);
      if (dir === 0) return true;
      if (Math.abs(dr) >= a.size) return false;
      for (let r = a.row + dir; r !== b.row + dir; r += dir) {
        const cell = gd.canvas.cells[r][a.col];
        if (cell === gd.canvas.tileTypes.wall) return false;
        if (cell === gd.canvas.tileTypes.softWall && r !== b.row) return false;
        if (r === b.row) return true;
      }
    }
    return false;
  };

  this._findSafeSpot = function (gd, minStepsAway) {
    // BFS from current position for first tile with no imminent danger
    const start = { row: this.row, col: this.col };
    const key = (p) => `${p.row},${p.col}`;
    const danger = this._dangerCache || this._computeDangerMap(gd);
    const q = [];
    const seen = new Set([key(start)]);
    const came = new Map();
    q.push(start);
    while (q.length) {
      const cur = q.shift();
      const k = key(cur);
      const t = danger.times.get(k);
      const dist = this._distanceFromStart(came, k);
      const safe = t === undefined || t > 1200; // safe if no blast or far in future
      if (safe && dist >= minStepsAway) {
        // reconstruct
        const path = [];
        let kk = k;
        let node = cur;
        while (kk) {
          path.push(node);
          kk = came.get(kk);
          if (!kk) break;
          const [r, c] = kk.split(",").map(Number);
          node = { row: r, col: c };
        }
        return path.reverse();
      }
      for (const nb of this._neighbors(cur.row, cur.col, gd)) {
        const nk = key(nb);
        if (seen.has(nk)) continue;
        seen.add(nk);
        came.set(nk, k);
        q.push(nb);
      }
    }
    return null;
  };

  this._distanceFromStart = function (came, k) {
    // reconstruct distance
    let d = 0;
    let cur = k;
    while (came.get(cur)) {
      d++;
      cur = came.get(cur);
    }
    return d;
  };

  this._selectSoftWallTarget = function (gd) {
    // Choose nearest soft wall that is reachable to an adjacent tile
    let best = null;
    let bestLen = Infinity;
    for (let r = 0; r < gd.canvas.numRows; r++) {
      for (let c = 0; c < gd.canvas.numCols; c++) {
        if (gd.canvas.cells[r][c] !== gd.canvas.tileTypes.softWall) continue;
        // pick an adjacent passable
        for (const m of moves) {
          const ar = r + m.row;
          const ac = c + m.col;
          if (!this._isCellPassable(ar, ac, gd)) continue;
          const path = this._bfsPath(gd, { row: this.row, col: this.col }, { row: ar, col: ac });
          if (path) {
            const len = path.length;
            if (len < bestLen) {
              bestLen = len;
              best = { row: r, col: c };
            }
          }
        }
      }
    }
    return best;
  };

  this._isReachable = function (gd, target) {
    // any adjacent passable tile reachable?
    return moves.some((m) => {
      const ar = target.row + m.row;
      const ac = target.col + m.col;
      if (!this._isCellPassable(ar, ac, gd)) return false;
      const p = this._bfsPath(gd, { row: this.row, col: this.col }, { row: ar, col: ac });
      return !!p;
    });
  };

  this._isAdjacentTo = function (pos) {
    return (
      (Math.abs(this.row - pos.row) + Math.abs(this.col - pos.col)) === 1
    );
  };

  this._canEscapeAfterPlant = function (gd) {
    // Simulate planting a bomb here and see if we can find a safe tile in time
    if (this.bombsPlaced === this.numBombs) return false;
    // approximate: current bombs explode in their timers; our bomb explodes in 3000ms
    // We consider safe if there exists a path to a tile not in our future blast path.
    const tempDanger = this._computeDangerMap(gd);
    // add our bomb's blast to danger map with t=3000
    const dirs = [
      { row: -1, col: 0 },
      { row: 1, col: 0 },
      { row: 0, col: -1 },
      { row: 0, col: 1 },
    ];
    const addTime = (r, c, t) => {
      const k = `${r},${c}`;
      const pv = tempDanger.times.get(k);
      tempDanger.times.set(k, pv === undefined ? t : Math.min(pv, t));
    };
    addTime(this.row, this.col, 3000);
    dirs.forEach((d) => {
      for (let i = 1; i <= this.bombSize - 1; i++) {
        const r = this.row + d.row * i;
        const c = this.col + d.col * i;
        if (
          r < 0 || r >= gd.canvas.numRows || c < 0 || c >= gd.canvas.numCols
        )
          break;
        const cell = gd.canvas.cells[r][c];
        if (cell === gd.canvas.tileTypes.wall) break;
        addTime(r, c, 3000);
        if (cell === gd.canvas.tileTypes.softWall) break;
      }
    });
    // now search for a tile whose tempDanger time is undefined or > 1200
    // but we also want to ensure we can get out quickly; use BFS from current position
    const start = { row: this.row, col: this.col };
    const key = (p) => `${p.row},${p.col}`;
    const q = [];
    const seen = new Set([key(start)]);
    const dist = new Map([[key(start), 0]]);
    q.push(start);
    while (q.length) {
      const cur = q.shift();
      const k = key(cur);
      const steps = dist.get(k);
      const t = tempDanger.times.get(k);
      const safe = t === undefined || t > 1200;
      if (safe && steps > 0) return true; // found an escape tile
      for (const nb of this._neighbors(cur.row, cur.col, gd)) {
        const nk = key(nb);
        if (seen.has(nk)) continue;
        seen.add(nk);
        dist.set(nk, steps + 1);
        q.push(nb);
      }
    }
    return false;
  };

  this._stepAlongPath = function (gd) {
    if (this._path.length === 0) return;
    const next = this._path.shift();
    const dRow = next.row - this.row;
    const dCol = next.col - this.col;
    if (!this._isCellPassable(next.row, next.col, gd)) return; // path blocked
    this.row = next.row;
    this.col = next.col;
    if (dRow === -1) this.looking = "up";
    else if (dRow === 1) this.looking = "down";
    else if (dCol === -1) this.looking = "left";
    else if (dCol === 1) this.looking = "right";
  };
}
export default PlayerAI;

