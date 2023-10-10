let speedLabel;
let speedSlider;
let speedValueDisplay;
let grid;
let aliveCount;
let maxEnergy;
let aliveCountDisplay;
let maxEnergyDisplay;
const gridSize = 100;
const cellSize = 5;

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
    // Initialize the grid elements like walls, organisms, plants, etc.
    for (let i = 0; i < this.rows; i++) {
      this.cells[i] = [];
      for (let j = 0; j < this.cols; j++) {
        if (i === 0 || j === 0 || i === this.rows - 1 || j === this.cols - 1) {
          this.cells[i][j] = new Wall(i, j);
        } /* else if (i % 2 == 0 && j % 2 == 0) {
          this.cells[i][j] = new Wall(i, j);
        } */ else {
          // Randomly place inner cells
          let centerDist = Math.sqrt(Math.pow(i - this.rows / 2, 2) + Math.pow(j - this.cols / 2, 2));
          let centerFactor = centerDist / Math.sqrt(Math.pow(this.rows / 2, 2) + Math.pow(this.cols / 2, 2));
          let p = Math.abs(0.5 - centerFactor);
          p = Math.pow(p, 1.5);
          if (random(1) < p) {
            this.cells[i][j] = new Wall(i, j);
          } else if (random(1) < 0.0) { // 0% chance to place earth
            this.cells[i][j] = new Earth(i, j);
          } else if (random(1) > 0.8) { // 20% chance to place an organism
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
        if (this.cells[i][j] === null && random(1) > 0.5) { // 50% chance
          this.cells[i][j] = new Plant(i, j);
        }
      }
    }
  }

  update() {
    // Randomly add plants
    if (random() < 0.5) {
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

class Matrix {
    constructor(rows, cols) {
        this.rows = rows;
        this.cols = cols;
        this.data = Array(this.rows).fill().map(() => Array(this.cols).fill(0));
    }

    // Fill the matrix with random values
    randomize() {
        this.map(val => randomGaussian(0, 1));
    }

    // Apply a function to every element of the matrix
    map(func) {
        for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.cols; j++) {
                this.data[i][j] = func(this.data[i][j], i, j);
            }
        }
    }

    // Convert an array to a matrix
    static fromArray(arr) {
        let m = new Matrix(arr.length, 1);
        for (let i = 0; i < arr.length; i++) {
            m.data[i][0] = arr[i];
        }
        return m;
    }

    // Convert the matrix to an array
    toArray() {
        let arr = [];
        for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.cols; j++) {
                arr.push(this.data[i][j]);
            }
        }
        return arr;
    }

    // Add a matrix or a number to this matrix
    add(other) {
        if (other instanceof Matrix) {
            for (let i = 0; i < this.rows; i++) {
                for (let j = 0; j < this.cols; j++) {
                    this.data[i][j] += other.data[i][j];
                }
            }
        } else {
            this.map(val => val + other);
        }
    }

    // Multiply two matrices
    static multiply(a, b) {
        if (a.cols !== b.rows) {
            console.error('Columns of A must match rows of B.');
            return;
        }

        let result = new Matrix(a.rows, b.cols);
        for (let i = 0; i < result.rows; i++) {
            for (let j = 0; j < result.cols; j++) {
                let sum = 0;
                for (let k = 0; k < a.cols; k++) {
                    sum += a.data[i][k] * b.data[k][j];
                }
                result.data[i][j] = sum;
            }
        }
        return result;
    }
    static copy(a) {
        let result = new Matrix(a.rows, a.cols);
        for (let i = 0; i < result.rows; i++) {
            for (let j = 0; j < result.cols; j++) {
                result.data[i][j] = a.data[i][j];
            }
        }
        return result;
    }
}

class NeuralNetwork {
  constructor(input_nodes, hidden_nodes, output_nodes) {
    this.input_nodes = input_nodes;
    this.hidden_nodes = hidden_nodes;
    this.output_nodes = output_nodes;

    // Weight matrices and bias vectors
    this.weights_ih = new Matrix(this.hidden_nodes, this.input_nodes);
    this.weights_ho = new Matrix(this.output_nodes, this.hidden_nodes);
    this.bias_h = new Matrix(this.hidden_nodes, 1);
    this.bias_o = new Matrix(this.output_nodes, 1);

    // Initialize with random values
    this.weights_ih.randomize();
    this.weights_ho.randomize();
    this.bias_h.randomize();
    this.bias_o.randomize();
  }

