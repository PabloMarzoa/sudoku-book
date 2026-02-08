# Sudoku Book Generator

This project provides tools to generate Sudoku puzzles and create complete puzzle books in PDF format suitable for Amazon KDP.

It consists of two main components:
1.  **Sudoku Generator Script (Python)**: A standalone script to generate individual Sudoku puzzles as SVG images.
2.  **Sudoku Book App (Angular)**: A web application to generate complete PDF books with multiple difficulties, solutions, and KDP-compliant formatting.

## 1. Sudoku Generator Script (Python)

This script generates individual Sudoku puzzles and their solutions as SVG files. Use this if you need raw image files for other projects.

### Prerequisites
- Python 3.x

### Usage
Run the script from the terminal:
```bash
python3 sudoku_gen.py
```

The script will ask for:
- **Number of Sudokus**: How many puzzles to generate.
- **Difficulty**:
  - `1`: Easy (30 holes)
  - `2`: Medium (40 holes)
  - `3`: Hard (50 holes)

### Output
Thegenerated SVG files will be saved in the `output/` directory:
- `1.svg`, `2.svg`, ... (Puzzle files)
- `1_solution.svg`, `2_solution.svg`, ... (Solution files)

---

## 2. Sudoku Book App (Angular)

This web application generates complete PDF puzzle books directly in your browser. It includes the Sudoku generation logic internally, so **you do not need to run the Python script first**. The app generates the puzzles on the fly.

### Prerequisites
- Node.js and npm

### Installation
Navigate to the app directory and install dependencies:
```bash
cd sudoku-book-app
npm install
```

### Usage
Start the development server:
```bash
npm start
```
Then open your browser at `http://localhost:4200`.

### Features
- **Book Configuration**:
  - **Trim Size**: Select standard book sizes (e.g., 6"x9", 8.5"x11").
  - **Puzzle Counts**: distinctive counts for Easy, Medium, and Hard puzzles.
  - **Layout**: Choose how many puzzles per page (1, 2, 4, or 6).
- **Preview**: View the generated book directly in the browser before downloading.
- **Download**:
  - **Content PDF**: The interior pages with puzzles and solutions, formatted with KDP margins.
  - **Cover PDF**: A basic cover template (Front/Back) sized for the book.

### Workflow
1.  Open the app in your browser.
2.  Set your desired book size and puzzle counts.
3.  Click **Preview** to check the layout and generation.
4.  Click **Download Content PDF** to get the print-ready interior file.
5.  Click **Download Cover PDF** to get the cover file.
