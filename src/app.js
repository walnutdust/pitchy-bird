/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2021 Garett Tok Ern Liang
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

// Set the window's audio context to either the new or old audio context
// depending on what is available.
window.AudioContext = window.AudioContext || window.webkitAudioContext;

// Likewise for requestAnimationFrame.
window.requestAnimationFrame =
  window.requestAnimationFrame ||
  window.webkitRequestAnimationFrame ||
  window.mozRequestAnimationFrame ||
  window.msRequestAnimationFrame ||
  window.oRequestAnimationFrame;

/**
 * This class represents an obstacle in the game.
 *
 * Obstacles are defined by the position of their gaps (specifically, the
 * top-left corner).
 */
class Obstacle {
  /**
   * Creates a new Obstacle, with the xCoordinate defined, and the y Coordinate
   * randomly generated from [0, yRange).
   *
   * @param {number} xCoordinate - xCoordinate of the obstacle gap.
   * @param {number} yCoordinate - yCoordinate of the obstacle gap.
   * @param {number} canvasHeight - Height of the canvas
   */
  constructor(xCoordinate, yCoordinate, canvasHeight) {
    this.x = xCoordinate;
    this.y = yCoordinate;
    this.canvasHeight = canvasHeight;

    this.bottomPillar = document.createElement("div");
    this.bottomPillar.className = "obstacle";

    this.topPillar = document.createElement("div");
    this.topPillar.style.top = "0px";
    this.topPillar.className = "top-obstacle";

    this.updatePillars();
  }

  updatePillars() {
    this.bottomPillar.style.top = `${this.y + GAP_HEIGHT}px`;
    this.bottomPillar.style.width = `${GAP_WIDTH}px`;
    this.bottomPillar.style.height = `${
      this.canvasHeight - this.y - GAP_HEIGHT
    }px`;

    this.topPillar.style.width = `${GAP_WIDTH}px`;
    this.topPillar.style.height = `${this.y}px`;
  }

  /**
   * Determines if the character at (charX, charY) intersects with either the
   * top or bottom pillar of the obstacle, and returns the result.
   *
   * @param {number} charX - x coordinate of the character
   * @param {number} charY - y coordinate of the character
   * @param {number} charSize - side of the the character (assumed to be square)
   *
   * @returns {boolean} True if the character overlaps this obstacle, false
   * otherwise.
   */
  overlaps(charX, charY, charSize) {
    // Determines the center of the character.
    const charCenterX = charX + charSize / 2;
    const charCenterY = charY + charSize / 2;

    // Determines the x- and y-coordinates of the top pillar.
    const topCenterX = this.x + GAP_WIDTH / 2;
    const topCenterY = this.y / 2;

    // Determines the x- and y-coordinates of the bottom pillar.
    const botCenterX = topCenterX;
    const botCenterY = (this.canvasHeight + GAP_HEIGHT + this.y) / 2;

    // Determines the margin by which overlap is defined.
    const xMargin = (charSize + GAP_WIDTH) / 2;
    const yMarginTop = (charSize + this.y) / 2;
    const yMarginBottom =
      (charSize + this.canvasHeight - GAP_HEIGHT - this.y) / 2;

    // True if the character overlaps the top pillar, false otherwise.
    const charOverlapTop =
      Math.abs(topCenterX - charCenterX) < xMargin &&
      Math.abs(topCenterY - charCenterY) < yMarginTop;

    // True if the character overlaps the bottom pillar, false otherwise.
    const charOverlapBot =
      Math.abs(botCenterX - charCenterX) < xMargin &&
      Math.abs(botCenterY - charCenterY) < yMarginBottom;

    return charOverlapTop || charOverlapBot;
  }

  /**
   * Updates the x coordinate of the obstacle.
   */
  update() {
    this.x -= TIMESTEP;

    this.topPillar.style.left = `${this.x}px`;
    this.bottomPillar.style.left = `${this.x}px`;
  }
}

/**
 * This class represents an obstacle generator that generates obstacles with
 * constant horizontal spacing and a random vertical gap.
 */
class ObstacleGenerator {
  constructor(canvasHeight) {
    this.lastGenerated = null;
    this.canvasHeight = canvasHeight;
  }