  // The feed-forward algorithm
  predict(input_array) {
    let inputs = Matrix.fromArray(input_array);

    // Calculate the hidden outputs
    let hidden = Matrix.multiply(this.weights_ih, inputs);
    hidden.add(this.bias_h);
    hidden.map(sigmoid);

    // Calculate the output
    let output = Matrix.multiply(this.weights_ho, hidden);
    output.add(this.bias_o);
    output.map(sigmoid);

    return output.toArray();
  }
  
  getMutation(rate) {
    let clone = new NeuralNetwork(this.input_nodes, this.hidden_nodes, this.output_nodes);
    clone.weights_ih = Matrix.copy(this.weights_ih);
    clone.weights_ho = Matrix.copy(this.weights_ho);
    clone.bias_h = Matrix.copy(this.bias_h);
    clone.bias_o = Matrix.copy(this.bias_o);
    function mutateVal(val) {
      if (Math.random() < rate) {
        return val * 0.99 + randomGaussian(0, 0.1);
      } else {
        return val;
      }
    }
    clone.weights_ih.map(mutateVal);
    clone.weights_ho.map(mutateVal);
    clone.bias_h.map(mutateVal);
    clone.bias_o.map(mutateVal);
    return clone;
  }
}

class SimpleNeuralNetwork {
  constructor(input_nodes, output_nodes) {
    this.input_nodes = input_nodes;
    this.output_nodes = output_nodes;

    // Weight matrices and bias vectors
    this.weights = new Matrix(this.output_nodes, this.input_nodes);
    this.bias = new Matrix(this.output_nodes, 1);

    // Initialize with random values
    this.weights.randomize();
    this.bias.randomize();
  }

  // The feed-forward algorithm
  predict(input_array) {
    let inputs = Matrix.fromArray(input_array);

    // Calculate the output
    let output = Matrix.multiply(this.weights, inputs);
    output.add(this.bias);
    output.map(sigmoid);

    return output.toArray();
  }
  
  getMutation(rate) {
    let clone = new SimpleNeuralNetwork(this.input_nodes, this.output_nodes);
    clone.weights = Matrix.copy(this.weights);
    clone.bias = Matrix.copy(this.bias);
    function mutateVal(val) {
      if (Math.random() < rate) {
        return val + randomGaussian(0, 0.1);
      } else {
        return val;
      }
    }
    clone.weights.map(mutateVal);
    clone.bias.map(mutateVal);
    return clone;
  }
}

function sigmoid(x) {
  return 1 / (1 + Math.exp(-x));
}


function turnVector(vector, times) {
  if (times > 0) {
    return turnVector(createVector(vector.y, -vector.x), times - 1);
  } else {
    return vector;
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
    this.brain = new NeuralNetwork(17, 7, 5); //SimpleNeuralNetwork(17, 5);
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
    //console.log(decisions);
  }
  
  act(grid) {
    this.acted = true;
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
        this.energy += 300;
        this.size += 300;
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
      grid.cells[this.x][this.y] = null; // new DeadOrganism(this.x, this.y);
    }
  }

  display() {
    fill(this.getColor());
    noStroke();
    rect(this.x * cellSize, this.y * cellSize, cellSize, cellSize);
  }
  
  getColor() {
    return [this.r, this.g, this.b];
  }
}

class Wall {
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
    return [0, 0, 0];
  }
}

class Earth {
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
    return [150, 100, 50];
  }
}

class Plant {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  display() {
    fill(this.getColor());
    noStroke();
    circle((this.x + 0.5) * cellSize, (this.y + 0.5) * cellSize, cellSize);
  }
  
  getColor() {
    return [0, 255, 0];
  }
}

class DeadOrganism {
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
    return [100, 100, 100];
  }
}
