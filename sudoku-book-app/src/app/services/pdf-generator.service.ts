import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';
import { marked } from 'marked';
import { SudokuGenService } from './sudoku-gen.service';

export interface BookConfig {
  trimSize: '6x9' | '8.5x11';
  easyCount: number;
  mediumCount: number;
  hardCount: number;
  puzzlesPerPage: 1 | 2 | 4 | 6;
  infoContent?: string;
  language: 'en' | 'es';
}

export interface PuzzleData {
  puzzle: number[][];
  solution: number[][];
  difficulty: string;
  id: number;
}

@Injectable({
  providedIn: 'root',
})
export class PdfGeneratorService {
  private translations: any = {
    en: {
      Index: 'Index',
      'Easy Sudokus': 'Easy Sudokus',
      'Medium Sudokus': 'Medium Sudokus',
      'Hard Sudokus': 'Hard Sudokus',
      Solutions: 'Solutions',
      Sudoku: 'Sudoku',
      Solution: 'Solution',
      Page: 'Page',
      'Front Cover': 'FRONT COVER',
      'Back Cover': 'Back Cover',
      Easy: 'Easy',
      Medium: 'Medium',
      Hard: 'Hard',
    },
    es: {
      Index: 'Índice',
      'Easy Sudokus': 'Fácil',
      'Medium Sudokus': 'Intermedio',
      'Hard Sudokus': 'Difícil',
      Solutions: 'Soluciones',
      Sudoku: 'Sudoku',
      Solution: 'Solución',
      Page: 'Página',
      'Front Cover': 'PORTADA',
      'Back Cover': 'Contraportada',
      Easy: 'Fáciles',
      Medium: 'Intermedios',
      Hard: 'Difíciles',
    },
  };

  constructor() {}

  private t(key: string, lang: 'en' | 'es'): string {
    return this.translations[lang]?.[key] || key;
  }

  async generateBook(
    config: BookConfig,
    puzzles: PuzzleData[],
    isCover: boolean = false,
  ): Promise<void> {
    const doc = await (isCover
      ? this.generateCover(config, puzzles.length)
      : this.generateContent(config, puzzles));
    doc.save(isCover ? 'sudoku-book-cover.pdf' : 'sudoku-book-content.pdf');
  }

  async getPreviewUrl(
    config: BookConfig,
    puzzles: PuzzleData[],
    isCover: boolean = false,
  ): Promise<string> {
    const doc = await (isCover
      ? this.generateCover(config, puzzles.length)
      : this.generateFullBook(config, puzzles));
    return doc.output('bloburl').toString();
  }