  /**
   * Returns a newly generated obstacle.
   * @returns {Obstacle} A newly generated obstacle.
   */
  generateObstacle() {
    const lastGeneratedX = this.lastGenerated?.x || 0;
    const nextX = lastGeneratedX + SPACE_BETWEEN_OBSTACLES;
    const nextY = Math.random() * (this.canvasHeight - GAP_HEIGHT);
    this.lastGenerated = new Obstacle(nextX, nextY, this.canvasHeight);
    return this.lastGenerated;
  }

  /**
   * Returns a list of `numObstacles` obstacles/
   * @param {number} numObstacles - Number of obstacles to be generated.
   * @returns {list[Obstacle]} A list of `numObstacles` Obstacles.
   */
  generateObstacles(numObstacles) {
    const result = [];
    for (let i = 0; i < numObstacles; i++) {
      result.push(this.generateObstacle());
    }

    return result;
  }

  /**
   * Repurpose a previously used obstacle to avoid adding/removing DOM nodes.
   *
   * @param {Obstacle} obstacle - previously used obstacle.
   */
  repurposeObstacle(obstacle) {
    const lastGeneratedX = this.lastGenerated?.x || 0;
    const nextX = lastGeneratedX + SPACE_BETWEEN_OBSTACLES;
    obstacle.x = nextX;
    obstacle.y = Math.random() * (this.canvasHeight - GAP_HEIGHT);
    this.lastGenerated = obstacle;
    obstacle.updatePillars();
  }
}

// Enums for the possible game states.
const GAME_STATES = {
  PLAYING: "PLAYING",
  STOPPED: "STOPPED",
};

/**
 * This class represents an instance of the game.
 */
class Game {
  /**
   * Constructor to initialize an instance of the game.
   */
  constructor() {
    // Initializes the screen to draw on.
    this.screen = document.getElementById("flappy");
    this.screen.style.width = `${window.innerWidth}px`;
    this.screen.style.height = `${window.innerHeight}px`;

    // Initializes the game bird character.
    this.flappy = document.createElement("div");
    this.flappy.className = "bird";
    this.flappy.style.left = `${CHAR_X}px`;
    this.screen.appendChild(this.flappy);

    this.obsGen = new ObstacleGenerator(window.innerHeight);

    // Initializes random obstacles.
    this.obstacles = this.obsGen.generateObstacles(
      window.innerWidth / SPACE_BETWEEN_OBSTACLES
    );

    for (const obstacle of this.obstacles) {
      this.screen.appendChild(obstacle.bottomPillar);
      this.screen.appendChild(obstacle.topPillar);
    }

    // Intializes the score and the score elements.
    this.score = 0;
    this.scoreElem = document.getElementById("score");
    this.scoreElem.innerText = "Score: " + this.score;

    // Initializes the time that has passed in the game. This is a multiple of
    // animation frames that have passed.
    this.time = 0;

    // Initializes the starting character height.
    this.charY = window.innerHeight / 2;

    // Initiqalizes the starting state.
    this.state = GAME_STATES.PLAYING;
  }

  /**
   * Increments the score and set the text of the element as appropriate.
   */
  _incScore() {
    this.score++;
    this.scoreElem.innerText = "Score: " + this.score;
  }

  /**
   * Draws all the obstacles on screen.
   */
  _drawObstacles() {
    // this.gameContext.strokeStyle = "red";

    for (let i = 0; i < this.obstacles.length; i++) {
      const obstacle = this.obstacles[i];
      const obstacleX = obstacle.x;

      // If the character has passed the obstacle, generate the next
      // obstacle to replace it, and update the score.
      if (obstacleX + GAP_WIDTH < 0) {
        this.obsGen.repurposeObstacle(this.obstacles[i]);
        this._incScore();
        continue;
      }

      obstacle.update();
    }
  }

  /**
   * Draws the charcter on screen.
   */
  _drawCharacter() {
    this.flappy.style.top = `${this.charY}px`;
  }

