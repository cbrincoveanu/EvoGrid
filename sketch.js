let speedLabel;
let speedSlider;
let speedValueDisplay;
let grid;
let aliveCount;
let maxEnergy;
let aliveCountDisplay;
let maxEnergyDisplay;
const gridSize = 72;
const cellSize = 8;

function setup() {
  createCanvas(gridSize * cellSize, gridSize * cellSize);
  speedLabel = createDiv('Simulation Speed: ');
  speedLabel.position(10, gridSize * cellSize + 10);
  speedSlider = createSlider(1, 60, 60);
  speedSlider.position(10, speedLabel.y + speedLabel.height);
  speedSlider.style('width', '480px');
  speedValueDisplay = createSpan(speedSlider.value());
  speedValueDisplay.position(speedSlider.x + speedSlider.width + 10, speedSlider.y);
  aliveCountDisplay = createSpan("Alive count:");
  aliveCountDisplay.position(10, speedSlider.y + speedSlider.height + 5);
  maxEnergyDisplay = createSpan("Max energy:");
  maxEnergyDisplay.position(10, aliveCountDisplay.y + aliveCountDisplay.height + 5);
  grid = new Grid(gridSize, gridSize);
  grid.initialize();
}

function draw() {
  background(220);
  speedValueDisplay.html(speedSlider.value());
  frameRate(speedSlider.value());
  grid.update();
  grid.display();
  aliveCountDisplay.html("Alive count: " + aliveCount);
  maxEnergyDisplay.html("Max energy: " + maxEnergy);
}

class Grid {
  constructor(rows, cols) {
    this.rows = rows;
    this.cols = cols;
    this.cells = [];
  }

  initialize() {
    for (let i = 0; i < this.rows; i++) {
      this.cells[i] = [];
      for (let j = 0; j < this.cols; j++) {
        if (i === 0 || j === 0 || i === this.rows - 1 || j === this.cols - 1) {
          this.cells[i][j] = new Wall(i, j);
        } else {
          let centerDist = Math.sqrt(Math.pow(i - this.rows / 2, 2) + Math.pow(j - this.cols / 2, 2));
          let centerFactor = centerDist / Math.sqrt(Math.pow(this.rows / 2, 2) + Math.pow(this.cols / 2, 2));
          let p = Math.abs(0.5 - centerFactor);
          p = Math.pow(p, 1.5);
          if (random(1) < p) {
            this.cells[i][j] = new Wall(i, j);
          } else if (random(1) > 0.8) {
            this.cells[i][j] = new Organism(i, j);
          } else {
            this.cells[i][j] = null;
          }
        }
      }
    }
    for (let i = 1; i < this.rows - 1; i++) {
      for (let j = 1; j < this.cols - 1; j++) {
        if (this.cells[i][j] === null && random(1) > 0.3) {
          this.cells[i][j] = new Plant(i, j);
        }
      }
    }
  }

  update() {
    // Randomly add plants
    if (random() < 0.8) {
      const x = floor(random(this.rows));
      const y = floor(random(this.cols));
      if (this.cells[x][y] === null) {
        this.cells[x][y] = new Plant(x, y);
      }
    }
    // Move bullets
    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < this.cols; j++) {
        if (this.cells[i][j] instanceof Bullet) {
          this.cells[i][j].move(this);
        }
      }
    }
    // Let each organism perceive the world and decide what to do.
    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < this.cols; j++) {
        if (this.cells[i][j] instanceof Organism) {
          this.cells[i][j].perceive(this);
        }
      }
    }
    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < this.cols; j++) {
        if (this.cells[i][j] instanceof Organism && !this.cells[i][j].acted) {
          this.cells[i][j].act(this);
        }
      }
    }
  }

  display() {
    maxEnergy = -Infinity;
    aliveCount = 0;
    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < this.cols; j++) {
        if (this.cells[i][j]) {
          this.cells[i][j].display();
          if (this.cells[i][j] instanceof Organism) {
            aliveCount++;
            maxEnergy = max(maxEnergy, this.cells[i][j].energy);
          }
        }
      }
    }
    if (aliveCount == 0) {
      this.initialize();
    }
  }
}

function turnVector(vector, times) {
  if (times > 0) {
    return turnVector(createVector(vector.y, -vector.x), times - 1);
  } else {
    return vector;
  }
}

class CellEntity {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  display() {
    fill(this.getColor());
    noStroke();
    rect(this.x * cellSize, this.y * cellSize, cellSize, cellSize);
  }
  
  getColor() {
    return [255, 255, 0];
  }
}

class Organism extends CellEntity {
  constructor(x, y) {
    super(x, y);
    this.energy = 500;
    this.size = 500;
    this.heading = createVector(1, 0);
    this.acted = false;
    this.brain = new NN(17, 8, 5, 8, 9);
    this.decisions = [];
    this.r = 0;
    this.g = 0;
    this.b = 255;
  }
  
  turn(decisions) {
    let maxIndex = 0;
    for (let i = 1; i < 4; i++) {
      if (decisions[i] > decisions[maxIndex]) {
        maxIndex = i;
      }
    }
    this.heading = turnVector(this.heading, maxIndex);
  }
  
