import { Component, signal } from '@angular/core';
import { BookConfigComponent } from './book-config/book-config.component';

@Component({
  selector: 'app-root',
  imports: [BookConfigComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('sudoku-book-app');
}
