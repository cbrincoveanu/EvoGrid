let grid;
const gridSize = 45;
const cellSize = 12;

function setup() {
  createCanvas(gridSize * cellSize, gridSize * cellSize);
  grid = new Grid(gridSize, gridSize);
  // Initialize elements like walls, organisms, plants, etc.
  grid.initialize();
}

function draw() {
  background(220);
  grid.update();
  grid.display();
}

class Grid {
  constructor(rows, cols) {
    this.rows = rows;
    this.cols = cols;
    this.cells = [];
  }

  initialize() {
    // Initialize the grid elements like walls, organisms, plants, etc.
    for (let i = 0; i < this.rows; i++) {
      this.cells[i] = [];
      for (let j = 0; j < this.cols; j++) {
        // Create border walls
        if (i === 0 || j === 0 || i === this.rows - 1 || j === this.cols - 1) {
          this.cells[i][j] = new Wall(i, j);
        } else if (i % 2 == 0 && j % 2 == 0) {
          this.cells[i][j] = new Wall(i, j);
        } else {
          // Randomly place inner cells
          if (random(1) < 0.04) { // 4% chance to place a wall
            this.cells[i][j] = new Wall(i, j);
          } else if (random(1) < 0.15) { // 15% chance to place earth
            this.cells[i][j] = new Earth(i, j);
          } else if (random(1) > 0.95) { // 5% chance to place an organism
            this.cells[i][j] = new Organism(i, j);
          } else {
            this.cells[i][j] = null;
          }
        }
      }
    }
    // Randomly place plants
    for (let i = 1; i < this.rows - 1; i++) {
      for (let j = 1; j < this.cols - 1; j++) {
        if (this.cells[i][j] === null && random(1) > 0.9) { // 10% chance
          this.cells[i][j] = new Plant(i, j);
        }
      }
    }
  }

  update() {
    // Randomly add plants
    if (random() < 0.1) {
      const x = floor(random(this.rows));
      const y = floor(random(this.cols));
      if (this.cells[x][y] === null) {
        this.cells[x][y] = new Plant(x, y);
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
    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < this.cols; j++) {
        if (this.cells[i][j]) {
          this.cells[i][j].display();
        }
      }
    }
  }
}

function turnVector(vector, direction) {
  switch (direction) {
    case "left":
      return createVector(-vector.y, vector.x);
    case "right":
      return createVector(vector.y, -vector.x);
    case "backward":
      return createVector(-vector.x, -vector.y);
    default:
      return vector; // if no specific direction is given, retain the same heading
  }
}

class Organism {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.energy = 500;
    this.size = 500;
    this.heading = createVector(1, 0);
    this.acted = false;
  }
  
  turn() {
    const turnChoices = ["left", "right", "backward", "none"];
    const choice = floor(random(4)); 
    this.heading = turnVector(this.heading, turnChoices[choice]);
  }

  perceive(grid) {
    this.acted = false;
    this.turn();  // Randomly decide the new heading
  }
  
  act(grid) {
    this.acted = true;
    const newX = this.x + this.heading.x;
    const newY = this.y + this.heading.y;
    
    if (newX >= 0 && newX < grid.rows && newY >= 0 && newY < grid.cols) {
      if (grid.cells[newX][newY] === null) {
        grid.cells[this.x][this.y] = null;
        grid.cells[newX][newY] = this;
        this.x = newX;
        this.y = newY;
      } else if (grid.cells[newX][newY] instanceof Plant) {
        this.energy += 200;
        this.size += 200;
        grid.cells[this.x][this.y] = null;
        grid.cells[newX][newY] = this;
        this.x = newX;
        this.y = newY;
      } else if (grid.cells[newX][newY] instanceof DeadOrganism) {
        this.energy += 300;
        this.size += 300;
        grid.cells[this.x][this.y] = null;
        grid.cells[newX][newY] = this;
        this.x = newX;
        this.y = newY;
      }
    }

    this.energy--;

    if (this.energy < 0) {
      grid.cells[this.x][this.y] = new DeadOrganism(this.x, this.y);
    }
  }

  display() {
    fill(0, 0, 255); // Blue for organism
    noStroke();
    rect(this.x * cellSize, this.y * cellSize, cellSize, cellSize);
  }
}

class Wall {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  display() {
    fill(0); // Black for wall
    noStroke();
    rect(this.x * cellSize, this.y * cellSize, cellSize, cellSize);
  }
}

class Earth {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  display() {
    fill(150, 100, 50); // Brown for wall
    noStroke();
    rect(this.x * cellSize, this.y * cellSize, cellSize, cellSize);
  }
}

class Plant {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  display() {
    fill(0, 255, 0); // Green for plant
    noStroke();
    rect(this.x * cellSize, this.y * cellSize, cellSize, cellSize);
  }
}

class DeadOrganism {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  display() {
    fill(150); // Grey for dead organism
    noStroke();
    rect(this.x * cellSize, this.y * cellSize, cellSize, cellSize);
  }
}
