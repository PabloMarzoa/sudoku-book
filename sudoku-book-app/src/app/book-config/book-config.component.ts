import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { SudokuGenService } from '../services/sudoku-gen.service';
import { PdfGeneratorService, BookConfig, PuzzleData } from '../services/pdf-generator.service';

@Component({
  selector: 'app-book-config',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="config-container">
      <h2>Book Configuration</h2>
      
      <div class="row">
        <div class="col">
          <div class="form-group">
            <label>Language / Idioma</label>
            <select [(ngModel)]="config.language">
              <option value="en">English</option>
              <option value="es">Español</option>
            </select>
          </div>
        </div>
        <div class="col">
          <div class="form-group">
            <label>Trim Size</label>
            <select [(ngModel)]="config.trimSize">
              <option value="6x9">6" x 9"</option>
              <option value="8.5x11">8.5" x 11"</option>
            </select>
          </div>
        </div>
      </div>
      
      <div class="row">
         <div class="col">
           <div class="form-group">
            <label>Puzzles Per Page</label>
            <select [(ngModel)]="config.puzzlesPerPage">
              <option [ngValue]="1">1</option>
              <option [ngValue]="2">2</option>
              <option [ngValue]="4">4</option>
              <option [ngValue]="6">6</option>
            </select>
          </div>
        </div>
         <div class="col"></div>
      </div>

      <div class="counts-group">
        <h3>Puzzle Counts</h3>
        <div class="row">
          <div class="col"><label>Easy (30)</label><input type="number" [(ngModel)]="config.easyCount"></div>
          <div class="col"><label>Medium (40)</label><input type="number" [(ngModel)]="config.mediumCount"></div>
          <div class="col"><label>Hard (50)</label><input type="number" [(ngModel)]="config.hardCount"></div>
        </div>
      </div>

      <div class="form-group">
         <label>Info Page Content (Markdown/Text)</label>
         <div class="row">
            <input type="file" (change)="onInfoSelected($event)" accept=".md,.txt">
            <textarea [(ngModel)]="config.infoContent" rows="3" placeholder="Or type text here..."></textarea>
         </div>
      </div>

      <div class="actions">
        <button [disabled]="isGenerating" (click)="generate(false)" class="btn primary">
          {{ isGenerating ? 'Generating...' : 'Download Content' }}
        </button>
        <button [disabled]="isGenerating" (click)="generate(true)" class="btn secondary">
          Download Cover
        </button>
        <button [disabled]="isGenerating" (click)="preview()" class="btn info">
          Preview
        </button>
      </div>
      
      <p *ngIf="statusMessage" class="status">{{ statusMessage }}</p>

      <div *ngIf="previewUrl" class="preview-box">
        <h3>Preview</h3>
        <iframe [src]="previewUrl" width="100%" height="500px"></iframe>
      </div>
    </div>
  `,
  styles: [`
    .config-container {
      max-width: 800px;
      margin: 2rem auto;
      padding: 2rem;
      background: #f9f9f9;
      border-radius: 8px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.1);
    }
    .row { display: flex; gap: 1rem; }
    .col { flex: 1; }
    .form-group { margin-bottom: 1.5rem; }
    .counts-group {
      background: #fff;
      padding: 1rem;
      border-radius: 4px;
      border: 1px solid #eee;
      margin-bottom: 1.5rem;
    }
    label { display: block; margin-bottom: 0.5rem; font-weight: bold; }
    select, input[type="number"], textarea {
      width: 100%; padding: 0.5rem; font-size: 1rem; border: 1px solid #ccc; border-radius: 4px;
    }
    .actions { display: flex; gap: 1rem; margin-top: 2rem; }
    .btn {
      padding: 0.75rem 1.5rem; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; flex: 1;
    }
    .btn:disabled { opacity: 0.7; cursor: not-allowed; }
    .primary { background: #007bff; color: white; }
    .secondary { background: #6c757d; color: white; }
    .info { background: #17a2b8; color: white; }
    .status { margin-top: 1rem; color: #28a745; text-align: center; }
    .preview-box { margin-top: 2rem; border-top: 1px solid #ccc; padding-top: 1rem; }
  `]
})
export class BookConfigComponent implements OnInit {
  config: BookConfig = {
    trimSize: '6x9',
    easyCount: 10,
    mediumCount: 10,
    hardCount: 10,
    puzzlesPerPage: 2,
    infoContent: '',
    language: 'es'
  };
  
  isGenerating = false;
  statusMessage = '';
  previewUrl: SafeResourceUrl | null = null;

  constructor(
    private sudokuService: SudokuGenService,
    private pdfService: PdfGeneratorService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit() {
    // Try to load default info.html from public folder
    fetch('/info.html')
      .then(response => {
        if (response.ok) return response.text();
        return '';
      })
      .then(text => {
        if (text) this.config.infoContent = text;
      })
      .catch(e => console.log('No default info.html found'));
  }

  onInfoSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.config.infoContent = e.target.result;
      };
      reader.readAsText(file);
    }
  }

  async generate(isCover: boolean) {
    this.isGenerating = true;
    this.statusMessage = 'Starting generator...';

    // Must yield to let UI update
    await new Promise(r => setTimeout(r, 50));
    
    try {
      const puzzles = await this.generateAllPuzzles();
      
      this.statusMessage = isCover ? 'Creating Cover PDF...' : 'Creating Content PDF...';
      await new Promise(r => setTimeout(r, 50));

      await this.pdfService.generateBook(this.config, puzzles, isCover);
      this.isGenerating = false;
      this.statusMessage = 'Download Started!';
      
    } catch (e) {
      console.error(e);
      this.isGenerating = false;
      this.statusMessage = 'Error generating book.';
    }
  }

  async preview() {
    this.isGenerating = true;
    this.statusMessage = 'Starting preview generation...';
    
    // Must yield to let UI update
    await new Promise(r => setTimeout(r, 50));

    try {
      const puzzles = await this.generateAllPuzzles();
      
      this.statusMessage = 'Rendering PDF...';
      await new Promise(r => setTimeout(r, 50));
      
      const url = await this.pdfService.getPreviewUrl(this.config, puzzles, false);
      this.previewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
      this.isGenerating = false;
      this.statusMessage = 'Preview Ready!';

    } catch (e) {
      console.error(e);
      this.isGenerating = false;
      this.statusMessage = 'Error generating preview.';
    }
  }

  private async generateAllPuzzles(): Promise<PuzzleData[]> {
    const allPuzzles: PuzzleData[] = [];
    let currentId = 1;

    // Helper to generate a batch
    const generateBatch = async (count: number, difficultyName: string, holes: number) => {
      for (let i = 0; i < count; i++) {
        // Yield every few puzzles to keep UI responsive
        if (i % 5 === 0) {
          this.statusMessage = `Generating ${difficultyName} puzzles (${i + 1}/${count})...`;
          await new Promise(r => setTimeout(r, 0)); 
        }

        const solution = this.sudokuService.generate();
        const puzzle = this.sudokuService.removeDigits(solution, holes);
        allPuzzles.push({
          puzzle,
          solution,
          difficulty: difficultyName,
          id: currentId++
        });
      }
    };

    if (this.config.easyCount > 0) await generateBatch(this.config.easyCount, 'Easy', 30);
    if (this.config.mediumCount > 0) await generateBatch(this.config.mediumCount, 'Medium', 40);
    if (this.config.hardCount > 0) await generateBatch(this.config.hardCount, 'Hard', 50);

    return allPuzzles;
  }
}
