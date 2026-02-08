import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SudokuGenService {

  constructor() { }

  generate(): number[][] {
    const grid = Array.from({ length: 9 }, () => Array(9).fill(0));
    this.fillDiagonal(grid);
    this.fillRemaining(grid, 0, 3);
    return grid;
  }

  private fillDiagonal(grid: number[][]): void {
    for (let i = 0; i < 9; i = i + 3) {
      this.fillBox(grid, i, i);
    }
  }

  private unassignedInBox(grid: number[][], rowStart: number, colStart: number, num: number): boolean {
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        if (grid[rowStart + i][colStart + j] === num) {
          return false;
        }
      }
    }
    return true;
  }

  private fillBox(grid: number[][], row: number, col: number): void {
    let num: number;
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        do {
          num = Math.floor(Math.random() * 9) + 1;
        } while (!this.unassignedInBox(grid, row, col, num));
        grid[row + i][col + j] = num;
      }
    }
  }

  private isSafe(grid: number[][], row: number, col: number, num: number): boolean {
    const unUsedInRow = !grid[row].includes(num);
    const unUsedInCol = !grid.map(r => r[col]).includes(num);
    const unUsedInBox = this.unassignedInBox(grid, row - row % 3, col - col % 3, num);
    return unUsedInRow && unUsedInCol && unUsedInBox;
  }

  private fillRemaining(grid: number[][], i: number, j: number): boolean {
    if (j >= 9 && i < 8) {
      i = i + 1;
      j = 0;
    }
    if (i >= 9 && j >= 9) {
      return true;
    }
    if (i < 3) {
      if (j < 3) {
        j = 3;
      }
    } else if (i < 6) {
      if (j === Math.floor(i / 3) * 3) {
        j = j + 3;
      }
    } else {
      if (j === 6) {
        i = i + 1;
        j = 0;
        if (i >= 9) {
          return true;
        }
      }
    }

    for (let num = 1; num <= 9; num++) {
      if (this.isSafe(grid, i, j, num)) {
        grid[i][j] = num;
        if (this.fillRemaining(grid, i, j + 1)) {
          return true;
        }
        grid[i][j] = 0;
      }
    }
    return false;
  }

  removeDigits(originalGrid: number[][], holes: number): number[][] {
    const puzzle = originalGrid.map(row => [...row]);
    let count = holes;

    // Ensure at least one hole per 3x3 box
    const boxStarts = [];
    for (let i = 0; i < 9; i += 3) {
      for (let j = 0; j < 9; j += 3) {
        boxStarts.push([i, j]);
      }
    }

    for (const [rStart, cStart] of boxStarts) {
      while (true) {
        const r = rStart + Math.floor(Math.random() * 3);
        const c = cStart + Math.floor(Math.random() * 3);
        if (puzzle[r][c] !== 0) {
          puzzle[r][c] = 0;
          count--;
          break;
        }
      }
    }

    // Remove remaining digits randomly
    while (count > 0) {
      const cellId = Math.floor(Math.random() * 81);
      const row = Math.floor(cellId / 9);
      const col = cellId % 9;
      if (puzzle[row][col] !== 0) {
        puzzle[row][col] = 0;
        count--;
      }
    }
    return puzzle;
  }
}