  private async generateFullBook(config: BookConfig, puzzles: PuzzleData[]): Promise<jsPDF> {
    let format: [number, number];
    if (config.trimSize === '6x9') {
      format = [6 * 72, 9 * 72];
    } else {
      format = [8.5 * 72, 11 * 72];
    }
    let width = format[0];
    let height = format[1];

    // Add interior bleed (0.125" on outside edge -> width, 0.25" on height -> 0.125" top + 0.125" bottom)
    const bleedW = 0.125 * 72; // 9pt
    const bleedH = 0.25 * 72; // 18pt

    width += bleedW;
    height += bleedH;

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: [width, height],
    });

    // Load Resources
    const fontName = await this.loadPlaywriteFont(doc);
    doc.setFont(fontName, 'normal');

    let portadaImg: HTMLImageElement | null = null;
    let fondoImg: HTMLImageElement | null = null;
    try {
      portadaImg = await this.loadImage('/portada.png');
    } catch (e) {}
    try {
      fondoImg = await this.loadImage('/fondo.png');
    } catch (e) {}

    // 1. Front Cover (Page 1)
    if (portadaImg) {
      doc.addImage(portadaImg, 'PNG', 0, 0, width, height);
    } else {
      doc.setFillColor(255, 200, 100);
      doc.rect(0, 0, width, height, 'F');
    }

    // Establecemos el color de fuente a blanco y el de contorno a negro
    doc.setTextColor(255, 255, 255);
    doc.setDrawColor(0, 0, 0);
    // Establecemos un grosor de línea para el contorno
    doc.setLineWidth(1.5);
    
    // Cambiamos el peso de la fuente a bold
    doc.setFont(fontName, 'bold');
    doc.setFontSize(48);
    // Renderizamos texto con relleno (F) y trazado de borde (S) -> 'FD' o 'fillThenStroke'
    doc.text('SUDOKU COLLECTION', width / 2, height * 0.15, { align: 'center', renderingMode: 'fillThenStroke' });

    const counts: string[] = [];
    if (config.easyCount > 0) counts.push(`${config.easyCount} ${this.t('Easy', config.language)}`);
    if (config.mediumCount > 0) counts.push(`${config.mediumCount} ${this.t('Medium', config.language)}`);
    if (config.hardCount > 0) counts.push(`${config.hardCount} ${this.t('Hard', config.language)}`);

    // Volvemos a un borde más delgado para el texto pequeño o quitamos el borde (en este caso un borde delgado)
    doc.setLineWidth(0.5);
    doc.setFontSize(20);
    doc.text(counts.join(', '), width / 2, height * 0.9, { align: 'center', renderingMode: 'fillThenStroke' });

    // Restauramos valores para el resto del documento
    doc.setFont(fontName, 'normal');
    doc.setLineWidth(1);

    // 2. Content
    // Add page for Inside Front Cover (start of content)
    doc.addPage();

    // Call generateContent with existing doc
    await this.generateContent(config, puzzles, doc);

    return doc;
  }

  private async generateContent(
    config: BookConfig,
    allPuzzles: PuzzleData[],
    existingDoc?: jsPDF,
  ): Promise<jsPDF> {
    let format: [number, number];
    if (config.trimSize === '6x9') {
      format = [6 * 72, 9 * 72];
    } else {
      format = [8.5 * 72, 11 * 72];
    }

    let width = format[0];
    let height = format[1];

    // Add interior bleed (1 bleed width edge for inside book layout = 0.125", and 0.25" total height)
    const bleedW = 0.125 * 72; // 9pt
    const bleedH = 0.25 * 72; // 18pt

    width += bleedW;
    height += bleedH;

    const doc =
      existingDoc ||
      new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: [width, height],
      });

    // Load Resources (Idempotent-ish)
    const fontName = await this.loadPlaywriteFont(doc);
    if (!existingDoc) doc.setFont(fontName, 'normal'); // Only set if new, otherwise caller set it? Or set again to be safe.
    doc.setFont(fontName, 'normal');

    // Load Background Image (fondo.png)
    let fondoImg: HTMLImageElement | null = null;
    try {
      fondoImg = await this.loadImage('/fondo.png');
    } catch (e) {}

    // The actual doc width and height has the bleed added.
    // We do NOT add bleed onto margins; leaving margins unmodified will shift content *further* away from the edge safely over 0.375".
    const marginInside = 54 + 10; // ~0.9 inch gutter
    const marginOutside = 54; // 0.75 inch
    const marginTop = 54; // 0.75 inch
    const marginBottom = 54; // 0.75 inch

    let pageNum = 1;

    // 1. Two Blank Pages at the beginning
    // First blank page is the currently active empty page
    // Second blank page:
    doc.addPage();
    pageNum++;

    // 2. Info Page
    doc.addPage();
    pageNum++;
    if (config.infoContent) {
      const parser = new DOMParser();
      const htmlDoc = parser.parseFromString(config.infoContent, 'text/html');
      // Get all child nodes to include text not wrapped in tags
      const nodes = Array.from(htmlDoc.body.childNodes);

      let y = marginTop;
      const maxWidth = width - marginInside - marginOutside;

      nodes.forEach((node) => {
        // Handle BR tags for line breaks
        if (node.nodeType === Node.ELEMENT_NODE && (node as Element).tagName === 'BR') {
          y += 18;
          return;
        }

        // Skip empty text nodes
        if (node.nodeType === Node.TEXT_NODE && !node.textContent?.trim()) return;

        let text = node.textContent?.trim() || '';
        if (!text) return;

        let fontSize = 12;
        let lineHeightFactor = 1.15; // default jsPDF spacing is roughly this
        let marginBottom = 12;

        // Determine style based on tag
        if (node.nodeType === Node.ELEMENT_NODE) {
          const el = node as Element;
          if (el.tagName === 'H1') {
            fontSize = 24;
            marginBottom = 24;
          } else if (el.tagName === 'H2') {
            fontSize = 18;
            marginBottom = 18;
          }
        }

        doc.setFontSize(fontSize);
        doc.setTextColor(0, 0, 0);

        const splitText = doc.splitTextToSize(text, maxWidth);
        /* 
             Calculate height:
             splitText is array of strings.
             jsPDF default line height factor is 1.15.
             Height = fontSize * 1.15 * lines.
           */
        const blockHeight = splitText.length * fontSize * lineHeightFactor;

        // Page Break Check
        if (y + blockHeight > height - marginBottom) {
          doc.addPage();
          pageNum++;
          y = marginTop;
        }

        doc.text(splitText, marginInside, y);
        y += blockHeight + marginBottom;
      });
    }

    // 3. Index
    doc.addPage();
    pageNum++;
    doc.setFont(fontName, 'normal');
    doc.setFontSize(24);
    doc.text(this.t('Index', config.language), width / 2, marginTop + 20, { align: 'center' });
    doc.setFontSize(14);

    // ... Index Calculation (Keep existing logic) ...
    const ppp = config.puzzlesPerPage;
    const easyCount = allPuzzles.filter((p) => p.difficulty === 'Easy').length;
    const medCount = allPuzzles.filter((p) => p.difficulty === 'Medium').length;
    const hardCount = allPuzzles.filter((p) => p.difficulty === 'Hard').length;

    const easyPages = Math.ceil(easyCount / ppp);
    const easySectionPages = easyCount > 0 ? easyPages + 1 : 0;

    const medPages = Math.ceil(medCount / ppp);
    const medSectionPages = medCount > 0 ? medPages + 1 : 0;

    const hardPages = Math.ceil(hardCount / ppp);
    const hardSectionPages = hardCount > 0 ? hardPages + 1 : 0;

    let currentPage = pageNum + 1; // Page 4

    const indexY = marginTop + 60;
    let currentY = indexY;

    // Helper to draw index line
    const drawIndexItem = (title: string, pNum: number) => {
      const pageLabel = `${this.t('Page', config.language)} ${pNum}`;

      // Draw Left (Title)
      doc.text(title, marginInside, currentY, { align: 'left' });

      // Draw Right (Page)
      doc.text(pageLabel, width - marginOutside, currentY, { align: 'right' });

      // Draw Dots
      const titleWidth = doc.getTextWidth(title);
      const pageWidth = doc.getTextWidth(pageLabel);
      const startDot = marginInside + titleWidth + 5;
      const endDot = width - marginOutside - pageWidth - 5;

      if (endDot > startDot) {
        doc.setLineDashPattern([1, 2], 0); // Dotted line
        doc.line(startDot, currentY, endDot, currentY);
        doc.setLineDashPattern([], 0); // Reset
      }

      currentY += 20;
    };

    if (easyCount > 0) {
      drawIndexItem(this.t('Easy Sudokus', config.language), currentPage);
      currentPage += easySectionPages;
    }
    if (medCount > 0) {
      drawIndexItem(this.t('Medium Sudokus', config.language), currentPage);
      currentPage += medSectionPages;
    }
    if (hardCount > 0) {
      drawIndexItem(this.t('Hard Sudokus', config.language), currentPage);
      currentPage += hardSectionPages;
    }
    drawIndexItem(this.t('Solutions', config.language), currentPage);

    // 4. Content
    // Group puzzles
    const easyPuzzles = allPuzzles.filter((p) => p.difficulty === 'Easy');
    const mediumPuzzles = allPuzzles.filter((p) => p.difficulty === 'Medium');
    const hardPuzzles = allPuzzles.filter((p) => p.difficulty === 'Hard');

    const processSection = (title: string, puzzles: PuzzleData[]) => {
      if (puzzles.length === 0) return;

      doc.addPage();
      pageNum++;
      this.drawPageHeader(doc, pageNum, width, marginInside, marginOutside, fontName);

      doc.setFontSize(20);
      doc.text(title, width / 2, height / 2, { align: 'center' });

      for (let i = 0; i < puzzles.length; i += config.puzzlesPerPage) {
        doc.addPage();
        pageNum++;
        this.drawPageHeader(doc, pageNum, width, marginInside, marginOutside, fontName);

        const chunk = puzzles.slice(i, i + config.puzzlesPerPage);
        this.drawPuzzlesOnPage(
          doc,
          chunk,
          width,
          height,
          marginInside,
          marginOutside,
          marginTop,
          marginBottom,
          config.puzzlesPerPage,
          false,
          fontName,
          config.language,
        );
      }
    };

    if (easyPuzzles.length > 0)
      processSection(this.t('Easy Sudokus', config.language), easyPuzzles);
    if (mediumPuzzles.length > 0)
      processSection(this.t('Medium Sudokus', config.language), mediumPuzzles);
    if (hardPuzzles.length > 0)
      processSection(this.t('Hard Sudokus', config.language), hardPuzzles);

    // Solutions Divider
    doc.addPage();
    pageNum++;
    doc.setFontSize(24);
    doc.text(this.t('Solutions', config.language), width / 2, height / 2, { align: 'center' });

    // Solutions
    const solutionsPerPage = 4;
    for (let i = 0; i < allPuzzles.length; i += solutionsPerPage) {
      doc.addPage();
      pageNum++;
      this.drawPageHeader(doc, pageNum, width, marginInside, marginOutside, fontName);

      const chunk = allPuzzles.slice(i, i + solutionsPerPage);
      this.drawPuzzlesOnPage(
        doc,
        chunk,
        width,
        height,
        marginInside,
        marginOutside,
        marginTop,
        marginBottom,
        solutionsPerPage,
        true,
        fontName,
        config.language,
      );
    }

    return doc;
  }

  private async loadPlaywriteFont(doc: jsPDF): Promise<string> {
    try {
      // Try to load local font file if user provided it
      const fontUrl = '/PlaywrightRegular.ttf';
      const response = await fetch(fontUrl);
      if (response.ok) {
        const blob = await response.blob();
        const reader = new FileReader();
        return new Promise((resolve) => {
          reader.onloadend = () => {
            const base64data = (reader.result as string).split(',')[1];
            doc.addFileToVFS('PlaywriteRegular.ttf', base64data);
            doc.addFont('PlaywriteRegular.ttf', 'PlaywriteRegular', 'normal');
            doc.addFont('PlaywriteRegular.ttf', 'PlaywriteRegular', 'bold');
            resolve('PlaywriteRegular');
          };
          reader.readAsDataURL(blob);
        });
      }
    } catch (e) {
      console.warn('Could not load PlaywrightRegular.ttf, using Helvetica.');
    }
    return 'Helvetica';
  }

  private drawBackground(doc: jsPDF, bgDataUrl: string, width: number, height: number) {
    // bgDataUrl is base64
    try {
      doc.addImage(bgDataUrl, 'JPEG', 0, 0, width, height); // Assume JPEG or PNG
    } catch (e) {
      console.error('Error adding background', e);
    }
  }

  private async generateCover(config: BookConfig, pageCount: number): Promise<jsPDF> {
    const spineWidth = pageCount * 0.0025 * 72;
    let widthPt = 6 * 72;
    let heightPt = 9 * 72;

    if (config.trimSize === '8.5x11') {
      widthPt = 8.5 * 72;
      heightPt = 11 * 72;
    }

    // Amazon KDP requires a 0.125" (9pt) bleed on all outside edges of the cover
    const bleedPt = 0.125 * 72;
    const widthWithBleed = widthPt + bleedPt;

    const totalWidth = widthWithBleed * 2 + spineWidth;
    const totalHeight = heightPt + bleedPt * 2;

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'pt',
      format: [totalWidth, totalHeight],
    });

    // Load Font
    const fontName = await this.loadPlaywriteFont(doc);
    doc.setFont(fontName, 'normal');

    // Load Images
    let portadaImg: HTMLImageElement | null = null;
    let fondoImg: HTMLImageElement | null = null;
    try {
      portadaImg = await this.loadImage('/portada.png');
    } catch (e) {
      console.warn('No portada.png');
    }
    try {
      fondoImg = await this.loadImage('/fondo.png');
    } catch (e) {
      console.warn('No fondo.png');
    }

    // Back Cover (Left) - Fondo
    if (fondoImg) {
      doc.addImage(fondoImg, 'JPG', 0, 0, widthWithBleed, totalHeight);
    } else {
      doc.setFillColor(200, 200, 200);
      doc.rect(0, 0, widthWithBleed, totalHeight, 'F');
      doc.setFontSize(16);
      doc.text(this.t('Back Cover', config.language), widthWithBleed / 2, totalHeight / 2, {
        align: 'center',
      });
    }

    // Front Cover (Right) - Portada
    const frontX = widthWithBleed + spineWidth;
    if (portadaImg) {
      doc.addImage(portadaImg, 'PNG', frontX, 0, widthWithBleed, totalHeight);
    } else {
      doc.setFillColor(255, 200, 100);
      doc.rect(frontX, 0, widthWithBleed, totalHeight, 'F');
    }

    // Textos portada
    doc.setTextColor(255, 255, 255);
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(1.5);
    doc.setFont(fontName, 'bold');
    doc.setFontSize(48);
    doc.text('SUDOKU COLLECTION', frontX + widthWithBleed / 2, totalHeight * 0.15, {
      align: 'center',
      renderingMode: 'fillThenStroke'
    });

    const coverCounts: string[] = [];
    if (config.easyCount > 0)
      coverCounts.push(`${config.easyCount} ${this.t('Easy', config.language)}`);
    if (config.mediumCount > 0)
      coverCounts.push(`${config.mediumCount} ${this.t('Medium', config.language)}`);
    if (config.hardCount > 0)
      coverCounts.push(`${config.hardCount} ${this.t('Hard', config.language)}`);

    // Reducimos el grosor del borde para el texto pequeño
    doc.setLineWidth(0.5);
    doc.setFontSize(20);
    doc.text(coverCounts.join(', '), frontX + widthWithBleed / 2, totalHeight * 0.9, {
      align: 'center',
      renderingMode: 'fillThenStroke'
    });
    
    // Restaurar fuente para el resto
    doc.setFont(fontName, 'normal');
    doc.setLineWidth(1);

    // Spine (Center)
    if (fondoImg) {
      // Usamos el fondo a lo largo del lomo
       doc.addImage(fondoImg, 'PNG', widthWithBleed, 0, spineWidth, totalHeight);
    } else {
       doc.setFillColor(200, 200, 200);
       doc.rect(widthWithBleed, 0, spineWidth, totalHeight, 'F');
    }

    // Spine Lines
    doc.setDrawColor(0);
    doc.setLineDashPattern([5, 5], 0);
    doc.line(widthWithBleed, 0, widthWithBleed, totalHeight);
    doc.line(frontX, 0, frontX, totalHeight);

    return doc;
  }

  private loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = url;
      img.onload = () => resolve(img);
      img.onerror = (e) => reject(e);
    });
  }

  private drawPageHeader(
    doc: jsPDF,
    pageNum: number,
    width: number,
    marginInside: number,
    marginOutside: number,
    fontName: string,
  ): void {
    const isOdd = pageNum % 2 !== 0;
    doc.setFont(fontName, 'normal');

    // 36pt is exactly 0.5". The bleed height extends the PDF top edge upwards by 9pt (0.125").
    // Real distance to cut edge for text drawn at 36pt is ~45pt (0.625"), well above the 0.375" minimum.
    doc.setFontSize(10);
    if (isOdd) {
      doc.text(`${pageNum}`, width - marginOutside, 36, { align: 'right' });
    } else {
      doc.text(`${pageNum}`, marginOutside, 36, { align: 'left' });
    }
  }

  private drawPuzzlesOnPage(
    doc: jsPDF,
    data: PuzzleData[],
    pageWidth: number,
    pageHeight: number,
    marginIn: number,
    marginOut: number,
    marginTop: number,
    marginBottom: number,
    countPerPage: number,
    isSolutionSection: boolean,
    fontName: string,
    lang: 'en' | 'es',
  ): void {
    // Determine Grid Layout (rows x cols)
    let rows = 1;
    let cols = 1;
    if (countPerPage === 2) {
      rows = 2;
      cols = 1;
    } else if (countPerPage === 4) {
      rows = 2;
      cols = 2;
    } else if (countPerPage === 6) {
      rows = 3;
      cols = 2;
    }

    const contentWidth = pageWidth - marginIn - marginOut;
    const contentHeight = pageHeight - marginTop - marginBottom;

    const cellW = contentWidth / cols;
    const cellH = contentHeight / rows;

    const padding = 20;

    const availW = cellW - padding * 2;
    const availH = cellH - padding * 3;
    const size = Math.min(availW, availH);

    data.forEach((item, idx) => {
      const r = Math.floor(idx / cols);
      const c = idx % cols;

      const cellCenterX = marginOut + c * cellW + cellW / 2;
      const cellCenterY = marginTop + r * cellH + cellH / 2;

      const gridX = cellCenterX - size / 2;
      const gridY = cellCenterY - size / 2 + 10;

      // Draw Title
      doc.setFont(fontName, 'normal');
      doc.setFontSize(12);
      const typeLabel = isSolutionSection ? this.t('Solution', lang) : this.t('Sudoku', lang);
      doc.text(`${typeLabel} ${item.id}`, cellCenterX, gridY - 10, { align: 'center' });

      // Draw Grid
      const gridToDraw = isSolutionSection ? item.solution : item.puzzle;
      this.drawSudokuGrid(doc, gridToDraw, item.puzzle, gridX, gridY, size, fontName);
    });
  }

  private drawSudokuGrid(
    doc: jsPDF,
    grid: number[][],
    originalPuzzle: number[][],
    x: number,
    y: number,
    size: number,
    fontName: string,
  ): void {
    const cellSize = size / 9;

    doc.setDrawColor(0);
    doc.setLineWidth(1);
    // We use Helvetica for numbers as requested

    // Draw cells
    doc.setFontSize(cellSize * 0.6);

    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const val = grid[r][c];
        if (val !== 0) {
          const xPos = x + c * cellSize + cellSize / 2;
          const yPos = y + r * cellSize + cellSize / 2 + cellSize * 0.25; // Adjusted baseline for Helvetica

          const isClue = originalPuzzle[r][c] !== 0;

          if (isClue) {
            doc.setFont(fontName, 'bold');
          } else {
            doc.setFont(fontName, 'normal');
          }

          doc.text(`${val}`, xPos, yPos, { align: 'center' });
        }
      }
    }

    // Draw lines
    for (let i = 0; i <= 9; i++) {
      const lineWidth = i % 3 === 0 ? 2 : 0.5;
      doc.setLineWidth(lineWidth);

      doc.line(x + i * cellSize, y, x + i * cellSize, y + size);
      doc.line(x, y + i * cellSize, x + size, y + i * cellSize);
    }
  }
}
