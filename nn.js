
class Matrix {
    constructor(rows, cols) {
        this.rows = rows;
        this.cols = cols;
        this.data = Array(this.rows).fill().map(() => Array(this.cols).fill(0));
    }

    // Fill the matrix with random values
    randomize() {
        return this.map(val => randomGaussian(0, 1));
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
    // Concatenate two matrices row-wise
    static concat(a, b) {
        if (a.cols !== b.cols) {
            console.error('Columns of A must match columns of B.');
            return;
        }

        let result = new Matrix(a.rows + b.rows, a.cols);
        for (let i = 0; i < a.rows; i++) {
            for (let j = 0; j < a.cols; j++) {
                result.data[i][j] = a.data[i][j];
            }
        }
        for (let i = 0; i < b.rows; i++) {
            for (let j = 0; j < b.cols; j++) {
                result.data[i + a.rows][j] = b.data[i][j];
            }
        }
        return result;
    }

    // Extract a submatrix
    subMatrix(rowStart, rowEnd, colStart, colEnd) {
      if(rowStart < 0 || rowEnd > this.rows || colStart < 0 || colEnd > this.cols) {
          console.error('Indices out of range');
          return;
      }

      let subRows = rowEnd - rowStart;
      let subCols = colEnd - colStart;
      let sub = new Matrix(subRows, subCols);

      for(let i = 0; i < subRows; i++) {
          for(let j = 0; j < subCols; j++) {
              sub.data[i][j] = this.data[i + rowStart][j + colStart];
          }
      }
      return sub;
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

class RecurrentNeuralNetwork {
  constructor(input_nodes, output_nodes, recurrent_nodes) {
    this.input_nodes = input_nodes;
    this.output_nodes = output_nodes;
    this.recurrent_nodes = recurrent_nodes;

    // Weight matrices and bias vectors
    this.weights = new Matrix(this.output_nodes + this.recurrent_nodes, this.input_nodes + this.recurrent_nodes);
    this.bias = new Matrix(this.output_nodes + this.recurrent_nodes, 1);

    // Initialize with random values
    this.weights.randomize();
    this.bias.randomize();

    this.recurrentState = new Matrix(this.recurrent_nodes, 1);
  }

  // The feed-forward algorithm
  predict(input_array) {
    let inputs = Matrix.fromArray(input_array);
    let combinedInputs = Matrix.concat(inputs, this.recurrentState);
    // Calculate the output
    let output = Matrix.multiply(this.weights, combinedInputs);
    output.add(this.bias);
    output.map(sigmoid);
    this.recurrentState = output.subMatrix(0, this.recurrent_nodes, 0, 1);
    return output.subMatrix(this.recurrent_nodes, this.output_nodes + this.recurrent_nodes, 0, 1).toArray();
  }
  
  getMutation(rate) {
    let clone = new RecurrentNeuralNetwork(this.input_nodes, this.output_nodes, this.recurrent_nodes);
    clone.weights = Matrix.copy(this.weights);
    clone.bias = Matrix.copy(this.bias);
    function mutateVal(val) {
      if (Math.random() < rate) {
        return val * 0.99 + randomGaussian(0, 0.1);
      } else {
        return val;
      }
    }
    clone.weights.map(mutateVal);
    clone.bias.map(mutateVal);
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
