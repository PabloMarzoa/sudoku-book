import random
import os
import sys

class SudokuGenerator:
    def __init__(self):
        self.grid = [[0 for _ in range(9)] for _ in range(9)]

    def generate(self):
        self.fill_diagonal()
        self.fill_remaining(0, 3)
        return [row[:] for row in self.grid]

    def fill_diagonal(self):
        for i in range(0, 9, 3):
            self.fill_box(i, i)

    def unassigned_in_box(self, row_start, col_start, num):
        for i in range(3):
            for j in range(3):
                if self.grid[row_start + i][col_start + j] == num:
                    return False
        return True

    def fill_box(self, row, col):
        num = 0
        for i in range(3):
            for j in range(3):
                while True:
                    num = random.randint(1, 9)
                    if self.unassigned_in_box(row, col, num):
                        break
                self.grid[row + i][col + j] = num

    def is_safe(self, row, col, num):
        return (self.unused_in_row(row, num) and
                self.unused_in_col(col, num) and
                self.unassigned_in_box(row - row % 3, col - col % 3, num))

    def unused_in_row(self, row, num):
        for i in range(9):
            if self.grid[row][i] == num:
                return False
        return True

    def unused_in_col(self, col, num):
        for i in range(9):
            if self.grid[i][col] == num:
                return False
        return True

    def fill_remaining(self, i, j):
        if j >= 9 and i < 8:
            i = i + 1
            j = 0
        if i >= 9 and j >= 9:
            return True
        if i < 3:
            if j < 3:
                j = 3
        elif i < 6:
            if j == (int)(i / 3) * 3:
                j = j + 3
        else:
            if j == 6:
                i = i + 1
                j = 0
                if i >= 9:
                    return True

        for num in range(1, 10):
            if self.is_safe(i, j, num):
                self.grid[i][j] = num
                if self.fill_remaining(i, j + 1):
                    return True
                self.grid[i][j] = 0
        return False

    def remove_digits(self, grid, count=40):
        puzzle = [row[:] for row in grid]
        
        # Ensure at least one hole per 3x3 box
        # 3x3 boxes start at (0,0), (0,3), (0,6), (3,0), ...
        box_starts = [(i, j) for i in range(0, 9, 3) for j in range(0, 9, 3)]
        
        for r_start, c_start in box_starts:
            # Pick a random cell within this 3x3 box
            while True:
                r = r_start + random.randint(0, 2)
                c = c_start + random.randint(0, 2)
                if puzzle[r][c] != 0:
                    puzzle[r][c] = 0
                    count -= 1
                    break
        
        # Remove remaining digits randomly
        while count > 0:
            cell_id = random.randint(0, 80)
            row = cell_id // 9
            col = cell_id % 9
            if puzzle[row][col] != 0:
                count -= 1
                puzzle[row][col] = 0
        return puzzle

class SvgRenderer:
    def __init__(self, cell_size=50, padding=20):
        self.cell_size = cell_size
        self.padding = padding
        self.width = cell_size * 9 + padding * 2
        self.height = cell_size * 9 + padding * 2

    def create_svg(self, grid, filename, is_solution=False, initial_grid=None):
        svg_content = [
            f'<svg width="{self.width}" height="{self.height}" xmlns="http://www.w3.org/2000/svg">',
            f'<rect x="0" y="0" width="{self.width}" height="{self.height}" fill="white"/>'
        ]

        # Draw grid
        for i in range(10):
            stroke_width = 3 if i % 3 == 0 else 1
            # Vertical lines
            x = self.padding + i * self.cell_size
            svg_content.append(f'<line x1="{x}" y1="{self.padding}" x2="{x}" y2="{self.height - self.padding}" stroke="black" stroke-width="{stroke_width}"/>')
            # Horizontal lines
            y = self.padding + i * self.cell_size
            svg_content.append(f'<line x1="{self.padding}" y1="{y}" x2="{self.width - self.padding}" y2="{y}" stroke="black" stroke-width="{stroke_width}"/>')

        # Draw numbers
        font_size = self.cell_size * 0.6
        for row in range(9):
            for col in range(9):
                val = grid[row][col]
                if val != 0:
                    x = self.padding + col * self.cell_size + self.cell_size / 2
                    y = self.padding + row * self.cell_size + self.cell_size / 2 + font_size / 3
                    
                    # Determine style
                    is_clue = True
                    if is_solution and initial_grid:
                         # If it's a solution, check if it was present in initial grid (non-zero)
                         if initial_grid[row][col] == 0:
                             is_clue = False
                    
                    if is_clue:
                        font_weight = "bold"
                        font_family = "Arial"
                        font_style = "normal"
                    else:
                        font_weight = "normal"
                        font_family = "Times New Roman, serif"
                        font_style = "italic"
                    
                    svg_content.append(f'<text x="{x}" y="{y}" font-family="{font_family}" font-size="{font_size}" font-weight="{font_weight}" font-style="{font_style}" text-anchor="middle" fill="black">{val}</text>')

        svg_content.append('</svg>')
        
        with open(filename, 'w') as f:
            f.write('\n'.join(svg_content))

def get_difficulty():
    print("\nSelect difficulty:")
    print("1. Easy")
    print("2. Medium")
    print("3. Hard")
    while True:
        try:
            choice = int(input("Enter choice (1-3): "))
            if choice == 1:
                return 30
            elif choice == 2:
                return 40
            elif choice == 3:
                return 50
            else:
                print("Please enter 1, 2, or 3.")
        except ValueError:
            print("Invalid input. Please enter a number.")

def main():
    try:
        count = int(input("How many Sudokus do you want to create? "))
    except ValueError:
        print("Please enter a valid number.")
        return

    holes = get_difficulty()

    output_dir = "output"
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    renderer = SvgRenderer()

    for i in range(1, count + 1):
        print(f"Generating Sudoku {i}...")
        gen = SudokuGenerator()
        solution = gen.generate()
        puzzle = gen.remove_digits(solution, count=holes)

        # For puzzle image: all present numbers are clues
        renderer.create_svg(puzzle, os.path.join(output_dir, f"{i}.svg"), is_solution=False)
        
        # For solution image: pass puzzle to identify original clues
        renderer.create_svg(solution, os.path.join(output_dir, f"{i}_solution.svg"), is_solution=True, initial_grid=puzzle)

    print(f"Successfully generated {count} Sudokus in '{output_dir}/'")

if __name__ == "__main__":
    main()