  /**
   * Check if any obstacle overlaps with the character. If so, update the game
   * state to be stopped.
   */
  _checkEndGame() {
    for (const obstacle of this.obstacles) {
      if (obstacle.overlaps(CHAR_X, this.charY, CHAR_SIZE)) {
        this.state = GAME_STATES.STOPPED;

        const gameOverModal = document.createElement("div");
        gameOverModal.className = "game-over";
        gameOverModal.innerText = `Game over! Score: ${this.score}`;
        this.screen.appendChild(gameOverModal);
      }
    }
  }

  /**
   * Updates the game with the next frame.
   * @param {number} pitch - frequency of sound input in Hz.
   */
  update(pitch) {
    // Update the game time.
    this.time += TIMESTEP;

    // Clear the game canvas.

    const yRangeScale = Math.log2(MAX_PITCH) - Math.log2(MIN_PITCH);

    // Bound the pitch to between 0 and the max pitch.
    const boundedPitch = bound(
      Math.log2(pitch) - Math.log2(MIN_PITCH),
      0,
      yRangeScale
    );

    // Convert the pitch to the appropriate y coordinates.
    // Note that pitchHeight can be NaN if the algorithm does not correctly
    // detect pitch.
    const pitchHeight = (boundedPitch / yRangeScale) * window.innerHeight;

    console.log(pitchHeight);

    // Let the pitch have a linear force.
    const heightDifference = Number.isNaN(pitchHeight)
      ? 0
      : window.innerHeight - pitchHeight - this.charY;
    this.charY += 0.05 * heightDifference;

    // Draw the obstacles and character.
    this._drawObstacles();
    this._drawCharacter();

    // Check if game has ended
    this._checkEndGame();
  }
}

/**
 * This class holds an audio processor, which analyzes an input stream.
 */
class AudioProcessor {
  /**
   * Initializes the AudioProcessor with an input stream.
   * @param {MediaStream} stream - voice stream.
   */
  constructor(stream) {
    // Initializes the audio context.
    this.audioContext = new AudioContext();

    // Create an analyzer to determine pitch.
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = BUFFER_LENGTH;

    // Source of the media stream to be analysed.
    this.mediaStreamSource = this.audioContext.createMediaStreamSource(stream);
    this.mediaStreamSource.connect(this.analyser);

    // Create one buffer that can be reused to save memory.
    this.buffer = new Float32Array(BUFFER_LENGTH);
  }

  /**
   * Analyzes the time domain data to guess the pitch.
   *
   * @returns {number} Best guess at the pitch detected.
   */
  analyzePitch() {
    this.analyser.getFloatTimeDomainData(this.buffer);
    return autoCorrelate(this.buffer, this.audioContext.sampleRate);
  }
}

/**
 * Main class holding the application components.
 */
class Application {
  constructor() {
    this.pitchElem = document.getElementById("pitch");
    this.noteElem = document.getElementById("note");

    this.game = new Game();
    this.audioProcessor = null;
  }

  /**
   * Request the user audio stream and begins the game.
   */
  async init() {
    async function getUserAudio() {
      try {
        return await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (exception) {
        alert("Exception: " + exception);
      }
    }

    const stream = await getUserAudio();
    this.audioProcessor = new AudioProcessor(stream);
    window.requestAnimationFrame(this.onPitchUpdate.bind(this));
  }

  /**
   * Updates the pitch display elements with the new pitch.
   *
   * @param {number} newPitch - the newest pitch detected.
   */
  _updatePitchDisplay(newPitch) {
    if (newPitch === -1) {
      // If we aren't sure of the pitch, update the display to "--".
      this.pitchElem.innerText = "--";
      this.noteElem.innerText = "-";
    } else {
      this.pitchElem.innerText = Math.round(newPitch);

      const note = noteFromPitch(newPitch);
      this.noteElem.innerHTML = noteStrings[note % 12];
    }
  }

  /**
   * Callback function to be exected on each pitch update.
   */
  onPitchUpdate() {
    const pitch = this.audioProcessor.analyzePitch();
    this.game.update(pitch);
    this._updatePitchDisplay(pitch);

    if (this.game.state === GAME_STATES.PLAYING) {
      window.requestAnimationFrame(this.onPitchUpdate.bind(this));
    }
  }
}

// IIFE to initialize the app.
(function () {
  const app = new Application();
  app.init();
})();