  getColorAndDistance(grid, direction) {
    let dx = direction.x;
    let dy = direction.y;
    let posX = this.x;
    let posY = this.y;
    let distance = 1;
    while (true) {
      posX += dx;
      posY += dy;
      let cell = grid.cells[posY][posX];
      if (cell !== null) {
        let r, g, b, d;
        [r, g, b] = cell.getColor();
        r = r / 255;
        g = g / 255;
        b = b / 255;
        d = 1 / distance;
        return {r, g, b, d};
      }
      distance++;
    }
  }

  perceive(grid) {
    this.acted = false;
    let vision = [];
    const directions = [
      this.heading,
      turnVector(this.heading, 1),
      turnVector(this.heading, 2),
      turnVector(this.heading, 3)
    ];
    for (let dir of directions) {
      let info = this.getColorAndDistance(grid, dir);
      vision.push(info.r, info.g, info.b, info.d);
    }
    vision.push(Math.random());
    this.decisions = this.brain.predict(vision);
  }
  
  act(grid) {
    this.acted = true;
    let targetX = this.x + this.heading.x;
    let targetY = this.y + this.heading.y;
    if (this.decisions[5] > 0.5) {
      if (grid.cells[targetX][targetY] === null) {
        grid.cells[targetX][targetY] = new Earth(targetX, targetY);
      }
      this.energy -= 50;
    }
    if (this.decisions[6] > 0.5) {
      if (grid.cells[targetX][targetY] instanceof Earth) {
        grid.cells[targetX][targetY] = null;
      }
      this.energy -= 50;
    }
    if (this.decisions[7] > 0.5) {
      if (grid.cells[targetX][targetY] === null) {
        grid.cells[targetX][targetY] = new Bullet(targetX, targetY, this.heading);
      }
      this.energy -= 50;
    }
    this.turn(this.decisions);
    let newX = this.x;
    let newY = this.y;
    let oldX = this.x;
    let oldY = this.y;
    if (this.decisions[4] > 0.5) {
      newX += this.heading.x;
      newY += this.heading.y;
      this.energy--;
    }
    
    if (newX >= 0 && newX < grid.rows && newY >= 0 && newY < grid.cols) {
      if (grid.cells[newX][newY] === null) {
        grid.cells[this.x][this.y] = null;
        grid.cells[newX][newY] = this;
        this.x = newX;
        this.y = newY;
      } else if (grid.cells[newX][newY] instanceof Plant) {
        this.energy += 500;
        this.size += 500;
        grid.cells[this.x][this.y] = null;
        grid.cells[newX][newY] = this;
        this.x = newX;
        this.y = newY;
      } else if (grid.cells[newX][newY] instanceof DeadOrganism) {
        this.energy += 200;
        this.size += 200;
        grid.cells[this.x][this.y] = null;
        grid.cells[newX][newY] = this;
        this.x = newX;
        this.y = newY;
      }
      if (this.energy > 2000) {
        this.energy = this.energy - 500;
        grid.cells[oldX][oldY] = new Organism(oldX, oldY);
        grid.cells[oldX][oldY].energy = 500;
        grid.cells[oldX][oldY].brain = this.brain.getMutation(0.1);
        grid.cells[oldX][oldY].r = Math.min(Math.max(this.r + randomGaussian(0, 20), 0), 255);
        grid.cells[oldX][oldY].g = Math.min(Math.max(this.g + randomGaussian(0, 20), 0), 100);
        grid.cells[oldX][oldY].b = Math.min(Math.max(this.b + randomGaussian(0, 20), 150), 255);
      }
    }

    this.energy--;

    if (this.energy < 0) {
      grid.cells[this.x][this.y] = new DeadOrganism(this.x, this.y);
    }
  }
  
  getColor() {
    return [this.r, this.g, this.b];
  }
}

class Wall extends CellEntity {
  getColor() {
    return [0, 0, 0];
  }
}

class Earth extends CellEntity {
  getColor() {
    return [150, 100, 50];
  }
}

class Plant extends CellEntity {
  getColor() {
    return [0, 255, 0];
  }
}

class DeadOrganism extends CellEntity {
  getColor() {
    return [100, 100, 100];
  }
}

class Bullet extends CellEntity {
  constructor(x, y, heading) {
    super(x, y);
    this.heading = heading;
  }
  move(grid) {
    let newX = this.x + this.heading.x;
    let newY = this.y + this.heading.y;
    if (grid.cells[newX][newY] == null) {
      grid.cells[newX][newY] = new Bullet(newX, newY, this.heading);
    } else if (grid.cells[newX][newY] instanceof Organism) {
      grid.cells[newX][newY].energy -= 500;
    } else if (grid.cells[newX][newY] instanceof Plant) {
      grid.cells[newX][newY] = null;
    } else if (grid.cells[newX][newY] instanceof DeadOrganism) {
      grid.cells[newX][newY] = null;
    } else if (grid.cells[newX][newY] instanceof Bullet) {
      grid.cells[newX][newY] = null;
    }
    grid.cells[this.x][this.y] = null;
  }
  getColor() {
    return [255, 0, 0];
  }
}
